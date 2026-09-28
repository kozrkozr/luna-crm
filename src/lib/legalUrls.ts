/**
 * Where the two legal documents live.
 *
 * They are static pages in `public/`, not screens: a stranger opening
 * «політикою конфіденційності» — or an App Review reviewer checking the link
 * works — should get text before any JavaScript runs, on whatever connection
 * they have. `public/` is copied verbatim into `dist/` by `expo export`, so
 * they ship with the link surface and need no route or rewrite rule.
 *
 * The base is the same `EXPO_PUBLIC_LINK_BASE_URL` that `linkUrl` uses — the
 * Cloudflare Pages host — and is read the same way: null when unset, rather
 * than an invented origin. The caller is expected to hide the link in that
 * case; a underlined phrase that opens nothing is the bug these pages exist
 * to fix.
 */
function legalUrl(path: 'privacy' | 'terms'): string | null {
  const base = process.env.EXPO_PUBLIC_LINK_BASE_URL
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/${path}`
}

export const privacyUrl = (): string | null => legalUrl('privacy')
export const termsUrl = (): string | null => legalUrl('terms')
