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
 * `US-006` AC-2 gave it its refusals; `US-007` gave it the crew payload;
 * `US-008` gave it its one write.
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

/**
 * A signed URL, returned ORIGIN-RELATIVE.
 *
 * `createSignedUrl` builds its URL from this function's own `SUPABASE_URL`,
 * which is the address the *server* reaches Supabase at. Locally that is
 * `http://kong:8000` — a Docker hostname no browser and no phone can resolve,
 * so every image on the link surface rendered as a blank tile. In production it
 * would happen to be right, which is exactly the kind of difference that ships.
 *
 * Returning the path and letting the caller join it to the base it already
 * knows removes the question: the client's origin is the one that has to work,
 * because the client is what fetches it. It also needs no extra configuration
 * to be correct in both places.
 */
const signed = async (supabase: Supabase, path: string | null): Promise<string | null> => {
  if (!path) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, MEDIA_TTL_SECONDS)
  if (!data?.signedUrl) return null
  try {
    const url = new URL(data.signedUrl)
    return `${url.pathname}${url.search}`
  } catch {
    // Already relative, which some client versions return.
    return data.signedUrl
  }
}

type ShootRow = {
  id: string
  date: string
  location_address: string | null
  location_note: string | null
  location_attachment: string | null
  /** US-024. Selected for the client audience only — the crew's payload does
   *  not ask for it, and the prototype's crew link view has no files section. */
  raw_files_url: string | null
  /** US-025, the same and on the same screen. */
  finished_photos_url: string | null
}

type MemberRow = { id: string; name: string; role: string; response: string }

/**
 * `US-023` — a crew member sees a peer's complete details, "with nothing held
 * back": name, role, contact, Instagram **and notes**.
 *
 * This is the first time a note crosses the network, and it is the reason
 * `ADR-013` exists. `US-026` shows the same person to a client with the notes
 * field **absent** — "not even an empty one" — so the two payloads are built by
 * two functions that each name their own fields. The client's shape will not be
 * this one with a key removed, because a shape derived by subtraction leaks the
 * day someone adds a column and forgets.
 *
 * The prototype hides notes with a `hideNotes` flag on a shared body. That is
 * the exact approach `ADR-013` rejects: it makes the difference a rendering
 * decision, and the client would still have received the note.
 */
type PeerRow = MemberRow & {
  phone: string | null
  email: string | null
  instagram: string | null
  note: string | null
  note_image: string | null
}

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
    .select('id, name, role, response, phone, email, instagram, note, note_image')
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
    crew: await Promise.all(
      ((crew ?? []) as PeerRow[]).map(async (member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        response: member.response,
        // US-023 AC-1 — the crew audience sees the whole record. One contact
        // field, as the form collects it (US-005) and as the prototype shows
        // it back.
        contact: member.phone ?? member.email,
        instagram: member.instagram,
        note: member.note,
        noteImageUrl: await signed(supabase, member.note_image),
      }))
    ),
  }
}

/**
 * `US-008` — the crew member's answer, and the only thing this function writes.
 *
 * Three conditions, all in the WHERE clause rather than in branching, so the
 * database decides and a race cannot slip between a check and an update:
 *
 *   * the row is this token's crew member          — AC-2, no cross-shoot writes
 *   * they are not removed                          — AC-2, a revoked link acts on nothing
 *   * their response is still `pending`             — Out of scope: "a submitted
 *                                                     response is final"
 *
 * The service role can only write `response` at all — the grant is column-level
 * (see the migration), so even a mistake here cannot touch a name or a note.
 */
async function respond(
  supabase: Supabase,
  crewMemberId: string,
  response: 'confirmed' | 'declined'
) {
  const { data } = await supabase
    .from('crew_members')
    .update({ response })
    .eq('id', crewMemberId)
    .is('removed_at', null)
    .eq('response', 'pending')
    .select('id, response')

  // Empty means the row was already answered, removed, or not there. The caller
  // is told no more than that, for the same reason every refusal looks alike.
  if (!data || data.length === 0) return denied()
  return json({ ok: true, response: data[0].response })
}

