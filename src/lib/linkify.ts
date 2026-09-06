/**
 * Find the URLs inside a free-text field, so they can be rendered tappable.
 *
 * The location's «Адреса» and «Деталі» are prose a creator types, and they
 * routinely contain a link — a Google Maps pin, a floor plan, a studio's page.
 * Until 2026-09-06 those rendered as text a reader had to retype by hand, which
 * on the link surface means retyping it in a phone browser with no app around
 * it. The owner asked for them to be tappable.
 *
 * ── Inline, not whole-field ─────────────────────────────────────────────────
 *
 * "Check if it is a link" would also read as "is this whole field a URL", and
 * that would be less code. It is not what the fields hold: «Паркування у дворі,
 * мапа: https://maps.app.goo.gl/x» is the ordinary case, and a whole-field test
 * finds nothing in it. Splitting covers both — a field that IS a link comes back
 * as one segment.
 *
 * ── What counts as a link ───────────────────────────────────────────────────
 *
 * **`http://` or `https://` only, scheme required.** That is the rule the app
 * already applies to every link a creator gives it — `isValidReferenceLink`
 * (`US-003` AC-2), and `normaliseFilesLink` for `US-024`/`US-025` — so a third
 * answer here would mean the same text was a link on one screen and not on
 * another.
 *
 * It also means «maps.google.com/…» typed without a scheme stays plain text.
 * That is deliberate: guessing at bare hostnames turns «вул. Хрещатик, 1» and
 * «буд. 3, кв. 12» into candidates, and a wrong guess on an address is worse
 * than an untappable link — the reader can still read it, where a link to
 * nowhere claims to do something and does not.
 */

/**
 * `https?://` up to the next whitespace. Angle brackets and quotes end it too,
 * so a URL pasted inside «…» or <…> does not swallow its closing mark.
 */
const URL_PATTERN = /https?:\/\/[^\s<>"'«»]+/gi

/**
 * Trailing characters that end a sentence rather than a URL.
 *
 * «Мапа: https://maps.app.goo.gl/x.» must not put the full stop inside the
 * link. Brackets are handled separately, below — a closing one can legitimately
 * belong to the URL.
 */
const TRAILING = /[.,;:!?…]+$/

/** One run of the original text: plain when `url` is null, tappable when not. */
export type LinkSegment = { text: string; url: string | null }

/**
 * Trim what punctuation ends the sentence rather than the address.
 *
 * A closing bracket is kept only when the URL opened one — Wikipedia and map
 * services both produce `…(1)` paths, and cutting those breaks the link, while
 * keeping an unmatched `)` breaks «(див. https://x.com/y)».
 */
function trimTrailing(url: string): string {
  let out = url.replace(TRAILING, '')
  const count = (text: string, char: string) => text.split(char).length - 1

  // Drop a closing bracket only while there are more of them than openers, then
  // re-trim: «(https://x.com/y).» loses the «)» and then the «.».
  let changed = true
  while (changed) {
    changed = false
    for (const [open, close] of [
      ['(', ')'],
      ['[', ']'],
    ] as const) {
      if (out.endsWith(close) && count(out, close) > count(out, open)) {
        out = out.slice(0, -1).replace(TRAILING, '')
        changed = true
      }
    }
  }
  return out
}

/**
 * Split text into plain and linked runs, in order.
 *
 * Always returns at least one segment for a non-empty input, and joining every
 * `text` back together reproduces the input exactly — nothing is dropped, so a
 * renderer cannot silently lose a character of somebody's address.
 */
export function splitLinks(text: string): LinkSegment[] {
  const segments: LinkSegment[] = []
  let cursor = 0

  // `matchAll` needs the /g flag and a fresh lastIndex; the regex is module
  // scope, so it is reset rather than trusted.
  URL_PATTERN.lastIndex = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0
    const raw = match[0]
    const url = trimTrailing(raw)
    // Everything trimmed off the end goes back to the plain run that follows,
    // which is what keeps the join lossless.
    const tail = raw.slice(url.length)

    if (start > cursor) segments.push({ text: text.slice(cursor, start), url: null })
    if (url) segments.push({ text: url, url })
    if (tail) segments.push({ text: tail, url: null })
    cursor = start + raw.length
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), url: null })
  return segments
}

/** Whether the text holds a link at all — lets a caller skip the split. */
export function hasLink(text: string): boolean {
  URL_PATTERN.lastIndex = 0
  return URL_PATTERN.test(text)
}
