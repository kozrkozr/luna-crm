import * as Crypto from 'expo-crypto'
import { supabase } from '../../lib/supabase/client'

/**
 * 32 random bytes. The token *is* the credential — there is no password behind
 * it and no expiry (ADR-014) — so it has to be unguessable rather than merely
 * unique. `getRandomBytesAsync` is the platform CSPRNG; `Math.random` would not
 * do here.
 */
const TOKEN_BYTES = 32

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  // base64url: a token lives in a URL path, so `+/=` must not appear.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * US-006 AC-1 — the link for one crew member on one shoot.
 *
 * One link per crew member, never one for the whole crew: that is what lets
 * removing a person revoke only their access (prd.md R-05, AC-2).
 *
 * Returns the existing token if there is one. Re-generating on every tap would
 * silently invalidate a link the creator had already sent, and nothing asks for
 * that — AC-2 makes removal the only thing that revokes.
 */
export async function crewLinkToken(shootId: string, crewMemberId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('access_links')
    .select('token')
    .eq('crew_member_id', crewMemberId)
    .eq('audience', 'crew')
    .maybeSingle()

  if (existing?.token) return existing.token

  const token = toBase64Url(await Crypto.getRandomBytesAsync(TOKEN_BYTES))
  const { data, error } = await supabase
    .from('access_links')
    .insert({ token, shoot_id: shootId, audience: 'crew', crew_member_id: crewMemberId })
    .select('token')
    .single()

  if (error || !data) return null
  return data.token
}

/**
 * The shareable URL. `/s/{token}` is the shape architecture.md commits to —
 * renaming it breaks links crew members already hold.
 *
 * The base is configuration, not a guess: it is the Cloudflare Pages host that
 * serves the static export, and a link built against the wrong origin is one
 * the recipient cannot open. Returns null when it is unset rather than
 * inventing an origin.
 */
export function crewLinkUrl(token: string): string | null {
  const base = process.env.EXPO_PUBLIC_LINK_BASE_URL
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/s/${token}`
}
