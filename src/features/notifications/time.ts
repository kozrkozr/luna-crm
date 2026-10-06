import { plural } from '../shoots/home'

/**
 * «2 год» · «вчора» — how long ago a notification arrived.
 *
 * `Home.dc.html`'s popover puts one of these at the end of every row, and shows
 * «2 год», «4 год» and «вчора». It is a mock, so those three are the whole of
 * the specification; the scale below fills in what it does not say and is
 * flagged in docs/redesign-log.md as wanting the owner's words.
 *
 *   under a minute   «щойно»
 *   under an hour    «14 хв»
 *   under a day      «2 год»
 *   yesterday        «вчора»
 *   older            «3 дні»
 *
 * «вчора» is a named case rather than «1 день» because the artboard names it,
 * and because a day boundary is what a reader counts in at that distance.
 *
 * **Calendar days, not 24-hour blocks.** Something at 23:00 last night is
 * «вчора» at 01:00 this morning, where an elapsed-hours rule would call it «2
 * год» and be technically right and useless. That is the same local-wall-clock
 * assumption every other date helper here makes.
 */
export function relativeTime(
  iso: string,
  now: Date,
  units: { justNow: string; minutes: string; hours: string; yesterday: string; dayForms: readonly string[] }
): string {
  const then = new Date(iso)
  const elapsed = now.getTime() - then.getTime()

  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return units.justNow
  if (minutes < 60) return `${minutes} ${units.minutes}`

  // Whole calendar days between the two, both normalised to local midnight —
  // the same trick `daysUntil` uses, and for the same reason.
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000)

  if (days === 0) return `${Math.floor(minutes / 60)} ${units.hours}`
  if (days === 1) return units.yesterday
  return `${days} ${plural(days, units.dayForms)}`
}
