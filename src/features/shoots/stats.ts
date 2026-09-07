import type { Shoot } from './api'
import { payment } from './money'
import { statusOf } from './status'

/**
 * «Статистика» — what a period of shoots came to.
 *
 * `Statistics.dc.html` and the fourth item its bottom bar draws (owner,
 * 2026-09-07). Pure and i18n-free, like `money.ts`: it returns numbers and the
 * month a period line needs, and the screen looks up the words. The arithmetic
 * is what wants testing, not the copy.
 *
 * **No schema change.** Every figure comes from columns that already exist —
 * `price` and `prepayment` (`20260905140000_shoot_payment.sql`), `date`,
 * `start_time` and `end_time` (`US-030`) — and the shoot's status is derived
 * from the last two (`status.ts`). Nothing is stored, cached or aggregated in
 * SQL; the screen reads the creator's shoots once and this reduces them.
 *
 * **Soft-deleted shoots never reach here.** They cannot: the rows come from
 * `listShoots`, whose filter lives in the RLS policy rather than in any query
 * that could forget it (`ADR-014`, CLAUDE.md rule 3).
 *
 * ── The three answers this module is built on (owner, 2026-09-07) ───────────
 *
 * The artboard draws five figures and defines none of them. Asked before a line
 * was written, and answered:
 *
 * 1. **«Дохід» is money RECEIVED — the sum of `prepayment`**, not of `price`.
 *    `prepayment` is how much has been paid so far (`money.ts`), so «Дохід» and
 *    «Очікує оплати» divide one shoot between them and never double-count it:
 *    what came in, and what is still owed.
 * 2. **Only FINISHED shoots count**, by shoot date — which is what «Проведено
 *    зйомок» says, and it applies to all five figures so that the two hero
 *    cards describe the same set of shoots. The cost, stated plainly: a
 *    prepayment already banked for a shoot next week appears in no figure until
 *    that shoot happens.
 * 3. **The period is the CURRENT month or year**, with no way to page back to
 *    an earlier one — the artboard draws no picker and neither does this.
 *
 * What is still nobody's decision is in docs/open-questions.md: the zero state,
 * and how a shoot that ends before it starts should be read (see `shootHours`).
 */

/** «Місяць» · «Рік» · «Весь час» — the segmented control's three values. */
export type StatsPeriod = 'month' | 'year' | 'all'

export const STATS_PERIODS = ['month', 'year', 'all'] as const

/**
 * The fields a statistic reads, and no more.
 *
 * A structural `Pick` rather than the whole `Shoot`, for the reason `payment()`
 * takes an inline shape: the caller can hand this a row from anywhere, and a
 * test needs five fields rather than twenty-five.
 */
export type StatsShoot = Pick<Shoot, 'date' | 'startTime' | 'endTime' | 'price' | 'prepayment'>

export type Statistics = {
  /** «Дохід» — hryvnia received in the period. */
  income: number
  /** «Проведено зйомок». */
  shoots: number
  /** «Середній чек» — `income / shoots`, rounded. Zero when nothing counted. */
  average: number
  /** «Очікує оплати» — what is still owed on the shoots counted above. */
  unpaid: number
  /** «Годин на зйомках» — whole hours, rounded from the total minutes. */
  hours: number
  /**
   * The month the earliest counted shoot falls in, 1-based, for the «Весь час»
   * line («З березня 2023»). Null when the period counted nothing — an account
   * with no finished shoots has no month to date itself from.
   */
  firstMonth: { year: number; month: number } | null
}

/**
 * Whether a wall-clock date falls in the period.
 *
 * Compared as numbers off the `YYYY-MM-DD` string rather than through `Date`:
 * `date` is a wall-clock calendar day stored without a zone, and building a
 * `Date` from it only to read the year back is a timezone bug waiting for a
 * traveller (the same care `endOfShoot` takes in `status.ts`).
 */
function inPeriod(date: string, period: StatsPeriod, now: Date): boolean {
  if (period === 'all') return true
  const [year, month] = date.split('-').map(Number)
  if (year !== now.getFullYear()) return false
  return period === 'year' || month === now.getMonth() + 1
}

/**
 * The shoots a period's figures are drawn from: finished, and dated inside it.
 *
 * Exported for the screen's «Проведено зйомок» count to be the same set the
 * money is summed over, by construction rather than by two matching filters.
 */
export function countedShoots<T extends StatsShoot>(
  shoots: readonly T[],
  period: StatsPeriod,
  now: Date = new Date()
): T[] {
  return shoots.filter(
    (shoot) => statusOf(shoot, now) === 'finished' && inPeriod(shoot.date, period, now)
  )
}

/** `'09:30'` → 570. */
function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * How long one shoot ran, in minutes.
 *
 * **A shoot missing either time contributes nothing** — `start_time` and
 * `end_time` are nullable for rows predating `US-030` (see that migration), and
 * a half-known range is not an hour count. `US-030` AC-6 already renders such a
 * shoot as its date alone.
 *
 * **An end at or before its start is read as crossing midnight** (+24h), so a
 * shoot entered as 23:00–00:00 counts one hour rather than none. That case is
 * reachable from the time picker on purpose — «23:00 + one step is 24:00,
 * stored as `00:00`» (docs/redesign-log.md, S-15) — and nothing forbids it,
 * `US-030` AC-3 being unwritten (docs/product/open-questions.md item 14). The
 * cost of the choice is that a mistyped 09:00–08:00 counts 23 hours instead of
 * being ignored; logged in docs/open-questions.md rather than decided here.
 */
function shootMinutes(shoot: StatsShoot): number {
  if (!shoot.startTime || !shoot.endTime) return 0
  const start = minutesOf(shoot.startTime)
  const end = minutesOf(shoot.endTime)
  return end > start ? end - start : end + 1440 - start
}

/**
 * The screen's five numbers, derived once.
 *
 * `average` is `income / shoots` rounded — the artboard's own arithmetic, and
 * verifiable against its mock: 142 500 over 12 shoots is the 11 875 it draws,
 * and so are its year and all-time figures. It is not a separate reading of the
 * data, which is why nothing here can make the three money figures disagree.
 */
export function statistics(
  shoots: readonly StatsShoot[],
  period: StatsPeriod,
  now: Date = new Date()
): Statistics {
  const counted = countedShoots(shoots, period, now)

  let income = 0
  let unpaid = 0
  let minutes = 0
  let first: { year: number; month: number } | null = null

  for (const shoot of counted) {
    const money = payment(shoot)
    income += money.prepayment
    unpaid += money.balance
    minutes += shootMinutes(shoot)

    const [year, month] = shoot.date.split('-').map(Number)
    if (!first || year < first.year || (year === first.year && month < first.month)) {
      first = { year, month }
    }
  }

  return {
    income,
    shoots: counted.length,
    average: counted.length > 0 ? Math.round(income / counted.length) : 0,
    unpaid,
    hours: Math.round(minutes / 60),
    firstMonth: first,
  }
}
