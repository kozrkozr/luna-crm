-- Luna CRM — initial schema
--
-- Source of truth: docs/product/data-model.md (5 entities), ADR-013 (link
-- gateway), ADR-014 (validity derived from soft deletes), ADR-015 (email +
-- password auth, phone optional).
--
-- Two deliberate design choices, both load-bearing:
--
-- 1. NO anonymous policy exists on any table. Every anonymous read (crew link,
--    client link) goes through the link-gateway Edge Function under the service
--    role, which is the only place the crew/client field split can be enforced
--    (ADR-013). Granting `anon` any direct table access would make US-026's
--    "no notes field at all" impossible to guarantee.
--
-- 2. Soft-delete filters live IN THE POLICIES, not in queries. risks.md names a
--    forgotten filter as the most likely bug in v1 (CLAUDE.md rule 3); putting
--    `deleted_at is null` / `removed_at is null` in the USING clause makes the
--    class of bug unreachable from the app surface. The gateway bypasses RLS by
--    design, so it must filter explicitly — that is the one place still exposed.

create type shoot_status   as enum ('new', 'finished');
create type crew_response  as enum ('pending', 'confirmed', 'declined');
create type link_audience  as enum ('crew', 'client');
create type reference_kind as enum ('link', 'image');
create type ui_language    as enum ('uk', 'en');

-- User — a registered account. Mirrors auth.users, which owns the credential.
create table public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null,
  email         text not null,                    -- the login credential (ADR-015)
  phone         text,                             -- optional; a match key for crew_members.user_id
  role          text not null,                    -- professional role (US-001)
  social_handle text,                             -- optional (US-001, US-016)
  language      ui_language not null default 'uk', -- US-014; link views are uk-only
  created_at    timestamptz not null default now()
);

-- Shoot — the core record every other entity attaches to.
create table public.shoots (
  id                   uuid primary key default gen_random_uuid(),
  creator_id           uuid not null references public.users (id) on delete cascade,
  client_name          text not null,
  client_contact       text not null,             -- the client is fields on the shoot, never an account
  date                 date not null,             -- required at creation and edit (US-002 AC-2, US-018 AC-3)
  status               shoot_status not null default 'new',
  location_address     text,                      -- set on edit, never at creation (US-018)
  location_note        text,
  location_attachment  text,                      -- one image OR one video (US-018 AC-2)
  raw_files_url        text,                      -- nullable pasted link; null renders the placeholder (US-024)
  finished_photos_url  text,                      -- same, US-025
  deleted_at           timestamptz,               -- soft delete; revokes every link for this shoot (ADR-014)
  created_at           timestamptz not null default now()
);

create index shoots_creator_idx on public.shoots (creator_id) where deleted_at is null;
create index shoots_date_idx    on public.shoots (date)       where deleted_at is null;

-- Reference — a pasted link or a gallery image (US-003).
-- Named `shoot_references` because REFERENCES is a reserved SQL keyword; the
-- entity is still `Reference` per the glossary, and the name stays greppable.
create table public.shoot_references (
  id          uuid primary key default gen_random_uuid(),
  shoot_id    uuid not null references public.shoots (id) on delete cascade,
  kind        reference_kind not null,
  url_or_path text not null,                      -- external URL, or a Storage path
  created_at  timestamptz not null default now()
);

create index shoot_references_shoot_idx on public.shoot_references (shoot_id);

-- CrewMember — a person on ONE shoot. Per-shoot, not a global address book
-- (ADR-003): the same person on three shoots is three rows.
create table public.crew_members (
  id         uuid primary key default gen_random_uuid(),
  shoot_id   uuid not null references public.shoots (id) on delete cascade,
  name       text not null,
  role       text not null,
  phone      text,
  email      text,
  instagram  text,
  note       text,                                -- NEVER sent to a client (ADR-013, US-026)
  note_image text,
  response   crew_response not null default 'pending',
  user_id    uuid references public.users (id) on delete set null,  -- nullable; a match result
  removed_at timestamptz,                         -- soft delete; kills this person's link (US-022)
  created_at timestamptz not null default now(),

  -- US-005 AC-2: at least one of phone or email is required. This is what makes
  -- user_id matching possible at all.
  constraint crew_members_contact_required
    check (phone is not null or email is not null)
);

create index crew_members_shoot_idx on public.crew_members (shoot_id) where removed_at is null;
create index crew_members_user_idx  on public.crew_members (user_id)  where removed_at is null;

-- AccessLink — one per crew member per shoot, plus one client link per shoot.
-- No expires_at column, deliberately: validity is derived (ADR-014).
create table public.access_links (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique,            -- unguessable; the whole credential
  shoot_id       uuid not null references public.shoots (id) on delete cascade,
  audience       link_audience not null,
  crew_member_id uuid references public.crew_members (id) on delete cascade,
  created_at     timestamptz not null default now(),

  -- crew links point at a person; client links do not.
  constraint access_links_audience_shape check (
    (audience = 'crew'   and crew_member_id is not null) or
    (audience = 'client' and crew_member_id is null)
  )
);

create index access_links_shoot_idx on public.access_links (shoot_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.users            enable row level security;
alter table public.shoots           enable row level security;
alter table public.shoot_references enable row level security;
alter table public.crew_members     enable row level security;
alter table public.access_links     enable row level security;

-- User: own row only.
create policy users_select_own on public.users
  for select using (auth.uid() = id);
create policy users_insert_own on public.users
  for insert with check (auth.uid() = id);
create policy users_update_own on public.users
  for update using (auth.uid() = id);

-- Shoot: the creator, and only while alive. RLS carries the soft-delete filter.
create policy shoots_select_own on public.shoots
  for select using (auth.uid() = creator_id and deleted_at is null);
create policy shoots_insert_own on public.shoots
  for insert with check (auth.uid() = creator_id);
create policy shoots_update_own on public.shoots
  for update using (auth.uid() = creator_id and deleted_at is null);

-- Child tables: reachable only through a shoot the caller owns and that is alive.
create policy shoot_references_via_shoot on public.shoot_references
  for all using (
    exists (
      select 1 from public.shoots s
      where s.id = shoot_id and s.creator_id = auth.uid() and s.deleted_at is null
    )
  );

create policy crew_members_via_shoot on public.crew_members
  for all using (
    removed_at is null
    and exists (
      select 1 from public.shoots s
      where s.id = shoot_id and s.creator_id = auth.uid() and s.deleted_at is null
    )
  );

create policy access_links_via_shoot on public.access_links
  for all using (
    exists (
      select 1 from public.shoots s
      where s.id = shoot_id and s.creator_id = auth.uid() and s.deleted_at is null
    )
  );

-- Deliberately absent: any policy granting `anon` access to any table.
-- Anonymous reads are the link gateway's job (ADR-013).
