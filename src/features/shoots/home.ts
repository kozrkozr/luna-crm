import type { Shoot } from './api'
import { toIsoDate } from './date'

/**
 * `US-035` AC-4 — the soonest shoot dated today or later.
 *
 * "Today or later", not "later than now": a shoot at 09:00 is still the answer
 * to "what is next" at 10:00, because it is the thing the photographer is in
 * the middle of. Comparing against the *date* rather than the timestamp is what
 * makes that true, and it also means the card does not vanish mid-shoot.
 *
 * Soft-deleted shoots cannot appear here because they never reach the client:
 * the RLS policy excludes them from `listShoots` (`ADR-014`, CLAUDE.md rule 3).
 * AC-6 holds without a filter of its own, which is the point of enforcing it in
 * the policy.
 *
 * Returns null when everything is in the past, which AC-5 renders as the
 * section being absent rather than as an empty card.
 */
export function nextShoot(shoots: Shoot[], today: Date = new Date()): Shoot | null {
  const todayIso = toIsoDate(today)
  const upcoming = shoots.filter((shoot) => shoot.date >= todayIso)
  if (upcoming.length === 0) return null
  // `listShoots` already orders by date ascending, but this does not rely on
  // that: a caller passing an unsorted array should still get the soonest, and
  // ties break on start time so two shoots on one day resolve correctly.
  return upcoming.reduce((soonest, shoot) => {
    if (shoot.date !== soonest.date) return shoot.date < soonest.date ? shoot : soonest
    return (shoot.startTime ?? '99:99') < (soonest.startTime ?? '99:99') ? shoot : soonest
  })
}

/** Whole days from today to `isoDate`. Negative for the past, 0 for today. */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  // Both sides normalised to local midnight, so a shoot this evening is 0 days
  // away rather than a fraction that rounds either way.
  const target = new Date(year, month - 1, day).getTime()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round((target - start) / 86_400_000)
}

/**
 * The Ukrainian plural form for a count: `[one, few, many]`.
 *
 * 1 день · 2–4 дні · 5–20 днів, and then it repeats by last digit — except the
 * teens, which all take the "many" form. The 11-to-14 exception is the part
 * that gets forgotten: «21 день» is right and so is «11 днів», which a rule
 * written only on the last digit gets backwards.
 *
 * `Intl.PluralRules` would do this, and the design system's §9 warns not to
 * trust it here: Hermes ships a cut-down Intl and the rules for `uk` may be
 * absent, which fails silently by falling back to English's two forms.
 */
export function pluralUk(count: number, forms: readonly string[]): string {
  const n = Math.abs(count) % 100
  const lastDigit = n % 10
  if (n > 10 && n < 20) return forms[2]
  if (lastDigit === 1) return forms[0]
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1]
  return forms[2]
}

/**
 * «Сьогодні» · «Завтра» · «за 22 дні» — how far off a shoot is.
 *
 * The first two are new copy, not from the mockup: it shows only the «за N …»
 * form, which for a shoot later today reads «за 0 днів» — wrong in Ukrainian
 * and wrong in meaning. See docs/redesign-log.md.
 */
export function distanceLabel(
  days: number,
  strings: { todayWord: string; tomorrowWord: string; inDaysPrefix: string; dayForms: readonly string[] }
): string {
  if (days <= 0) return strings.todayWord
  if (days === 1) return strings.tomorrowWord
  return `${strings.inDaysPrefix} ${days} ${pluralUk(days, strings.dayForms)}`
}

/**
 * «51 хв» · «2 год 30 хв» · «12 днів 23 год» — how long until a shoot starts.
 *
 * The shoot screen printed hours and minutes at every scale, so a shoot a
 * fortnight out read «Початок через 311 год 51 хв» — arithmetic the reader had
 * to do themselves. The owner asked for days past 24 hours (2026-09-06).
 *
 * ── Two units, always the two that matter ───────────────────────────────────
 *
 * The shape is unchanged — a large unit and the next one down — and only which
 * two moves with the distance:
 *
 *   under an hour   «51 хв»
 *   under a day     «2 год 30 хв»
 *   a day or more   «12 днів 23 год»
 *
 * Minutes are dropped once days appear. At that range they are noise, and
 * carrying three units would give «12 днів 23 год 51 хв» for a fact the reader
 * wanted rounded in the first place.
 *
 * **A zero remainder is omitted**, which the old inline version could not do: it
 * always appended `startsIn % 60`, so a shoot exactly two hours away read
 * «2 год 0 хв». Nothing chose that; it fell out of the template.
 *
 * Here rather than in `date.ts` because it needs `pluralUk`, which lives in this
 * file — and `date.ts` imports nothing at all, while this file imports it.
 * Reversing that to move one function would make a cycle out of a tidy edge.
 */
