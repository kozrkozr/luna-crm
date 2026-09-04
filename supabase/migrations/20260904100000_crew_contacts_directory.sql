-- «Мої контакти» becomes a table.
--
-- **This is `ADR-003`'s deferred crew directory**, and it arrives because
-- `Public Profile.dc.html` needs something to profile. That ADR ruled out a
-- searchable, two-sided marketplace with visible availability; this is not that.
-- It is one photographer's private address book, populated by their own work,
-- which is the fallback the owner named in the same conversation.
--
-- **What existed instead.** `listPastCrew` deduplicated `crew_members` in
-- memory, keyed on name + phone-or-email, and `PastCrewMember.key` was
-- synthetic — its own comment said "these are not rows of their own". That is
-- why a contact could not be opened, edited, or annotated: there was nothing to
-- open. Owner, 2026-09-03.
--
-- `US-005` and `US-029` both need amending: a crew member added to a shoot now
-- also lands in a directory neither story describes.
create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  -- Whose address book. `crew_members` has no such column — it reaches its
  -- owner through `shoot_id` — so the backfill below joins `shoots` to find it.
  creator_id  uuid not null references public.users (id) on delete cascade,
  name        text not null,
  role        text not null,
  phone       text,
  email       text,
  instagram   text,
  telegram    text,
  -- **A note about the PERSON, not about a job.**
  --
  -- `crew_members.note` is per-shoot — "brings their own kit on this one" — and
  -- somebody on three shoots has three of them. The artboard's «Нотатки» card
  -- is about who they are, so it needs a column of its own. Both are private to
  -- the creator, and neither is in any link payload (CLAUDE.md rule 2,
  -- ADR-013).
  note        text,
  created_at  timestamptz not null default now(),
  -- Soft, like everything else that is not an account (ADR-014). It also makes
  -- the artboard's promise true by construction: deleting a contact leaves the
  -- `crew_members` rows on their shoots untouched, because they are different
  -- rows.
  deleted_at  timestamptz
);

-- One contact per person per address book, on the same identity `crewIdentity`
-- computes in the app: the name, casefolded and trimmed, plus whichever contact
-- method exists.
--
-- **Partial**, so a deleted contact does not block re-adding the same person
-- later. `coalesce(phone, email, '')` mirrors `crewIdentity`'s `?? ... ?? ''`
-- exactly — including that two people with the same name and no contact details
-- collapse into one, which is a pre-existing property of that key rather than
-- something this index introduces.
create unique index contacts_identity_idx
  on public.contacts (creator_id, lower(btrim(name)), coalesce(phone, email, ''))
  where deleted_at is null;

create index contacts_creator_idx on public.contacts (creator_id) where deleted_at is null;

alter table public.contacts enable row level security;

-- Every policy is `creator_id = auth.uid()`. A contact is not shared with
-- anyone: not with crew, not through a link, not with the person themselves.
create policy contacts_select_own on public.contacts
  for select using (creator_id = auth.uid());

create policy contacts_insert_own on public.contacts
  for insert with check (creator_id = auth.uid());

create policy contacts_update_own on public.contacts
  for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- No delete policy: `deleted_at` is the delete, and it goes through the update
-- policy above.

-- ── The backfill ────────────────────────────────────────────────────────────
--
-- Without this, every photographer's «Мої контакти» is empty the moment the app
-- reads the table instead of deriving the list — the cold start `ADR-003` was
-- decided to avoid, reintroduced by the fix for it.
--
-- `distinct on` with `created_at desc` keeps the newest sighting of each person,
-- which is what `listPastCrew` did in JavaScript: "Rows arrive newest first, so
-- the first sighting is the one to keep."
--
-- **Two filters that CLAUDE.md rule 3 would ask for are deliberately absent**,
-- and this is the part to read before changing it. Neither `cm.removed_at` nor
-- `s.deleted_at` is checked, because `listPastCrew` does not check them either:
-- the list people see today includes someone removed from one shoot, and
-- someone whose shoot was later cancelled. Both are right for an address book —
-- being taken off a job does not make you a stranger — and filtering here would
-- silently shrink every existing contact list on migration day.
--
-- Rule 3 exists so a removed person cannot be resurrected onto a live shoot.
-- Nothing here reaches a shoot: `crew_members` is written by the add-crew form,
-- and a contact only ever seeds that form's fields.
insert into public.contacts (creator_id, name, role, phone, email, instagram, telegram, note, created_at)
select distinct on (s.creator_id, lower(btrim(cm.name)), coalesce(cm.phone, cm.email, ''))
  s.creator_id,
  cm.name,
  cm.role,
  cm.phone,
  cm.email,
  cm.instagram,
  cm.telegram,
  -- **The per-shoot note is NOT copied.** It describes a job, and copying the
  -- newest one would present it as a fact about the person. `contacts.note`
  -- starts empty and is the creator's to write.
  null,
  cm.created_at
from public.crew_members cm
join public.shoots s on s.id = cm.shoot_id
order by
  s.creator_id,
  lower(btrim(cm.name)),
  coalesce(cm.phone, cm.email, ''),
  cm.created_at desc;
