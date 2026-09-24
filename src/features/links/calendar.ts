import type { LinkPayload } from './gateway'

/**
 * «Додати в календар» — a Google Calendar URL and an `.ics` file.
 *
 * **No story covers this.** `Shoot Link Preview.dc.html` offers it and the owner
 * asked for it (2026-08-31). It needs no schema change: everything comes from
 * the date, the times and the location the payload already carries.
 *
 * `US-030` AC-6 is the case to watch — a shoot created before that story has no
 * times, and an all-day event is the honest rendering of that rather than
 * inventing 09:00.
 */

/** `20260919T090000` — local wall-clock, which is what both formats want. */
function stamp(isoDate: string, time: string | null): string {
  const date = isoDate.replace(/-/g, '')
  if (!time) return date
  return `${date}T${time.replace(':', '')}00`
}

type CalendarEvent = {
  title: string
  start: string
  end: string
  location: string
  allDay: boolean
}

export function calendarEvent(payload: LinkPayload, title: string): CalendarEvent {
  const { date, startTime, endTime, locationAddress } = payload.shoot
  return {
    title,
    start: stamp(date, startTime),
    end: stamp(date, endTime ?? startTime),
    location: locationAddress ?? '',
    allDay: !startTime,
  }
}

/**
 * Google's event-creation URL.
 *
 * Deliberately not a deep link into an app: this opens in whatever browser the
 * reader has, which is where most link recipients already are (`ADR-012` — two
 * of the three journeys are the static web export).
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${event.start}/${event.end}`,
    location: event.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * An `.ics` document, as a data URI.
 *
 * A data URI rather than a file write, because there is nowhere to write on the
 * static export and no reason to on a device — `openExternalUrl` hands it to the
 * OS either way, and iOS opens it in Calendar.
 *
 * CRLF line endings and the `BEGIN`/`END` nesting are RFC 5545's, not
 * decoration: Apple Calendar rejects a file with bare LFs.
 */
export function icsDataUri(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luna Shoots//UA',
    'BEGIN:VEVENT',
    `UID:${event.start}-lunacrm`,
    `DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${event.start}`,
    `DTEND${event.allDay ? ';VALUE=DATE' : ''}:${event.end}`,
    // Commas and semicolons are field separators in iCalendar and have to be
    // escaped, or a location like «вул. Хрещатик 22, Київ» truncates.
    `SUMMARY:${escapeIcs(event.title)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`
}

function escapeIcs(value: string): string {
  return value.replace(/[\;,]/g, (match) => `\\${match}`).replace(/\n/g, '\\n')
}
