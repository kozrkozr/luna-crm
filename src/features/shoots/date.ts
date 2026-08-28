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
export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  return `${start} – ${end}`
}
