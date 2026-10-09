-- US-052 — view mode: without access, the database refuses the writes (AC-3).
--
-- `ADR-023` decision 7: access is decided on the server and **enforced by the
-- database**, not by hiding buttons — the same principle as `ADR-013`. The app
-- opens the paywall before any of these writes (AC-2); this is what holds when
-- the app is bypassed.
--
-- ── What is refused, and what is not ────────────────────────────────────────
--
-- AC-2's list, and nothing else: creating, editing and deleting a shoot, a crew
-- member, a contact, a client, a reference or a file. Each has its table, the
-- `shoot-media` bucket, or a soft-delete function below.
--
-- Deliberately NOT refused:
--   * `users`, the `avatars` bucket — one's own profile, language, currency
--     (AC-4);
--   * `delete_own_account` (AC-4 — Apple requires it regardless of payment);
--   * `access_links` — not in AC-2's list. A link is minted the first time it
--     is copied (`src/features/crew/links.ts`), so a crew member added during
--     the trial may have none yet; AC-4 lets the creator copy and share it all
--     the same;
--   * `notifications.read_at` — reading is not creating or editing;
--   * the link gateway's writes — a crew member's reply (AC-5) runs under the
--     service role, which bypasses RLS, as do the `security definer` triggers
--     (crew matching, notifications). Nothing here reaches them.
--
-- ── How ─────────────────────────────────────────────────────────────────────
--
-- **Restrictive** policies, added beside the existing permissive ones: a
-- restrictive policy is AND-ed with the rest, so every rule about whose row it
-- is stays exactly as it was, and this adds one condition on top. An UPDATE
-- policy's USING would make a refused update silently match zero rows; WITH
-- CHECK raises instead (42501), so the app can tell a refusal from a save.
--
-- The four soft-delete functions are `security definer` and bypass RLS, so
-- each checks for itself and raises the same 42501.
--
-- Reads are untouched (AC-1), and nothing is deleted or altered when access
-- ends (AC-6) — access is a time comparison, not a job.

-- `S-7`'s finding F-2: `expires_at` alone decides. Any entitlement counts:
-- `base` today, and a higher tier later still includes the app (`ADR-023`
-- decision 9). `US-055` adds the beta testers' grant here.
create function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.account_access a
     where a.user_id = auth.uid()
       and (a.expires_at is null or a.expires_at > now())
  );
$$;

revoke all on function public.has_access() from public;
grant execute on function public.has_access() to authenticated;

-- ---------------------------------------------------------------- the tables

create policy shoots_write_needs_access on public.shoots
  as restrictive for insert to authenticated
  with check (public.has_access());
create policy shoots_update_needs_access on public.shoots
  as restrictive for update to authenticated
  using (true) with check (public.has_access());

create policy shoot_references_write_needs_access on public.shoot_references
  as restrictive for insert to authenticated
  with check (public.has_access());
create policy shoot_references_update_needs_access on public.shoot_references
  as restrictive for update to authenticated
  using (true) with check (public.has_access());

create policy crew_members_write_needs_access on public.crew_members
  as restrictive for insert to authenticated
  with check (public.has_access());
create policy crew_members_update_needs_access on public.crew_members
  as restrictive for update to authenticated
  using (true) with check (public.has_access());

create policy clients_write_needs_access on public.clients
  as restrictive for insert to authenticated
  with check (public.has_access());
create policy clients_update_needs_access on public.clients
  as restrictive for update to authenticated
  using (true) with check (public.has_access());

create policy contacts_write_needs_access on public.contacts
  as restrictive for insert to authenticated
  with check (public.has_access());
create policy contacts_update_needs_access on public.contacts
  as restrictive for update to authenticated
  using (true) with check (public.has_access());

-- ---------------------------------------------------------------- the files
--
-- `shoot-media` holds every file a shoot has (gallery, references, a crew
-- note's image, the location's image or video). `avatars` is the profile, and
-- stays open (AC-4).
create policy shoot_media_write_needs_access on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'shoot-media' or public.has_access());

-- ---------------------------------------------------------------- the deletes
--
-- The same bodies as 20260826170000, 20260826200000, 20260830140000 and
-- 20260829100000, each with the access check first.

create or replace function public.soft_delete_shoot(shoot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_access() then
    raise exception 'no_access' using errcode = '42501';
  end if;
  update public.shoots
     set deleted_at = now()
   where id = shoot_id
     and creator_id = auth.uid()
     and deleted_at is null;
  return found;
end;
$$;

create or replace function public.soft_remove_crew_member(crew_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_access() then
    raise exception 'no_access' using errcode = '42501';
  end if;
  update public.crew_members cm
     set removed_at = now()
   where cm.id = crew_member_id
     and cm.removed_at is null
     and exists (
       select 1
         from public.shoots s
        where s.id = cm.shoot_id
          and s.creator_id = auth.uid()
          and s.deleted_at is null
     );
  return found;
end;
$$;

create or replace function public.soft_remove_reference(reference_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_access() then
    raise exception 'no_access' using errcode = '42501';
  end if;
  update public.shoot_references r
     set removed_at = now()
   where r.id = reference_id
     and r.removed_at is null
     and exists (
       select 1
         from public.shoots s
        where s.id = r.shoot_id
          and s.creator_id = auth.uid()
          and s.deleted_at is null
     );
  return found;
end;
$$;

create or replace function public.soft_delete_client(client_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_access() then
    raise exception 'no_access' using errcode = '42501';
  end if;
  update public.clients
     set deleted_at = now()
   where id = client_id
     and creator_id = auth.uid()
     and deleted_at is null;
  return found;
end;
$$;
