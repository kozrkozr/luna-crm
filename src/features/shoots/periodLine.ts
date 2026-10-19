import type { Strings } from '../../i18n'
import type { Statistics, StatsAnchor, StatsPeriod } from './stats'

/**
 * «Вересень 2026» · «2026 рік» · «З березня 2023» — what period is on screen.
 *
 * Moved out of the statistics screen on 2026-10-17, so that `US-062`'s
 * «Без оплати» names its period the same way.
 *
 * Kept apart from `stats.ts`, which returns the month and stays
 * i18n-free (the `money.ts` split). The all-time line dates itself from the
 * earliest shoot that counted, so an account with none shows no line at all
 * rather than a period it cannot name.
 *
 * `trim()` is for English, where `statsYearWord` is empty: «2026 рік» has a
 * word after the year and "2026" does not, and that is a language difference
 * rather than a missing string.
 */
export function periodLine(
  period: StatsPeriod,
  anchor: StatsAnchor,
  stats: Statistics,
  t: Strings
): string {
  if (period === 'month') return `${t.months[anchor.month - 1]} ${anchor.year}`
  if (period === 'year') return `${anchor.year} ${t.statsYearWord}`.trim()
  if (!stats.firstMonth) return ''
  const { year, month } = stats.firstMonth
  return `${t.statsSincePrefix} ${t.monthsGenitive[month - 1]} ${year}`
}