/**
 * `US-010` / `US-026` — the client's payload.
 *
 * A separate function from `crewPayload`, and the separation is the point
 * (`ADR-013`, CLAUDE.md rule 2). `US-026` AC-1 requires a crew member's notes
 * to be absent — "not even an empty one" — and that is a statement about this
 * object, not about a screen.
 *
 * Two things make it hard to get wrong rather than merely correct today:
 *
 * 1. **The query does not select `note` or `note_image`.** Not selected, not
 *    mapped, not present. A future column named `note_2` would have to be added
 *    to this SELECT deliberately before it could leak.
 * 2. **Nothing is shared with the crew shape.** No spread, no `omit`, no
 *    `hideNotes` flag. A shape built by subtraction leaks the day someone adds
 *    a field and forgets to subtract it.
 *
 * The response status is absent too: the prototype's client row shows a name
 * and a role, and whether a crew member confirmed is the photographer's
 * business, not the client's. `US-010` never asks for it.
 */
/**
 * `US-024` AC-3 — the same rule the app applies when the link is pasted
 * (`isValidReferenceLink`, `US-003` AC-2), restated here because this function
 * is the only thing standing between the column and the client.
 *
 * Reachability is not probed. AC-3's "or unreachable" would need a fetch per
 * view against services that refuse it, and a valid private link commonly
 * answers 403 — hiding more working links than dead ones. Owner's decision,
 * 2026-08-27 (docs/open-questions.md #7).
 */
function filesLink(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : null
  } catch {
    return null
  }
}

async function clientPayload(supabase: Supabase, shootId: string) {
  const { data: shoot } = await supabase
    .from('shoots')
    .select('id, date, location_address, location_note, location_attachment, raw_files_url, finished_photos_url')
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

  // `removed_at` filtered by hand, as everywhere in this function: service role
  // bypasses RLS, so a removed person would otherwise still be listed.
  const { data: crew } = await supabase
    .from('crew_members')
    .select('id, name, role, phone, email, instagram')
    .eq('shoot_id', shootId)
    .is('removed_at', null)
    .order('created_at', { ascending: true })

  return {
    ok: true,
    audience: 'client' as const,
    shootId: row.id,
    shoot: {
      date: row.date,
      locationAddress: row.location_address,
      // US-018 AC-2 shows the location note "wherever the location is
      // displayed", and US-010 gives the client the location. A client finding
      // the studio needs the same directions a crew member does.
      locationNote: row.location_note,
      locationAttachmentUrl: await signed(supabase, row.location_attachment),
    },
    // US-024 — an external link the creator pasted, or null for the «В розробці»
    // placeholder. AC-3's fallback is made here rather than on the screen: the
    // column can hold anything written before the edit screen's check existed,
    // and a value that is not a link must reach the client as no link at all.
    rawFilesUrl: filesLink(row.raw_files_url),
    // US-025 — same rule, same fallback.
    finishedPhotosUrl: filesLink(row.finished_photos_url),
    references: await Promise.all(
      (references ?? []).map(async (reference) => ({
        id: reference.id,
        kind: reference.kind,
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
      // US-026 AC-1 — name, role, contact and Instagram. Nothing else.
      contact: member.phone ?? member.email,
      instagram: member.instagram,
    })),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)

  const url = new URL(req.url)
  let token = url.searchParams.get('token')
  let wanted: 'confirmed' | 'declined' | null = null

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    token = body?.token ?? token
    // Only the two values the enum allows. Anything else is refused before it
    // reaches the database rather than relying on the enum to reject it.
    wanted = body?.response === 'confirmed' || body?.response === 'declined' ? body.response : null
    if (!wanted) return denied()
  }

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

    // AC-2 — the same resolution gates the write. An invalid or revoked link
    // never reaches `respond`, so no status change can occur through one.
    if (wanted) return await respond(supabase, member.id, wanted)

    return json(await crewPayload(supabase, shoot.id, member))
  }

  // A client link points at no crew member (the audience-shape CHECK), so there
  // is nobody for it to answer for. Refused rather than ignored.
  if (wanted) return denied()

  return json(await clientPayload(supabase, shoot.id))
})
