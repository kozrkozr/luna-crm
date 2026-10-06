import type { Shoot } from './api'
import { daysUntil } from './home'

/**
 * `US-042` — what the «Дедлайн здачі» card says, worked out once and away from
 * the screen so every rule in AC-4 and AC-5 sits in one place.
 */

/** AC-4's tones, in the design's own names (`DL_TONE` in the artboard). */
export type DeadlineTone = 'idle' | 'warn' | 'bad' | 'ok'

/**
 * The chip, before any copy: the screen turns `kind` into words, so this file
 * stays language-free.
 */
export type DeadlineChip =
  | { kind: 'delivered' }
  | { kind: 'overdue'; days: number }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'in'; days: number }

/**
 * AC-4 — the chip and its tone.
 *
 * «Передано» wins over the date: a deadline met late is still met, and the
 * card stops being an alarm the moment the files are out.
 *
 * Warning from 2 days out, as the artboard's `left <= 2` has it — so «Через 2
 * дні» is already amber while «Через 3 дні» is not.
 */
export function deadlineChip(
  due: string,
  delivered: boolean,
  today: Date = new Date()
): { chip: DeadlineChip; tone: DeadlineTone } {
  if (delivered) return { chip: { kind: 'delivered' }, tone: 'ok' }
  const left = daysUntil(due, today)
  if (left < 0) return { chip: { kind: 'overdue', days: -left }, tone: 'bad' }
  if (left === 0) return { chip: { kind: 'today' }, tone: 'warn' }
  if (left === 1) return { chip: { kind: 'tomorrow' }, tone: 'warn' }
  return { chip: { kind: 'in', days: left }, tone: left <= 2 ? 'warn' : 'idle' }
}

/**
 * AC-5 — the index of the current step of «Знято · Обробка · Передано», or -1
 * when none is lit.
 *
 * Driven by the derived status alone (owner, 2026-10-06): a finished shoot is
 * being edited, so it lands on «Обробка» straight away, with «Знято» lit behind
 * it. Step 0 is never the current one — it is only ever passed through. The
 * file links play no part, deliberately.
 */
export function deadlineStep(shoot: Pick<Shoot, 'status' | 'deliveredAt'>): -1 | 1 | 2 {
  if (shoot.deliveredAt) return 2
  return shoot.status === 'finished' ? 1 : -1
}

/**
 * AC-6 — «Позначити як передано клієнту» is offered only on a finished shoot
 * that is not delivered yet. Files of a shoot that has not happened cannot be
 * handed over.
 */
export function canMarkDelivered(shoot: Pick<Shoot, 'status' | 'deliveredAt'>): boolean {
  return shoot.status === 'finished' && !shoot.deliveredAt
}

/** AC-3 — the four quick choices, in days after the shoot. */
export const DEADLINE_QUICK_DAYS = [3, 7, 14, 30] as const

/** AC-3 — where the editor opens when there is no deadline yet. */
export const DEADLINE_DEFAULT_DAYS = 7

/**
 * `isoDate` plus `days`, as an ISO date.
 *
 * Built from local parts and read back the same way — `new Date('2026-09-19')`
 * would be UTC midnight and land on the 18th west of Greenwich (see `./date`).
 */
export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** Whole days from `from` to `to`, both ISO dates. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  // Local midnights, rounded: a DST change makes one day 23 or 25 hours long.
  return Math.round(
    (new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86_400_000
  )
}
