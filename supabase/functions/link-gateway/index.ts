/**
 * The link gateway (ADR-013).
 *
 * Every anonymous read of a shoot goes through here. It exists because
 * `US-023` and `US-026` describe the same crew member two ways: a crew member
 * sees every field including notes, a client sees the same fields **minus
 * notes**, and `US-026` requires the field to be absent — "not even an empty
 * one". That is a statement about the payload, not the screen, so the payload
 * is built here rather than filtered in a browser.
 *
 * Two rules this function must never break:
 *
 * 1. **No client response may contain a crew member's note** (CLAUDE.md rule 2).
 *    The client shape is built by naming the fields it may have, never by
 *    taking a row and deleting keys — a shape that starts from the row is one
 *    schema change away from leaking.
 *
 * 2. **Soft-delete filters are explicit here** (CLAUDE.md rule 3, ADR-014).
 *    This runs as the service role and bypasses RLS, so it is the one place in
 *    the system where a forgotten `deleted_at is null` actually resurrects a
 *    removed person onto a live shoot. Every query below filters, and the tests
 *    assert it.
 *
 * `US-006` AC-2 gave it its refusals; `US-007` gave it the crew payload.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // The link surface is a static site on another origin (ADR-012).
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type, apikey',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      // A token is a credential in a URL; keep it out of shared caches.
      'cache-control': 'no-store',
    },
  })

/**
 * One shape for every refusal. A token that never existed, a shoot that was
 * deleted and a crew member who was removed are deliberately indistinguishable
 * — `US-006` AC-2 asks for "access denied, not stale shoot data", and saying
 * *which* would tell an anonymous caller whether a token was ever real.
 */
const denied = () => json({ ok: false }, 404)

/**
 * How long the media URLs in a payload stay usable.
 *
 * risks.md R-4 names the trap this creates: signed URLs expire and link tokens
 * never do (ADR-014), so a crew member who opens their link, leaves the page
 * idle and then taps the location video can hit a dead URL on a page that is
 * otherwise perfectly valid — broken media, everything around it working, on a
 * shoot morning rather than in testing. The view re-requests the payload when
 * media fails to load, which is the remedy CLAUDE.md names.
 */
const MEDIA_TTL_SECONDS = 3600

const BUCKET = 'shoot-media'

type Supabase = ReturnType<typeof createClient>

const signed = async (supabase: Supabase, path: string | null): Promise<string | null> => {
  if (!path) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, MEDIA_TTL_SECONDS)
  return data?.signedUrl ?? null
}

type ShootRow = {
  id: string
  date: string
  location_address: string | null
  location_note: string | null
  location_attachment: string | null
}

type MemberRow = { id: string; name: string; role: string; response: string }

/**
 * `US-007` AC-1 — the date, the location, the shoot's references, and the rest
 * of the crew.
 *
 * Every field is named explicitly. Nothing here spreads a database row into the
 * response, which is the discipline that keeps `US-026`'s "no notes field at
 * all" reachable when the client payload is written: a shape built from named
 * fields cannot start leaking because a column was added.
 *
 * **No `note` is included, for anyone, yet.** `US-023` gives a crew member
 * their peers' notes and is not built; until a screen reads them there is no
 * reason for them to cross the network.
 */
async function crewPayload(supabase: Supabase, shootId: string, viewer: MemberRow) {
  const { data: shoot } = await supabase
    .from('shoots')
    .select('id, date, location_address, location_note, location_attachment')
    .eq('id', shootId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!shoot) return { ok: false }
  const row = shoot as ShootRow

  const { data: references } = await supabase
    .from('shoot_references')
    .select('id, kind, url_or_path')
    .eq('shoot_id', shootId)
    .order('created_at', { ascending: true })

  // ADR-014, and the one place it is not enforced for us: this runs as service
  // role, so `removed_at` has to be filtered by hand. Forgetting it here is
  // what risks.md calls the most likely bug in v1 — a removed person still
  // listed on a live shoot.
  const { data: crew } = await supabase
    .from('crew_members')
    .select('id, name, role, response')
    .eq('shoot_id', shootId)
    .is('removed_at', null)
    .order('created_at', { ascending: true })

  return {
    ok: true,
    audience: 'crew' as const,
    shootId: row.id,
    crewMemberId: viewer.id,
    shoot: {
      date: row.date,
      locationAddress: row.location_address,
      locationNote: row.location_note,
      locationAttachmentUrl: await signed(supabase, row.location_attachment),
    },
    // "Ви: Ігор (Гафер)" — the prototype names the reader, so a shared phone
    // does not leave someone answering for the wrong person.
    viewer: { name: viewer.name, role: viewer.role, response: viewer.response },
    references: await Promise.all(
      (references ?? []).map(async (reference) => ({
        id: reference.id,
        kind: reference.kind,
        // A link keeps its URL; an image becomes a signed one. The storage path
        // never leaves the server — it is not useful to a browser and it names
        // the shoot.
        url:
          reference.kind === 'image'
            ? await signed(supabase, reference.url_or_path)
            : reference.url_or_path,
      }))
    ),
    crew: (crew ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      response: member.response,
    })),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)

  const token = new URL(req.url).searchParams.get('token')
  if (!token) return denied()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role: this function is the only thing that may read across
    // shoots, and it is why every filter below has to be written out.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data: link, error: linkError } = await supabase
    .from('access_links')
    .select('audience, shoot_id, crew_member_id')
    .eq('token', token)
    .maybeSingle()

  if (linkError) console.error('link lookup failed:', linkError.message)
  if (!link) return denied()

  // ADR-014 — the shoot's own liveness. Deleting a shoot revokes every link
  // for it (US-019 AC-1) through exactly this check.
  const { data: shoot } = await supabase
    .from('shoots')
    .select('id, date, location_address, location_note, location_attachment')
    .eq('id', link.shoot_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!shoot) return denied()

  if (link.audience === 'crew') {
    // US-006 AC-2 — a removed crew member's link stops working. `removed_at`
    // is the only thing that revokes it; there is no expiry (ADR-014).
    const { data: member } = await supabase
      .from('crew_members')
      .select('id, name, role, response')
      .eq('id', link.crew_member_id!)
      .is('removed_at', null)
      .maybeSingle()

    if (!member) return denied()

    return json(await crewPayload(supabase, shoot.id, member))
  }

  return json({ ok: true, audience: 'client', shootId: shoot.id })
})
