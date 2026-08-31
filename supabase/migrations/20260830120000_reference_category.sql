-- A Reference belongs to a named group — «Світло», «Пози», «Стиль».
--
-- The Figma shoot-detail frame draws the references section as three separate
-- groups, each with its own heading, its own count and its own «+» tile. The
-- table has only ever held `kind` ('link' | 'image'), which is the shape of the
-- thing, not what it is about — so the design could not be built over it.
--
-- **No story covers this**, and the three group names are the frame's own copy
-- rather than anything the backlog supplies. Recorded in docs/redesign-log.md
-- as a question for the owner; the column is the part that is hard to change
-- later, which is why it lands now and the naming can still move.

-- ---------------------------------------------------------------- column
--
-- `text`, not an enum. `reference_kind` is an enum because its two values are
-- structural — the app branches on them to decide between a signed URL and an
-- external link, and a third would be a code change anyway. A category branches
-- nothing: it groups. Adding «Локація» to an enum needs a migration and a
-- deploy; adding it to a text column needs neither, and the fixed list the
-- picker offers is a UI decision that belongs in the UI.
--
-- **Nullable, deliberately.** Every existing row predates the concept, and
-- assigning them a category — even a plausible one — would be writing data
-- nobody entered. They read back as NULL and render in an untitled leading
-- group. An invented «Без категорії» label would be new user-facing copy, which
-- CLAUDE.md rule 1 forbids.
alter table public.shoot_references
  add column category text;

-- ---------------------------------------------------------------- no index
--
-- Grouping happens in the client, over the rows of ONE shoot — the existing
-- `shoot_references_shoot_idx` already serves that read, and a shoot has a
-- handful of references, not thousands. An index on `category` would earn
-- nothing and cost a write.

-- ---------------------------------------------------------------- no policy
--
-- A column inherits its table's RLS. `shoot_references` is already restricted to
-- the owning photographer, and anonymous reads go through the link gateway with
-- the service role (ADR-013), so there is nothing here to grant.
--
-- The gateway's payload is NOT changed by this migration: it keeps sending
-- references ungrouped. The crew and client link views have their own mockups
-- and US-026's field rules, and changing what they receive is a separate story.
