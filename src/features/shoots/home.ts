import type { Shoot } from './api'
import { statusOf } from './status'

/**
 * `US-035` AC-4 — the soonest shoot that has not finished.
 *
 * ── It compared DATES until 2026-09-06, and that was the bug ────────────────
 *
 * The rule was "dated today or later", written that way on purpose: a shoot at
 * 09:00 is still the answer to "what is next" at 10:00, because it is the thing
 * the photographer is in the middle of, and the card should not vanish
 * mid-shoot. That reasoning is right and the implementation was too coarse —
 * "today" lasts until midnight, so a shoot that ENDED at 12:00 went on leading
 * the home screen all afternoon (owner, 2026-09-06: 11:00 shoot, still shown at
 * 16:50).
 *
 * `statusOf` already draws the line in the right place, and drawing it anywhere
 * else here would mean the hero card could show a shoot whose own `StatusPill`
 * reads «Завершена». So: a shoot counts while it is not finished.
 *
 * That keeps every case the date rule was protecting —
 *
 *   later today          not finished  → still the answer
 *   in progress now      not finished  → still the answer, card stays put
 *   ended earlier today  finished      → skipped, which is the fix
 *   no `end_time` at all finished at midnight (`US-030` AC-6 rows) → all day
 *
 * — and the last line is why this delegates rather than comparing `endTime`
 * itself: the null fallback, and the local-vs-UTC parsing that `endOfShoot`
 * exists to get right, are already solved there.
 *
 * Soft-deleted shoots cannot appear here because they never reach the client:
 * the RLS policy excludes them from `listShoots` (`ADR-014`, CLAUDE.md rule 3).
 * AC-6 holds without a filter of its own, which is the point of enforcing it in
 * the policy.
 *
 * Returns null when everything has finished, which AC-5 renders as the section
 * being absent rather than as an empty card.
 */
export function nextShoot(shoots: Shoot[], today: Date = new Date()): Shoot | null {
  const upcoming = shoots.filter((shoot) => statusOf(shoot, today) === 'new')
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
 * The plural form for a count, by the language the forms are in — told apart by
 * how many there are, so no caller has to pass the language along.
 *
 * **Three forms are Ukrainian**, `[one, few, many]`: 1 день · 2–4 дні · 5–20
 * днів, and then it repeats by last digit — except the teens, which all take
 * the "many" form. The 11-to-14 exception is the part that gets forgotten:
 * «21 день» is right and so is «11 днів», which a rule written only on the last
 * digit gets backwards.
 *
 * **Two forms are English**, `[one, other]`: one for exactly 1, the other for
 * everything else. The English tuples used to repeat their plural to fill three
 * slots, and the Ukrainian rule then read «21 day» and «2 day» off them.
 *
 * `Intl.PluralRules` would do this, and the design system's §9 warns not to
 * trust it here: Hermes ships a cut-down Intl and the rules for `uk` may be
 * absent, which fails silently by falling back to English's two forms.
 */
export function plural(count: number, forms: readonly string[]): string {
  if (forms.length === 2) return Math.abs(count) === 1 ? forms[0] : forms[1]
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
  return `${strings.inDaysPrefix} ${days} ${plural(days, strings.dayForms)}`
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
 * Here rather than in `date.ts` because it needs `plural`, which lives in this
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
      `${days} ${plural(days, strings.dayForms)}`,
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
 * A shoot counts while it has not finished, matching `nextShoot` — so one
 * later today is here, one in progress is here, and one that ended this morning
 * is not. It compared dates until 2026-09-06 and carried the same bug: a shoot
 * over at noon sat in «Наступні зйомки» until midnight.
 */
export function upcomingShoots(shoots: Shoot[], today: Date = new Date()): Shoot[] {
  const next = nextShoot(shoots, today)
  return shoots
    .filter((shoot) => statusOf(shoot, today) === 'new' && shoot.id !== next?.id)
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
