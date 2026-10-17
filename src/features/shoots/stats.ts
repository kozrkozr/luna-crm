import type { Shoot } from './api'
import { payment } from './money'
import { statusOf } from './status'
import { daysUntil } from './home'

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
 * ── What is counted (`US-061`, owner 2026-10-17) ────────────────────────────
 *
 * The screen ran on three answers from 2026-09-07: «Дохід» is money received;
 * only finished shoots count; only the current month or year. `US-061` keeps
 * the first and reverses the other two:
 *
 * 1. **«Дохід» is money RECEIVED — the sum of `prepayment`**, not of `price`.
 * 2. **Money is counted over every shoot in the period, finished or planned**
 *    — «Дохід», «Очікує оплати» and «Середній чек». A prepayment banked for
 *    next week's shoot is income now, and «Дохід» and «Очікує оплати» divide
 *    the same shoots between them without overlap. **Work — «Проведено» and
 *    the hours — is counted over finished shoots only.**
 * 3. **Any month or year**, chosen by the anchor the screen passes; «Весь час»
 *    ignores it.
 *
 * What is still nobody's decision is in docs/open-questions.md: the zero state,
 * and how a shoot that ends before it starts should be read (see `shootHours`).
 */

/** «Місяць» · «Рік» · «Весь час» — the segmented control's three values. */
export type StatsPeriod = 'month' | 'year' | 'all'

export const STATS_PERIODS = ['month', 'year', 'all'] as const

/**
 * `US-062` / `US-063` — which shoots a list opened from «Статистика» shows:
 * «Без оплати», «Проведено», «Заплановано», «В обробці», «Передано», «Прострочено».
 */
export type StatShootsKind = 'unpaid' | 'done' | 'planned' | 'editing' | 'delivered' | 'overdue'

/**
 * `US-061` AC-1 — which month or year the screen is on. `month` is 1-based and
 * ignored by «Рік»; both are ignored by «Весь час».
 */
export type StatsAnchor = { year: number; month: number }

/**
 * The fields a statistic reads, and no more.
 *
 * A structural `Pick` rather than the whole `Shoot`, for the reason `payment()`
 * takes an inline shape: the caller can hand this a row from anywhere, and a
 * test needs seven fields rather than twenty-five.
 */
export type StatsShoot = Pick<
  Shoot,
  'date' | 'startTime' | 'endTime' | 'price' | 'prepayment' | 'deliveryDue' | 'deliveredAt'
>

