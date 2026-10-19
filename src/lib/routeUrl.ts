import { splitLinks } from './linkify'

/**
 * Where «Маршрут» goes for a shoot's address (`US-034` AC-2), or null when
 * there is no address and the button is not drawn (AC-3).
 *
 * A link inside the address wins — the first one. Creators have pasted map
 * pins into «Адреса» since `linkify` made them tappable (2026-09-06), and a
 * search for the text of a URL would find nothing. Anything else is a Google
 * Maps search for the whole address: the one URL that works on an iPhone, on
 * Android and in a desktop browser, and that the Google Maps app takes over
 * when it is installed. The venue name is deliberately not part of the query
 * (`US-034`, Out of scope).
 */
export function routeUrl(address: string | null | undefined): string | null {
  const text = address?.trim()
  if (!text) return null
  const link = splitLinks(text).find((segment) => segment.url)
  if (link?.url) return link.url
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`
}
