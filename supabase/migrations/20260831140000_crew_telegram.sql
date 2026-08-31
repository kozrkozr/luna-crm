-- A Telegram handle on a crew member, beside `instagram`.
--
-- **No story defines it.** `US-005` collects a name, a role, one contact and an
-- optional Instagram handle; the owner asked for Telegram on the add-crew form
-- (2026-08-31), the same field `users` gained a day earlier
-- (20260831100000). `US-005` needs amending.
--
-- Nullable, like `instagram`: a crew member added with a phone alone is still
-- valid, and `crew_members_contact_required` is unchanged — a handle has never
-- counted as a contact (`US-005` AC-2 is explicit that an Instagram handle alone
-- is not enough, and this is the same kind of value).
alter table public.crew_members
  add column telegram text;

-- No policy or grant change: `crew_members_via_shoot` scopes every row to the
-- shoot's creator and this column inherits it.
--
-- **The link gateway is deliberately NOT updated by this migration.** Both of
-- its crew payloads are built from explicit column lists and neither names this
-- one, so today the handle reaches nobody but the creator — see the note in
-- src/features/crew/api.ts. `instagram` IS sent to both audiences, so sending
-- this too would be consistent; it is a payload decision rather than a column
-- one, and un-shipping a field from an anonymous audience is the expensive
-- direction.
