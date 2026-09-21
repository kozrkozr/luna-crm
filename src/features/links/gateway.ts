/**
 * The anonymous side of the link surface: ask the gateway what a token is worth.
 *
 * This is the ONLY way the link views read anything. There is no Supabase
 * client here on purpose — `anon` is granted nothing on any table (the grants
 * migration), and the crew/client field split cannot be enforced in a browser
 * (ADR-013). The gateway answers, and this just carries the answer.
 *
 * `crewView.ts` is the signed-in half of the same conversation (`US-009`): same
 * function, same payload, a session instead of a token. It lives next door
 * rather than here precisely so this module keeps having no account in it.
 */
/** A reference as the anonymous surface sees it: a usable URL, never a path. */
export type LinkReference = {
  id: string
  kind: 'link' | 'image'
  /** The external link, or a signed URL for an image. Null if signing failed. */
  url: string | null
  /** `20260830120000` — null on every reference created before it. */
  category: string | null
}

/**
 * A crew member as the CREW audience sees them (`US-023` AC-1): everything,
 * notes included.
 *
 * `US-026` gives the client a different type without `note` or `noteImageUrl`,
 * built by the gateway from its own named fields — not this one with keys
 * deleted. AC-2 of this story is that the two views are deliberately not the
 * same, and the type system is where that is easiest to keep true.
 */
export type LinkCrewMember = {
  id: string
  name: string
  role: string
  response: 'pending' | 'confirmed' | 'declined'
  /** Phone or email, whichever was stored (US-005). */
  contact: string | null
  instagram: string | null
  /** `20260831140000`, on both payloads since 2026-09-05. */
  telegram: string | null
  note: string | null
  noteImageUrl: string | null
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
    /** `US-030`, carried since 2026-08-31 — the gateway had never sent them. */
    startTime: string | null
    endTime: string | null
    /** `2026-09-03` — the first thing from `clients` on this surface. */
    client: { name: string; instagram: string | null } | null
    locationName: string | null
    locationAddress: string | null
    locationNote: string | null
    locationAttachmentUrl: string | null
    /**
     * The shoot's production note — «Нотатки від організатора».
     *
     * **On this payload and never on `ClientLinkPayload`.** That is not a
     * convention: `US-026` requires the field to be absent from a client's
     * response, and the gateway's `clientPayload` does not select the column.
     * The type mirrors the wire, so a screen cannot read it off a client
     * payload without TypeScript objecting.
     */
    notes: string | null
  }
  organizer: LinkOrganizer | null
  /** Who this link belongs to — «Ви: Ігор (Гафер)». */
  viewer: {
    name: string
    role: string
    response: LinkCrewMember['response']
    /** `US-008`, optional — «Причина — за бажанням». */
    declineReason: string | null
  }
  references: LinkReference[]
  crew: LinkCrewMember[]
}

/**
 * A crew member as the CLIENT audience sees them (`US-026` AC-1): name, role,
 * contact, Instagram. There is no `note` field on this type and there must
 * never be one — the gateway builds it from its own named fields, and this is
 * the client-side statement of the same rule.
 *
 * It is deliberately NOT `Omit<LinkCrewMember, 'note'>`. A type defined by
 * subtraction quietly gains whatever is added to the thing it subtracts from.
 */
export type LinkClientCrewMember = {
  id: string
  name: string
  role: string
  contact: string | null
  instagram: string | null
  /**
   * Added 2026-09-05 on the owner's instruction. `US-026` AC-1 lists four
   * fields; this is a fifth, and the story wants amending.
   *
   * Still no `note` and no `noteImageUrl`, and this type is still written out
   * rather than derived from `LinkCrewMember` — so a field added there does not
   * arrive here by inheritance. That is the whole reason for the duplication.
   */
  telegram: string | null
}

