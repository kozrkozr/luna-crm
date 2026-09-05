-- A shoot's status becomes derived, and the column that stored it is dropped.
--
-- Owner, 2026-09-04: "shoot is «Завершена» if current day > shoot day, if no —
-- «Запланована»". The rule that ships is a shade sharper — `US-030` made
-- `end_time` required, so the boundary is the shoot's END rather than the end
-- of its day, and a shoot that ran 09:00–12:00 does not stay «Запланована»
-- until midnight. Rows predating `US-030` have no `end_time` and fall back to
-- the owner's plain day rule. See src/features/shoots/status.ts.
--
-- **This retires `US-020` AC-1.** That criterion requires the creator to change
-- a status and change it back; after this there is no control and no column
-- behind one. The story needs amending in the discovery repo — `docs/product/`
-- is read-only in this repo (CLAUDE.md), so the debt is recorded here, in
-- status.ts, and in docs/redesign-log.md. AC-2 ("only the two defined statuses
-- are ever selectable") is unaffected and in fact becomes unbreakable.
--
-- **Nothing is lost in the data.** The control was removed on 2026-09-03 with
-- the New Shoot / Edit Shoot merge, and `setShootStatus` lost its last caller
-- then, so no row has been able to move off the `'new'` default since. The
-- column holds one value for every shoot in existence; there is no history to
-- migrate and no state to preserve.
--
-- **What this gives up**, stated where it is easy to find: a cancelled shoot,
-- or one that never happened, reads «Завершена» once its date passes. The model
-- cannot tell "done" from "gone". `US-019`'s delete is what a mistake uses.
--
-- The link gateway never selected `status` and no link payload has ever carried
-- one, so no crew member or client sees a status at all and `ADR-013` is not
-- involved.

alter table public.shoots drop column status;

-- The enum existed only for that column. Dropped in the same step so a later
-- reader does not find a type with no user and wonder what dropped its table.
drop type shoot_status;
