-- US-036 — upload raw files and finished photos to a shoot (`ADR-020`, `ADR-021`).
--
-- The bytes live in an S3-compatible store (B2 today), never here. A row is one
-- hosted file (`ShootFile`, `data-model.md`) and exists from the moment its
-- upload starts: it reserves its size against the account's quota, so two
-- uploads started together cannot both squeeze past it (AC-3).
--
-- Columns beyond `data-model.md` — technical, agreed by the owner 2026-10-23,
-- to be noted in discovery at the next re-freeze:
--   provider       which store holds the object; a move to R2 sends new uploads
--                  there while B2's run out their days (no object migration)
--   status         'uploading' until the store has every part, then 'complete'
--   upload_id      the store's multipart upload id while uploading
--   relative_path  the file's path inside a dropped folder, without the folder
--                  itself (`Card1/DCIM/IMG_0001.CR3`); null for a single file.
--                  `name` shows it as `Card1 · DCIM · IMG_0001.CR3` (owner,
--                  2026-10-23), and a folder tree later reads this column.
--
-- Writes go through the `files` Edge Function only (service role), which checks
-- the creator, the deletion date, access and the quota before signing a byte
-- (AC-3, AC-7, AC-8; `docs/spikes/S-6-large-upload-to-b2.md` F-4, F-5). The
-- creator reads their rows directly.

alter table public.shoots add column files_delete_at timestamptz;

comment on column public.shoots.files_delete_at is
  'US-036 AC-2 — set once, when the first file finishes uploading, to that moment + retention_days; never moved.';

create table public.shoot_files (
  id            uuid primary key default gen_random_uuid(),
  shoot_id      uuid not null references public.shoots (id) on delete cascade,
  kind          text not null check (kind in ('raw', 'finished')),
  name          text not null check (length(name) between 1 and 1024),
  relative_path text check (relative_path is null or length(relative_path) between 1 and 2048),
  object_key    text not null unique,
  size_bytes    bigint not null check (size_bytes >= 0),
  provider      text not null default 'b2' check (provider in ('b2', 'r2')),
  status        text not null default 'uploading' check (status in ('uploading', 'complete')),
  upload_id     text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  check ((status = 'uploading') = (upload_id is not null)),
  check ((status = 'complete') = (completed_at is not null))
);

create index shoot_files_shoot_id on public.shoot_files (shoot_id);

alter table public.shoot_files enable row level security;

-- The creator sees the files of their live shoots — uploading ones too, so an
-- upload interrupted by a closed tab shows and can be resumed or cancelled.
-- A soft-deleted shoot hides its files (`ADR-014`).
create policy shoot_files_creator_reads on public.shoot_files
  for select to authenticated using (
    exists (
      select 1 from public.shoots s
       where s.id = shoot_id and s.creator_id = auth.uid() and s.deleted_at is null
    )
  );

revoke all on public.shoot_files from anon, authenticated;
grant select on public.shoot_files to authenticated;
grant select, insert, update, delete on public.shoot_files to service_role;
grant update (files_delete_at) on public.shoots to service_role;

-- Who may host files. Base access until the PRO tier is decided (`ADR-023`
-- decision 7; owner, 2026-10-22: build and test on dev first, the PRO ADR
-- before prod). Called as the user, so it reads the same `auth.uid()` as
-- `has_access()` and cannot drift from it.
create function public.can_host_files()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.has_access();
$$;

revoke all on function public.can_host_files() from public, anon;
grant execute on function public.can_host_files() to authenticated;

-- Bytes an account holds against its quota: every file row of every live shoot
-- it created, uploading ones included (their space is reserved). A deleted
-- shoot's files leave the quota at once — they go with the shoot, and the
-- sweeper removes the bytes (owner, 2026-10-23; plan #12).
create function public.files_usage_bytes(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(f.size_bytes), 0)::bigint
    from public.shoot_files f
    join public.shoots s on s.id = f.shoot_id
   where s.creator_id = p_user and s.deleted_at is null;
$$;

revoke all on function public.files_usage_bytes(uuid) from public, anon, authenticated;
grant execute on function public.files_usage_bytes(uuid) to service_role;

-- The caller's own usage, for «Використано X з {квота} ГБ».
create function public.my_files_usage()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.files_usage_bytes(auth.uid());
$$;

revoke all on function public.my_files_usage() from public, anon;
grant execute on function public.my_files_usage() to authenticated;

-- AC-3, AC-7, AC-8 in one transaction: the shoot is the user's and live, its
-- deletion date has not passed, and the new file fits in the quota — then the
-- row is written, reserving the space. Concurrent starts by one account queue
-- on an advisory lock, so they are counted one after another.
--
-- Errors carry a stable reason in the message for the function to map:
--   files:not_found   not the user's shoot, or deleted
--   files:expired     the deletion date has passed (AC-7)
--   files:quota       the file would take the account past its quota (AC-3)
create function public.reserve_shoot_file(
  p_user uuid, p_shoot uuid, p_kind text, p_name text, p_relative_path text,
  p_size bigint, p_object_key text, p_provider text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delete_at timestamptz;
  v_quota bigint;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('shoot_files:' || p_user::text, 0));

  select s.files_delete_at into v_delete_at
    from public.shoots s
   where s.id = p_shoot and s.creator_id = p_user and s.deleted_at is null;
  if not found then
    raise exception 'files:not_found';
  end if;
  if v_delete_at is not null and v_delete_at <= now() then
    raise exception 'files:expired';
  end if;

  select quota_bytes into v_quota from public.file_hosting_settings;
  if public.files_usage_bytes(p_user) + p_size > v_quota then
    raise exception 'files:quota';
  end if;

  insert into public.shoot_files (shoot_id, kind, name, relative_path, object_key, size_bytes, provider, upload_id)
  values (p_shoot, p_kind, p_name, p_relative_path, p_object_key, p_size, p_provider, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.reserve_shoot_file(uuid, uuid, text, text, text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.reserve_shoot_file(uuid, uuid, text, text, text, bigint, text, text) to service_role;

-- AC-2: the upload is whole. The first complete file of a shoot fixes the
-- deletion date; later ones leave it alone.
create function public.complete_shoot_file(p_file uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_shoot uuid;
  v_delete_at timestamptz;
begin
  update public.shoot_files
     set status = 'complete', completed_at = now(), upload_id = null
   where id = p_file and status = 'uploading'
  returning shoot_id into v_shoot;
  if not found then
    raise exception 'files:not_found';
  end if;

  update public.shoots
     set files_delete_at = now() + make_interval(days => (select retention_days from public.file_hosting_settings))
   where id = v_shoot and files_delete_at is null;

  select files_delete_at into v_delete_at from public.shoots where id = v_shoot;
  return v_delete_at;
end;
$$;

revoke all on function public.complete_shoot_file(uuid) from public, anon, authenticated;
grant execute on function public.complete_shoot_file(uuid) to service_role;
