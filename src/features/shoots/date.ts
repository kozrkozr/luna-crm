/**
 * ISO date (YYYY-MM-DD) from the *local* calendar day.
 *
 * Not toISOString(): that converts to UTC first, so a date picked late in the
 * evening in Kyiv (UTC+3) becomes the previous day. A shoot on the wrong day is
 * the kind of bug nobody notices until someone turns up to an empty studio.
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Wall-clock `HH:MM` from a local Date — the shape the `time` columns hold
 * (US-030).
 *
 * Same reasoning as toIsoDate: read the local fields, never serialise through
 * UTC. A shoot at 09:00 in Kyiv is 09:00 in the record, not 06:00.
 */
export function toTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * A Date carrying `HH:MM`, for handing a stored time back to the picker.
 *
 * The calendar day is arbitrary and unused — the picker in time mode reads only
 * the clock fields. Today's date is used rather than the epoch so that a device
 * in a zone with a historical offset change cannot land on a shifted hour.
 */
export function fromTimeValue(value: string): Date {
  const [hours, minutes] = value.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date
}

/**
 * `09:00 – 12:00` — en-dash with spaces, 24-hour, per the design system's §9.
 *
 * Null when either end is missing, which is the AC-6 case: a shoot created
 * before US-030 shows its date alone rather than half a range.
 */
/**
 * «19 вересня» — the day and the month in the genitive, which is how a date is
 * named in Ukrainian.
 *
 * Built from the ISO string's parts rather than through a `Date`, so no timezone
 * can shift the day between the record and its label.
 *
 * Here rather than in a screen because three of them need it — the home
 * screen's next-shoot card, the shoot list's day headings, and the shoot's own
 * page. It existed as `formatDay` and `formatDayLabel`, two identical private
 * copies, before the third asked for it.
 */
export function formatDayMonth(isoDate: string, monthsGenitive: readonly string[]): string {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${day} ${monthsGenitive[month - 1]}`
}

export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  return `${start} – ${end}`
}

/**
 * «19 вересня, пʼятниця» — the shoot-detail card's date row.
 *
 * The weekday is lower-cased because it follows a comma mid-sentence, where
 * `weekdaysFull` holds the capitalised forms the calendar's column headings
 * need. `toLowerCase` without a locale argument is safe for both languages here
 * — the Turkish-İ trap `Avatar` guards against needs a Turkish locale to fire,
 * and this app has two (CLAUDE.md rule 4).
 *
 * Built from the ISO string's parts rather than through a `Date`, like
 * `formatDayMonth` above — except for the weekday, which cannot be derived
 * without one. That `Date` is constructed from local parts, never parsed from
 * the string: `new Date('2026-09-19')` is UTC midnight and lands on the 18th
 * west of Greenwich.
 */
export function formatDayMonthWeekday(
  isoDate: string,
  monthsGenitive: readonly string[],
  weekdaysFull: readonly string[]
): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  // getDay() is 0=Sunday; the dictionaries list Monday first.
  const weekday = weekdaysFull[(new Date(year, month - 1, day).getDay() + 6) % 7]
  return `${day} ${monthsGenitive[month - 1]}, ${weekday.toLowerCase()}`
}

/** Minutes between two `HH:MM` wall-clock values, or null if either is missing. */
function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }
  const span = toMinutes(end) - toMinutes(start)
  // A negative span means the end is before the start, which nothing validates:
  // `US-030` AC-3 is unwritten (02-product/open-questions.md item 14). Null
  // rather than a negative duration, so a caller renders nothing instead of
  // «-2 год».
  return span > 0 ? span : null
}

/**
 * «3 год», «2 год 30 хв», «45 хв» — a shoot's length, derived from its start and
 * end rather than stored.
 *
 * The units are passed in rather than read from a dictionary here, so this file
 * keeps having no import from `src/i18n` — it is used by the link views, which
 * are Ukrainian-only and sit outside the language provider.
 */
export function formatDuration(
  start: string | null,
  end: string | null,
  units: { hours: string; minutes: string }
): string | null {
  const span = minutesBetween(start, end)
  return span === null ? null : formatMinutes(span, units)
}

/**
 * «2 год 30 хв» from a span already counted in minutes.
 *
 * Split out of `formatDuration` on 2026-09-03 for the shoot forms' time range,
 * which holds its span as a number and would otherwise have to round-trip it
 * through two `HH:MM` strings — and could not express 24 hours at all that way.
 *
 * `New Shoot.dc.html` writes this as `m < 60 ? m + ' хв' : (m % 60 === 0 ? …
 * ' год' : Math.floor(m / 60) + ' год 30 хв')`, which hardcodes «30 хв» for
 * every non-zero remainder. Ours prints the real remainder; at a 60-minute
 * grid step the two only differ on a range that came from stored data.
 */
export function formatMinutes(span: number, units: { hours: string; minutes: string }): string {
  const hours = Math.floor(span / 60)
  const minutes = span % 60
  return [hours ? `${hours} ${units.hours}` : null, minutes ? `${minutes} ${units.minutes}` : null]
    .filter(Boolean)
    .join(' ')
}

/**
 * How long until a shoot starts, as whole minutes. Negative once it has begun,
 * null for a shoot with no start time (`US-030` AC-6).
 *
 * `now` is a parameter so the caller's ticking clock drives this rather than a
 * hidden `Date.now()` — which also makes it testable without freezing time.
 */
export function minutesUntilStart(
  isoDate: string,
  startTime: string | null,
  now: Date
): number | null {
  if (!startTime) return null
  const [year, month, day] = isoDate.split('-').map(Number)
  const [hours, minutes] = startTime.split(':').map(Number)
  const start = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return Math.round((start.getTime() - now.getTime()) / 60_000)
}

/**
 * «вер», «лис» — the three-letter month in the «Наступні зйомки» rows.
 *
 * Sliced from the genitive list rather than written out as a second array, and
 * that is not a shortcut: every one of the twelve gives the conventional
 * Ukrainian abbreviation this way («вересня» → «вер», «листопада» → «лис»), and
 * English does too («September» → «Sep»). A hand-written second list would be
 * twelve more strings to keep in step with the first, and nothing would notice
 * when they drifted.
 *
 * Takes the month index straight from the ISO string, so no `Date` and no
 * timezone can move it.
 */
export function shortMonth(isoDate: string, monthsGenitive: readonly string[]): string {
  const month = Number(isoDate.split('-')[1])
  return monthsGenitive[month - 1].slice(0, 3)
}

/** The day of the month, from the ISO string — «24» beside `shortMonth`. */
export function dayOfMonth(isoDate: string): string {
  return String(Number(isoDate.split('-')[2]))
}
