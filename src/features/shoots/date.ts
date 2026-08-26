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