export type ClientLinkPayload = {
  audience: 'client'
  shootId: string
  shoot: {
    date: string
    startTime: string | null
    endTime: string | null
    /** `2026-09-03` — the first thing from `clients` on this surface. */
    client: { name: string; instagram: string | null } | null
    locationName: string | null
    locationAddress: string | null
    locationNote: string | null
    locationAttachmentUrl: string | null
    /* **No `notes` key.** See `CrewLinkPayload` and `US-026`. */
    /**
     * `20260905160000` — the shoot's note written FOR the client.
     *
     * **On this payload and never on `CrewLinkPayload`** (owner, 2026-09-05),
     * which is the reverse of the rule one line above and the reason the two
     * payload types are written out separately instead of one being derived
     * from the other. Each declares what its own audience receives, so neither
     * can inherit a field the other gains.
     */
    clientNotes: string | null
  }
  organizer: LinkOrganizer | null
  /**
   * `US-024` — the creator's pasted external link, already checked by the
   * gateway. Null means "show the placeholder", and is the only thing this
   * surface has to distinguish: a malformed value arrives as null, so the
   * screen never decides whether a link is usable.
   *
   * On `ClientLinkPayload` alone. The crew audience has no files section in the
   * prototype, and `US-024` is a client story.
   */
  rawFilesUrl: string | null
  /** `US-025` — the same, for finished photos. */
  finishedPhotosUrl: string | null
  references: LinkReference[]
  crew: LinkClientCrewMember[]
}

/**
 * Who organised the shoot — new on both payloads, 2026-08-31.
 *
 * **The first thing from `users` to reach an anonymous audience.** A call sheet
 * whose recipient cannot reach the person who sent it is missing the point;
 * `email` is still never sent, being the login credential and the crew-matching
 * key.
 */
export type LinkOrganizer = {
  name: string
  role: string
  phone: string | null
  instagram: string | null
  telegram: string | null
  /**
   * The emoji avatar the photographer chose for themselves, and its background.
   *
   * Both or neither — the gateway sends the pair or nothing, so a reader never
   * has to decide what half a pair means.
   *
   * **There is no photo here, deliberately.** `avatar_url` is a path in a
   * private bucket and would have to be signed; signed URLs expire and link
   * tokens do not, so an old link would show a broken image on a page that is
   * still valid. An organizer with a photo reads as initials on a link. The
   * gateway's own note carries the full reasoning.
   */
  avatarEmoji: string | null
  avatarTint: string | null
}

export type LinkPayload = CrewLinkPayload | ClientLinkPayload

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
    return absolutise(body as LinkPayload, base)
  } catch {
    return null
  }
}

/**
 * Media URLs arrive origin-relative and are joined to the base this client
 * already uses. See the gateway's `signed()` for why: it cannot know the origin
 * the reader can reach, and locally the one it would guess is a Docker
 * hostname. Links keep their own absolute URLs untouched.
 */
/**
 * Storage URLs come back origin-relative; a browser and a phone both need them
 * absolute.
 *
 * **Branched per audience, and it has to be.** A single shared `shoot` object
 * spread into both payloads stopped compiling the moment `notes` existed on one
 * of them and not the other — which is the type system enforcing `US-026` at the
 * seam. Building each branch separately means the client's `shoot` is
 * constructed without the field rather than trusting a spread to omit it.
 */
export function absolutise(payload: LinkPayload, base: string): LinkPayload {
  const origin = base.replace(/\/+$/, '')
  const join = (url: string | null) => (url && url.startsWith('/') ? `${origin}${url}` : url)
  const references = payload.references.map((reference) => ({
    ...reference,
    url: join(reference.url),
  }))

  if (payload.audience === 'client') {
    return {
      ...payload,
      shoot: {
        ...payload.shoot,
        locationAttachmentUrl: join(payload.shoot.locationAttachmentUrl),
      },
      references,
    }
  }

  return {
    ...payload,
    shoot: {
      ...payload.shoot,
      locationAttachmentUrl: join(payload.shoot.locationAttachmentUrl),
    },
    references,
    crew: payload.crew.map((member) => ({ ...member, noteImageUrl: join(member.noteImageUrl) })),
  }
}

export async function respondToLink(
  token: string,
  response: 'confirmed' | 'declined',
  /** Optional, and only stored with a decline — the gateway clears it on a
   *  confirm so a changed answer leaves no stale reason behind. */
  reason?: string | null
): Promise<boolean> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) return false

  try {
    const result = await fetch(`${base.replace(/\/+$/, '')}/functions/v1/link-gateway`, {
      method: 'POST',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ token, response, reason: reason ?? null }),
    })
    if (!result.ok) return false
    const body = (await result.json()) as { ok?: boolean }
    return body?.ok === true
  } catch {
    return false
  }
}
