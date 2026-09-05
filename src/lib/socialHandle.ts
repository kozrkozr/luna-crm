/**
 * Instagram and Telegram handles: what to show, and where a tap should go.
 *
 * Both fields accept whatever the person filling the form had in the clipboard
 * — `@daryna`, `daryna`, or the profile URL Instagram's own «Copy link» puts
 * there — and **nothing normalises them on the way into the database**. That is
 * deliberate: the stored value is what someone typed, three tables hold these
 * columns (`users`, `contacts`, `clients`, plus `crew_members`), and a
 * migration that rewrites people's data to save a parse at read time is a poor
 * trade. Parsing here also covers every row already stored, which a migration
 * would have to be written to do anyway.
 *
 * So both directions live here:
 *
 * - `handleLabel` — «@daryna» however it was stored, for display.
 * - `handleUrl` — the address to open, or `null` when there is nothing to open.
 *
 * Moved out of `src/components/PersonSheet.tsx` on 2026-09-05, where `handleUrl`
 * had been since the sheet's contact rows became tappable. It has five callers
 * now and a component was the wrong home for it; the label half is new, and is
 * why the sheet no longer shows a reader the raw
 * `https://www.instagram.com/daryna/?igsh=MXY` it was given.
 */

export type SocialService = 'instagram' | 'telegram'

/**
 * The hosts each service's own share sheet produces.
 *
 * `telegram.me` is the older form and still resolves; `instagr.am` is not here
 * because nothing has been seen storing one, and a host this does not know is
 * handled correctly anyway — see `parse`.
 */
const HOSTS: Record<SocialService, readonly string[]> = {
  instagram: ['instagram.com'],
  telegram: ['t.me', 'telegram.me'],
}

/**
 * Path segments that are not somebody's name.
 *
 * `instagram.com/p/CxYz` is a post and `t.me/+AbCdEf` is a private invite; both
 * are perfectly good links to open, and neither has a nickname in it. Without
 * this the first segment would be presented as one — «@p» — which is worse than
 * showing the URL, because it is confidently wrong rather than merely ugly.
 */
const NOT_A_NAME: Record<SocialService, readonly string[]> = {
  instagram: ['p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts'],
  telegram: ['joinchat', 's', 'share', 'addstickers', 'proxy'],
}

/**
 * What each service actually allows in a name.
 *
 * Deliberately looser than either service's real rule — Instagram caps at 30
 * and Telegram demands at least 5 — because the cost of the two errors is not
 * symmetric. Rejecting a real handle silently downgrades a working link to
 * plain text; accepting a slightly-wrong one produces a link that 404s, which
 * the reader can see and understand. What both patterns DO reject is free text:
 * a space, a comma or a slash means somebody typed a name or a note into the
 * field, and that must never be dressed up as a handle.
 */
const NAME_PATTERN: Record<SocialService, RegExp> = {
  instagram: /^[A-Za-z0-9._]{1,32}$/,
  telegram: /^[A-Za-z0-9_]{1,32}$/,
}

type Parsed =
  /** A name, whatever form it arrived in. Both a label and a URL are available. */
  | { kind: 'name'; name: string }
  /** A URL that is not a profile — a post, an invite, another site. Openable, not nameable. */
  | { kind: 'url'; url: string }
  /** Free text, or empty. Show it as it is and link nowhere. */
  | { kind: 'text' }

/**
 * The single place a stored value is interpreted.
 *
 * Order matters: a URL is recognised first, because `instagram.com/daryna`
 * satisfies neither `@`-stripping nor the name pattern, and a bare name is
 * whatever survives afterwards.
 */
function parse(service: SocialService, raw: string | null | undefined): Parsed {
  const value = raw?.trim()
  if (!value) return { kind: 'text' }

  // `//host/path` and `host/path` are both things people paste, so the scheme
  // is optional here — but it is put back before anything is opened, since
  // `Linking` needs one.
  const withoutScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^\/\//, '')
  const looksLikeUrl = /^https?:\/\//i.test(value) || withoutScheme !== value || value.includes('/')

  if (looksLikeUrl) {
    const [hostAndPath] = withoutScheme.split(/[?#]/)
    const [host, ...segments] = hostAndPath.split('/')
    const bare = host.replace(/^www\./i, '').toLowerCase()
    const first = segments.filter(Boolean)[0]
    const url = /^https?:\/\//i.test(value) ? value : `https://${withoutScheme}`

    if (!HOSTS[service].includes(bare)) return { kind: 'url', url }
    if (!first || NOT_A_NAME[service].includes(first.toLowerCase())) return { kind: 'url', url }

    const name = first.replace(/^@/, '')
    return NAME_PATTERN[service].test(name) ? { kind: 'name', name } : { kind: 'url', url }
  }

  const name = value.replace(/^@/, '')
  return NAME_PATTERN[service].test(name) ? { kind: 'name', name } : { kind: 'text' }
}

/**
 * What the reader sees: «@daryna», however it was stored.
 *
 * Anything this cannot read as a name is returned trimmed and unchanged. A URL
 * to a post stays a URL, and a line of free text stays that line — the reader
 * is shown what is actually in the field rather than a guess at what it meant.
 */
export function handleLabel(service: SocialService, raw: string | null | undefined): string {
  const parsed = parse(service, raw)
  if (parsed.kind === 'name') return `@${parsed.name}`
  if (parsed.kind === 'url') return parsed.url
  return raw?.trim() ?? ''
}

/**
 * Where a tap goes, or `null` when it should not be tappable at all.
 *
 * `null` is the important half. A row with a press state that opens nothing is
 * worse than a row with neither, which is the rule `PersonSheet`'s `DetailRow`
 * was written to — so free text in an Instagram field renders inert rather than
 * sending the reader to `instagram.com/Марія%20з%20студії`. That URL is what
 * this returned before it could tell a name from a sentence.
 */
export function handleUrl(service: SocialService, raw: string | null | undefined): string | null {
  const parsed = parse(service, raw)
  if (parsed.kind === 'url') return parsed.url
  if (parsed.kind === 'text') return null
  return service === 'telegram'
    ? `https://t.me/${parsed.name}`
    : `https://instagram.com/${parsed.name}`
}
