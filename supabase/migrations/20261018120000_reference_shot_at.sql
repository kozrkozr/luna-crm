-- US-068 — a reference photo marked «Знято» on set.
--
-- Owner, 2026-10-18 (`Materials-Refs.dc.html`): on the «Матеріали» tab each
-- image reference has a «Знято» button; a marked photo moves to a «Знято»
-- section at the foot of the tab, in the order it was marked (AC-4).
--
-- ---------------------------------------------------------------- column
--
-- A timestamp rather than a boolean: AC-4 orders the «Знято» section by when
-- each photo was marked, and a boolean would need a second column to do that.
-- Null is «до зйомки» — every existing row, and every new one.
alter table public.shoot_references
  add column shot_at timestamptz;

-- ---------------------------------------------------------------- integrity
--
-- Only an image is ever marked (AC-7: links cannot be). The button is one
-- writer; the database refuses the state outright rather than leaving every
-- reader to decide what a marked link would mean.
alter table public.shoot_references
  add constraint shoot_references_shot_only_images check (
    shot_at is null or kind = 'image'
  );

-- ---------------------------------------------------------------- no policy
--
-- The mark is a plain UPDATE by the creator. `grant update` (20260825140000),
-- the owner policy (20260830140000) and the view-mode restriction
-- `shoot_references_update_needs_access` (20261010120000) already cover it —
-- and the last is AC-11's paywall in view mode, enforced by the database.
--
-- ---------------------------------------------------------------- no gateway
--
-- Creator only. The link gateway selects its columns by name and does not name
-- this one, so crew and client never receive it (US-068 Context, AC-11).
