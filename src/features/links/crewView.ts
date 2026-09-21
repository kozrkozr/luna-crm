import { supabase } from '../../lib/supabase/client'
import { absolutise, type CrewLinkPayload } from './gateway'

/**
 * The SIGNED-IN side of the same gateway — `US-009`, second half (owner,
 * 2026-09-21).
 *
 * A registered crew member's schedule has listed the shoots they are on since
 * `20260827100000`, but opening one needed a token, and a token only exists
 * once the photographer has tapped «копіювати посилання» for that person. So a
 * crew member could see the row and never what was behind it, and could never
 * answer `US-008`'s invitation at all. This is the entrance that does not
 * depend on the photographer having shared anything.
 *
 * **It asks the gateway, not the database**, and that is the whole design.
 * `shoots_select_own` restricts the table to its creator on purpose — widening
 * it would hand a crew member `client_name` and the rest of the row (see
 * `my_crew_shoots`'s migration) — so this goes to the one component that is
 * allowed to read across shoots and that already builds the crew payload per
 * `ADR-013`. What comes back is byte-for-byte what a crew link returns.
 *
 * **There IS a Supabase client here**, unlike `gateway.ts` next door, and the
 * difference is the point: that module serves the anonymous surface where the
 * token is the whole credential, this one serves an account where the session
 * is. It reads the session only to borrow its access token — every field on the
 * screen still comes from the gateway's answer.
 */

/** The caller's access token, or null when there is no session to speak for. */
async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

type Endpoint = { url: string; apikey: string; jwt: string }

/**
 * Everything a call needs, or null if any of it is missing.
 *
 * `apikey` stays the anon key while `authorization` carries the user's JWT:
 * that is the pairing Supabase's own client sends, and the gateway verifies the
 * second one itself (`verify_jwt = false`, for the anonymous surface's sake).
 */
async function endpoint(): Promise<Endpoint | null> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !apikey) return null
  const jwt = await accessToken()
  if (!jwt) return null
  return { url: url.replace(/\/+$/, ''), apikey, jwt }
}

/**
 * The crew payload for a shoot the signed-in user is on, or null.
 *
 * Null means denied, and is as deliberately uninformative here as it is for a
 * token (`resolveLink`): a shoot that was deleted, a crew row that was removed
 * (`US-022`, `ADR-014`) and a shoot the caller was never on are one answer.
 *
 * Always a `CrewLinkPayload` — this entrance has no client audience, since a
 * client never has an account (`US-010`). The gateway would not build one for
 * it either; the narrowing below states that at the seam rather than trusting
 * it, so a future change on the server surfaces here as a refusal rather than
 * as a screen rendering the wrong audience's fields.
 */
export async function resolveCrewShoot(shootId: string): Promise<CrewLinkPayload | null> {
  const target = await endpoint()
  if (!target) return null

  try {
    const response = await fetch(
      `${target.url}/functions/v1/link-gateway?shoot=${encodeURIComponent(shootId)}`,
      { headers: { apikey: target.apikey, authorization: `Bearer ${target.jwt}` } }
    )
    if (!response.ok) return null
    const body = (await response.json()) as { ok?: boolean } & Partial<CrewLinkPayload>
    if (!body?.ok || body.audience !== 'crew') return null
    const payload = absolutise(body as CrewLinkPayload, target.url)
    return payload.audience === 'crew' ? payload : null
  } catch {
    return null
  }
}

/**
 * `US-008` from inside the app — the same write the link's buttons make.
 *
 * The rules are not restated here and must not be: `respond` in the gateway
 * carries them in its WHERE clause (the answer is final once given, the row
 * must be live, only `response` and `decline_reason` are writable at all), so
 * both entrances are governed by one implementation of them.
 */
export async function respondAsCrew(
  shootId: string,
  response: 'confirmed' | 'declined',
  reason?: string | null
): Promise<boolean> {
  const target = await endpoint()
  if (!target) return false

  try {
    const result = await fetch(`${target.url}/functions/v1/link-gateway`, {
      method: 'POST',
      headers: {
        apikey: target.apikey,
        authorization: `Bearer ${target.jwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ shoot: shootId, response, reason: reason ?? null }),
    })
    if (!result.ok) return false
    const body = (await result.json()) as { ok?: boolean }
    return body?.ok === true
  } catch {
    return false
  }
}