export type Statistics = {
  /** «Дохід» — received in the period, finished and planned shoots alike. */
  income: number
  /** «Проведено» — finished shoots. */
  done: number
  /** «Годин на зйомках», and the line under «Проведено» — finished shoots, whole hours. */
  hours: number
  /** «Заплановано» — shoots in the period that have not ended yet. */
  planned: number
  /** «Найближча» — the earliest planned shoot's date, or null when none. */
  nextPlanned: string | null
  /** «Середній чек» — average price of the shoots with one; null when none has. */
  average: number | null
  /** «Очікує оплати» — balances of the shoots with a price. */
  unpaid: number
  /** «{n} зйомок без оплати» — shoots with a price and a balance above zero. */
  unpaidShoots: number
  /** Shoots with a price — zero means «Очікує оплати» has nothing to say under it. */
  pricedShoots: number
  /** `US-063` AC-1 — «В обробці»: finished, with a deadline, not delivered. */
  editing: number
  /** `US-063` AC-1c — «Передано»: marked delivered. */
  delivered: number
  /** `US-063` AC-1a — «Прострочено»: «В обробці» whose deadline has passed. */
  overdue: number
  /**
   * The month the earliest counted shoot falls in, 1-based, for the «Весь час»
   * line («З березня 2023»). Null when the period counted nothing.
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
export function inPeriod(date: string, period: StatsPeriod, anchor: StatsAnchor): boolean {
  if (period === 'all') return true
  const [year, month] = date.split('-').map(Number)
  if (year !== anchor.year) return false
  return period === 'year' || month === anchor.month
}

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
 * `US-062` AC-2 — the shoots behind «{n} зйомок без оплати»: in the period,
 * with a price and something still outstanding, finished or planned. The
 * same test `statistics` counts them by, so the list and the number agree.
 */
export function isUnpaid(shoot: StatsShoot): boolean {
  const money = payment(shoot)
  return money.price > 0 && money.balance > 0
}

/**
 * `US-063` AC-1 — «В обробці»: the shoots whose calendar card lights «Обробка»
 * (`US-042` AC-5, AC-10) — finished, with a delivery deadline, not yet marked
 * delivered. Without a deadline there is no card and nothing to mark.
 */
export function isEditing(shoot: StatsShoot, now: Date = new Date()): boolean {
  return statusOf(shoot, now) === 'finished' && !!shoot.deliveryDue && !shoot.deliveredAt
}

/**
 * `US-063` AC-1c — «Передано»: the shoots whose calendar card lights «Передано»
 * (`US-042` AC-5) — marked delivered, which is what `deadlineStep` reads too.
 */
export function isDelivered(shoot: StatsShoot): boolean {
  return !!shoot.deliveredAt
}

/**
 * `US-063` AC-1a — «Прострочено»: «В обробці» with its deadline already
 * behind today — the calendar card's red «Прострочено» chip (`US-042` AC-4).
 */
export function isOverdue(shoot: StatsShoot, now: Date = new Date()): boolean {
  return isEditing(shoot, now) && daysUntil(shoot.deliveryDue as string, now) < 0
}

/** Earlier date first; on one day, the earlier start (a missing one first). */
function earlier(a: StatsShoot, b: StatsShoot): boolean {
  return a.date < b.date || (a.date === b.date && (a.startTime ?? '') < (b.startTime ?? ''))
}

/**
 * The screen's figures, derived once (`US-061` AC-3 – AC-7).
 *
 * **Soft-deleted shoots never reach here.** They cannot: the rows come from
 * `listShoots`, whose filter lives in the RLS policy rather than in any query
 * that could forget it (`ADR-014`, CLAUDE.md rule 3).
 */
export function statistics(
  shoots: readonly StatsShoot[],
  period: StatsPeriod,
  anchor: StatsAnchor,
  now: Date = new Date()
): Statistics {
  let income = 0
  let done = 0
  let minutes = 0
  let planned = 0
  let next: StatsShoot | null = null
  let priceSum = 0
  let pricedShoots = 0
  let unpaid = 0
  let unpaidShoots = 0
  let editing = 0
  let delivered = 0
  let overdue = 0
  let first: { year: number; month: number } | null = null

  for (const shoot of shoots) {
    if (!inPeriod(shoot.date, period, anchor)) continue
    const money = payment(shoot)

    // Money — every shoot in the period (AC-3, AC-5, AC-6).
    income += money.prepayment
    if (money.price > 0) {
      pricedShoots += 1
      priceSum += money.price
      unpaid += money.balance
      if (isUnpaid(shoot)) unpaidShoots += 1
    }

    // `US-063` AC-1c — as the card: delivered whatever the date says now.
    if (isDelivered(shoot)) delivered += 1

    // Work — finished shoots only; the rest are planned (AC-4).
    if (statusOf(shoot, now) === 'finished') {
      done += 1
      minutes += shootMinutes(shoot)
      if (isEditing(shoot, now)) editing += 1
      if (isOverdue(shoot, now)) overdue += 1
    } else {
      planned += 1
      if (!next || earlier(shoot, next)) next = shoot
    }

    const [year, month] = shoot.date.split('-').map(Number)
    if (!first || year < first.year || (year === first.year && month < first.month)) {
      first = { year, month }
    }
  }

  return {
    income,
    done,
    hours: Math.round(minutes / 60),
    planned,
    nextPlanned: next ? next.date : null,
    average: pricedShoots > 0 ? Math.round(priceSum / pricedShoots) : null,
    unpaid,
    unpaidShoots,
    pricedShoots,
    editing,
    delivered,
    overdue,
    firstMonth: first,
  }
}
