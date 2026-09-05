import type { Shoot, ShootStatus } from './api'

/**
 * `US-020` — a shoot's status, **derived from its date** (owner, 2026-09-04).
 *
 * ── This retires `US-020` AC-1, deliberately ────────────────────────────────
 *
 * That criterion reads "the creator changes its status to Finished … and can be
 * changed back to New the same way". There is no control any more and no column
 * behind one: a shoot is «Завершена» once it is over and «Запланована» before
 * that, and nothing can say otherwise. **The story needs amending in the
 * discovery repo** — `docs/product/` is read-only here (CLAUDE.md), so this
 * note and `docs/redesign-log.md` are where the debt is recorded.
 *
 * AC-2 survives untouched, and more strongly than before: "no way to reach any
 * other status value" is now true because there is no way to reach *any* value.
 *
 * **What this gives up.** A shoot that was cancelled, or that simply never
 * happened, reads «Завершена» the moment its date passes — the model cannot
 * tell "done" from "gone". A shoot finished early stays «Запланована» until its
 * end time. Both were raised and accepted: the alternative was a manual mark
 * that the photographer has to remember for every shoot, which is the
 * bookkeeping this replaces. `US-019`'s delete is what a mistake uses.
 *
 * **What it fixes.** The control was removed on 2026-09-03 with the New Shoot /
 * Edit Shoot merge and `setShootStatus` lost its last caller, so every row sat
 * at the column default for ever. Nothing in the app could produce a
 * «Завершена» shoot at all.
 *
 * ── The boundary ────────────────────────────────────────────────────────────
 *
 * A shoot is finished once **local wall-clock now is past its end**, not once
 * the day is over: `US-030` made `end_time` required, so a shoot that ended at
 * 12:00 does not stay «Запланована» until midnight.
 *
 * `end_time` is nullable in the column for rows predating `US-030` (see that
 * migration). Those fall back to the end of their day — the plain "current day
 * is past the shoot day" rule — rather than to midnight at its start, which
 * would have flipped a shoot to «Завершена» before it began.
 *
 * Everything is local: `date` is a wall-clock calendar day and `end_time` a
 * wall-clock `HH:MM`, both stored without a zone, so they are compared against
 * the device's own clock. A photographer travelling across a timezone sees a
 * shoot flip a few hours early or late. That is the same assumption every other
 * date helper here already makes (`daysUntil`, `nextShoot`).
 */
export function shootStatus(
  date: string,
  endTime: string | null,
  now: Date = new Date()
): ShootStatus {
  return now.getTime() > endOfShoot(date, endTime).getTime() ? 'finished' : 'new'
}

/** Convenience for the common case — the same rule, reading a whole `Shoot`. */
export function statusOf(shoot: Pick<Shoot, 'date' | 'endTime'>, now?: Date): ShootStatus {
  return shootStatus(shoot.date, shoot.endTime, now)
}

/**
 * The instant a shoot stops being upcoming.
 *
 * Built with the local `Date(y, m, d, h, min)` constructor rather than by
 * parsing `${date}T${endTime}` — that string form is treated as UTC by some
 * engines and local by others, and the difference is exactly the bug this
 * function would be blamed for.
 *
 * `day + 1` at midnight for a shoot with no end time: `Date` normalises the
 * overflow across month and year boundaries, so 31 December needs no special
 * case.
 */
function endOfShoot(date: string, endTime: string | null): Date {
  const [year, month, day] = date.split('-').map(Number)
  if (!endTime) return new Date(year, month - 1, day + 1)
  const [hours, minutes] = endTime.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}