export function countdownLabel(
  minutes: number,
  strings: { dayForms: readonly string[]; hoursShort: string; minutesShort: string }
): string {
  const MINUTES_IN_DAY = 24 * 60

  if (minutes >= MINUTES_IN_DAY) {
    const days = Math.floor(minutes / MINUTES_IN_DAY)
    const hours = Math.floor((minutes % MINUTES_IN_DAY) / 60)
    return [
      `${days} ${pluralUk(days, strings.dayForms)}`,
      hours ? `${hours} ${strings.hoursShort}` : null,
    ]
      .filter(Boolean)
      .join(' ')
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return [hours ? `${hours} ${strings.hoursShort}` : null, rest ? `${rest} ${strings.minutesShort}` : null]
    .filter(Boolean)
    // A span under a minute would otherwise render as nothing at all — the
    // caller only asks while `startsIn > 0`, so «0 хв» is the honest floor.
    .join(' ') || `0 ${strings.minutesShort}`
}

/** «Пʼятниця, 28 серпня» — AC-2's date line. */
export function todayLabel(
  today: Date,
  weekdaysFull: readonly string[],
  monthsGenitive: readonly string[]
): string {
  // `(getDay() + 6) % 7` shifts JavaScript's Sunday-first week to the
  // Monday-first array, the same conversion the calendar does.
  const weekday = weekdaysFull[(today.getDay() + 6) % 7]
  return `${weekday}, ${today.getDate()} ${monthsGenitive[today.getMonth()]}`
}

/**
 * The shoots after the next one — the «Наступні зйомки» list.
 *
 * Excludes whatever `nextShoot` returned, because that one is already the card
 * above the list. The prototype gets this wrong: `Home.dc.html` assigns
 * `upcoming` twice in the same object literal, the second assignment wins, and
 * its `UPCOMING.slice(1)` guard is silently discarded — so the shoot in the card
 * is listed again underneath itself. Not copied.
 *
 * Today counts as upcoming, matching `nextShoot`: a shoot later today has not
 * happened yet.
 */
export function upcomingShoots(shoots: Shoot[], today: Date = new Date()): Shoot[] {
  const next = nextShoot(shoots, today)
  const todayIso = toIsoDate(today)
  return shoots
    .filter((shoot) => shoot.date >= todayIso && shoot.id !== next?.id)
    .sort((a, b) =>
      a.date === b.date
        ? (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
        : a.date.localeCompare(b.date)
    )
}

/**
 * Distinct venue NAMES from the creator's own past shoots — the chips under
 * «Назва» on the shoot forms.
 *
 * Same argument as `listPastCrew`: derived from what the creator already wrote,
 * single-sided, private, self-populating, and no new table. There is no
 * locations entity and this does not create one — the chip just fills the text
 * field, which writes a plain `location_name`.
 *
 * **It read `location_address` until 2026-09-03**, when `New Shoot.dc.html`
 * split «Назва» from «Адреса» and the chips moved under the former. A chip has
 * always held a venue name («Студія KULT») rather than a street address, so
 * this follows the value rather than the column it used to live in — but
 * `location_name` is new, so **the chips are empty until names are entered**.
 * Nothing backfills them: there is no way to tell which half of an existing
 * `location_address` was the name.
 *
 * Most recent first, so the studio someone used last week leads. Capped,
 * because this is a row of chips and not a directory.
 */
export function pastLocations(shoots: Shoot[], limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  // `listShoots` orders by date ascending, so walk it backwards for recency.
  for (let i = shoots.length - 1; i >= 0; i--) {
    const name = shoots[i].locationName?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length === limit) break
  }
  return out
}

/**
 * Shoots on `isoDate` whose time range overlaps `[startTime, endTime)`.
 *
 * It took a duration in minutes until 2026-09-03, when the forms stopped
 * deriving the end from a stepper and started collecting it directly.
 *
 * **No story asks for this.** The owner did (2026-08-30), after
 * `Time Picker Options.dc.html` drew «Перетин із «Ілона Козер» 10:00–13:00» on
 * three of its six variants. It is the same family as `US-031`'s clash marker
 * on the calendar, which warns about a tight turnaround AFTER a shoot is saved;
 * this catches an actual double-booking before it is.
 *
 * A warning, never a block: two shoots can genuinely overlap (a second
 * photographer, an assistant covering the tail of one job), and nothing in the
 * backlog says otherwise.
 *
 * Half-open on both sides, so a shoot ending at 13:00 and one starting at 13:00
 * do not count as overlapping.
 */
export function overlappingShoots(
  shoots: Shoot[],
  isoDate: string,
  startTime: string,
  endTime: string
): Shoot[] {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    return h * 60 + m
  }
  const from = toMinutes(startTime)
  const to = toMinutes(endTime)

  return shoots.filter((shoot) => {
    if (shoot.date !== isoDate || !shoot.startTime || !shoot.endTime) return false
    return from < toMinutes(shoot.endTime) && to > toMinutes(shoot.startTime)
  })
}
