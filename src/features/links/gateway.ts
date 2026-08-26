/**
 * The anonymous side of the link surface: ask the gateway what a token is worth.
 *
 * This is the ONLY way the link views read anything. There is no Supabase
 * client here on purpose — `anon` is granted nothing on any table (the grants
 * migration), and the crew/client field split cannot be enforced in a browser
 * (ADR-013). The gateway answers, and this just carries the answer.
 */
/** A reference as the anonymous surface sees it: a usable URL, never a path. */
export type LinkReference = {
  id: string
  kind: 'link' | 'image'
  /** The external link, or a signed URL for an image. Null if signing failed. */
  url: string | null
}

export type LinkCrewMember = {
  id: string
  name: string
  role: string
  response: 'pending' | 'confirmed' | 'declined'
}

/**
 * Note the shape of this type: there is no `note` field on `LinkCrewMember`,
 * and there will not be one on the client's version of it (`US-026`,
 * CLAUDE.md rule 2). The gateway builds each payload from named fields, and
 * these types are the client-side statement of the same rule.
 */
export type CrewLinkPayload = {
  audience: 'crew'
  shootId: string
  crewMemberId: string
  shoot: {
    date: string
    locationAddress: string | null
    locationNote: string | null
    locationAttachmentUrl: string | null
  }
  /** Who this link belongs to — «Ви: Ігор (Гафер)». */
  viewer: { name: string; role: string; response: LinkCrewMember['response'] }
  references: LinkReference[]
  crew: LinkCrewMember[]
}

export type LinkPayload = CrewLinkPayload | { audience: 'client'; shootId: string }

/**
 * Null means denied — an unknown token, a deleted shoot, or a removed crew
 * member, deliberately indistinguishable (US-006 AC-2, US-007 AC-2).
 *
 * A network failure returns null too, so the link view says "no longer valid"
 * when it cannot reach the gateway. That is wrong-but-safe, and S-2 F-2's rule
 * still holds either way: nothing is reported invalid until a resolution has
 * been ATTEMPTED, which is what this function is.
 */
export async function resolveLink(token: string): Promise<LinkPayload | null> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) return null

  try {
    const response = await fetch(
      `${base.replace(/\/+$/, '')}/functions/v1/link-gateway?token=${encodeURIComponent(token)}`,
      { headers: { apikey: key, authorization: `Bearer ${key}` } }
    )
    if (!response.ok) return null
    const body = (await response.json()) as { ok?: boolean } & Partial<LinkPayload>
    if (!body?.ok) return null
    return body as LinkPayload
  } catch {
    return null
  }
}
