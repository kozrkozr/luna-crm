-- ADR-018 — the client becomes a persisted entity with cross-shoot identity.
--
-- Until now a client was two text columns on the shoot, so booking the same
-- person three times produced three unrelated strings. `US-028` (the profile,
-- with notes that persist between shoots) and `US-029` (finding an existing
-- client when creating a shoot) both need identity that outlives one shoot.
--
-- This does NOT reopen ADR-003. That decision rejected a searchable crew
-- directory because of cold start — a two-sided marketplace, empty until
-- strangers join. A client record is single-sided, private to one creator, and
-- self-populating: useful on the second booking and never meaningfully empty.
-- Crew stay per-shoot rows, untouched.

-- ---------------------------------------------------------------- the table
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.users (id) on delete cascade,
  name        text not null,
  phone       text,
  instagram   text,
  -- US-028 AC-3. Crew-visible in the design's labelling, owner-only in code
  -- until a story says otherwise — see ADR-018, Visibility, and
  -- 02-product/open-questions.md item 15.
  notes       text,
  deleted_at  timestamptz,                          -- soft delete (ADR-014)
  created_at  timestamptz not null default now()
);

create index clients_creator_idx on public.clients (creator_id) where deleted_at is null;

alter table public.clients enable row level security;

-- Scoped to the creator exactly as `shoots` is, and carrying the soft-delete
-- filter in the policy rather than in every query (ADR-014, CLAUDE.md rule 3):
-- US-029 AC-7's "removed clients never match" then holds without a filter
-- anyone could forget.
create policy clients_select_own on public.clients
  for select using (auth.uid() = creator_id and deleted_at is null);

create policy clients_insert_own on public.clients
  for insert with check (auth.uid() = creator_id);

-- The WITH CHECK refuses handing a client to another account; it does NOT make
-- a soft delete possible. `soft_delete_shoot` (20260826170000) already recorded
-- why, and its note even predicted this would recur: Postgres applies the
-- **SELECT** policy to the new row, so setting `deleted_at` makes the row fail
-- its own read policy, and a WITH CHECK on the UPDATE policy does nothing about
-- it. Verified again here before this was written — including with
-- `with check (true)`, which fails identically.
create policy clients_update_own on public.clients
  for update
  using (auth.uid() = creator_id and deleted_at is null)
  with check (auth.uid() = creator_id);

grant select, insert, update on public.clients to authenticated;

-- ---------------------------------------------------------------- the link
alter table public.shoots
  add column client_id uuid references public.clients (id);

-- ---------------------------------------------------------------- backfill
--
-- One client per existing shoot, and deliberately **no retroactive
-- deduplication** (ADR-018, Decision). Applying US-029's matching rule
-- backwards would silently merge records on a rule nobody applied when they
-- were entered; one row each preserves exactly what is there, and any real
-- duplicates surface in the UI where the photographer can see them.
--
-- The temporary column is how each new client finds its way back to the shoot
-- it came from: a plain `insert … select` cannot correlate its returned ids to
-- the source rows.
alter table public.clients add column source_shoot_id uuid;

insert into public.clients (creator_id, name, phone, source_shoot_id)
select creator_id, client_name, nullif(btrim(client_contact), ''), id
from public.shoots;

update public.shoots s
set client_id = c.id
from public.clients c
where c.source_shoot_id = s.id;

alter table public.clients drop column source_shoot_id;

-- ---------------------------------------------------------------- cut over
--
-- `client_id` is NOT NULL for the same reason the columns it replaces were:
-- `client_name` and `client_contact` were both `not null`, so a shoot has
-- always had a client and that stays true.
alter table public.shoots alter column client_id set not null;

alter table public.shoots
  drop column client_name,
  drop column client_contact;

comment on column public.shoots.client_id is
  'ADR-018. Replaced client_name/client_contact; the client is a row now, not two strings.';

-- ---------------------------------------------------------------- a note
--
-- `my_crew_shoots()` (20260827100000) carries a comment explaining that it
-- returns a restricted column set rather than widening `shoots_select_own`,
-- because that would hand a crew member `client_name` and `client_contact`.
-- Those columns are gone, and the reasoning is now stronger rather than stale:
-- the client's details are in a different table, behind a policy scoped to the
-- creator, so a crew member cannot reach them even if that function changed.
-- The function itself needs no edit — it never selected them.

-- ---------------------------------------------------------------- soft delete
--
-- The third table to need this, and for the identical reason (see the policy
-- note above). The alternative — dropping `deleted_at is null` from the SELECT
-- policy and filtering in queries — is the bug class CLAUDE.md rule 3 exists to
-- prevent, and `risks.md` calls a forgotten soft-delete filter the most likely
-- bug in v1. So the policy stays and deletion goes through a definer function
-- that does its own authorisation.
--
-- No story asks to delete a client yet: `ADR-018`'s open question 1 notes the
-- mockups have no delete action on the profile screen. This exists so that
-- `deleted_at` is reachable at all — `US-029` AC-7 ("removed clients never
-- match") is otherwise a rule nothing can exercise.
create function public.soft_delete_client(client_id uuid)
returns boolean
language plpgsql
security definer
-- Pinned so nothing in the caller's search_path can shadow `clients` or
-- `auth.uid()` — the standard precaution for a definer function.
set search_path = public, pg_temp
as $$
begin
  update public.clients
     set deleted_at = now()
   where id = client_id
     and creator_id = auth.uid()
     and deleted_at is null;

  -- False when the client is not yours, does not exist, or was already
  -- removed. The caller cannot tell those apart, which is the same non-answer
  -- RLS gives for a row you do not own.
  return found;
end;
$$;

revoke all on function public.soft_delete_client(uuid) from public;
grant execute on function public.soft_delete_client(uuid) to authenticated;
