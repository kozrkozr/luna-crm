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

/**
 * The link surface is a static site on another origin (`ADR-012`), so every
 * response needs these — including the preflight, which is what a browser sends
 * before it will make the real request at all.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  // A token is a credential in a URL; keep it out of shared caches.
  'cache-control': 'no-store',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })

/**
 * The CORS preflight. **Bodyless**, and that is the whole point of it being
 * separate from `json`.
 *
 * This used to be `json({}, 204)`, which builds a 204 carrying `"{}"`. HTTP
 * forbids a body on a 204, and the two runtimes disagree about it: the local
 * one serves it happily, the deployed one answers 500. So the preflight failed
 * only in production, and because a failed preflight means the browser never
 * sends the real request, `resolveLink` saw a network error, returned null, and
 * every valid link rendered «Це посилання більше не діє».
 *
 * Nothing was wrong with the token, the gateway or the data — `curl` resolved
 * the same links correctly throughout, because curl sends no preflight. Found
 * by deploying, 2026-08-27.
 */
const preflight = () => new Response(null, { status: 204, headers: CORS })

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

/** The client, as PostgREST embeds them through `shoots.client_id`. */
type EmbeddedClient = { name: string; instagram: string | null }

type ShootRow = {
  id: string
  date: string
  /**
   * **On the link surface since 2026-09-03** (owner), and the first thing from
   * `clients` ever to cross to an anonymous reader — `ADR-018`'s Visibility note
   * recorded that nothing from that table had.
   *
   * Both audiences, because both are shown «Зйомка з …»; a crew member is
   * additionally shown the «Клієнт» section, which is where the handle is read.
   * `US-007` AC-1 enumerates what a crew member sees and does not list the
   * client, so **it needs amending**.
   *
   * PostgREST returns an embedded row as an object or an array depending on how
   * it resolves the relationship, hence both shapes.
   */
  clients: EmbeddedClient | EmbeddedClient[] | null
  /** `US-030`. Selected for both audiences since 2026-08-31. */
  start_time: string | null
  end_time: string | null
  /** Whose shoot it is — the organizer card reads `users` through this. */
  creator_id: string
  /**
   * The shoot's production note. **Selected in `crewPayload` and nowhere else**
   * — `US-026` requires it to be absent from a client's response. Typed here
   * because one row type serves both queries; the SELECT is what decides, and
   * `clientPayload` never asks for this column.
   */
  notes: string | null
  /**
   * The shoot's note FOR THE CLIENT (`20260905160000`). The mirror image of
   * `notes` above, and the first column in this file that is selected for the
   * client and withheld from the crew rather than the other way round.
   *
   * **Selected in `clientPayload` and nowhere else** (owner, 2026-09-05). The
   * crew audience does not get it — narrower than the design proves, and the
   * direction that stays reversible: one line adds it to `crewPayload`, nothing
   * takes it back out of a payload that has shipped.
   */
  client_notes: string | null
  /**
   * `20260903120000`. **On the link surface since 2026-09-03** (owner): the
   * artboard puts the venue above the address, and a reader who has never been
   * there needs the name more than the creator does.
   *
   * Both audiences, like `location_address` — it is a venue's name, not a note
   * and not a contact, so `ADR-013`'s split does not divide on it.
   */
  location_name: string | null
  location_address: string | null
  location_note: string | null
  location_attachment: string | null
  /** US-024. Selected for the client audience only — the crew's payload does
   *  not ask for it, and the prototype's crew link view has no files section. */
  raw_files_url: string | null
  /** US-025, the same and on the same screen. */
  finished_photos_url: string | null
}

type MemberRow = {
  id: string
  name: string
  role: string
  response: string
  /** `US-008`, optional — «Причина — за бажанням» (20260831180000). */
  decline_reason: string | null
}

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
  /**
   * `20260831140000`. Collected by the add-crew form since it existed and read
   * by `CREW_COLUMNS`, but selected by neither payload until 2026-09-05 — the
   * gateway names its columns, so a column nobody names reaches nobody.
   */
  telegram: string | null
  note: string | null
  note_image: string | null
}

/**
 * Who organised the shoot, for the link view's «Організатор» card.
 *
 * **This is the first time anything from `users` reaches an anonymous
 * audience.** Owner's decision, 2026-08-31: a call sheet whose recipient cannot
 * reach the person who sent it is missing the point, so name, role and contacts
 * are sent to crew AND clients.
 *
 * What that costs, stated once: the link is shareable, so the photographer's
 * phone reaches anyone it is forwarded to. That is the same property every other
 * field on this payload has, and it is the reason the footer calls the link
 * private.
 *
 * `email` is NOT selected. It is the login credential (`ADR-015`), it is the
 * crew-matching key (`match_contact_to_user`), and nothing on this screen asks
 * for it — three reasons, any one of which is enough.
 *
 * ── The avatar: an emoji, never a photo (owner, 2026-09-05) ─────────────────
 *
 * `avatar_emoji` and `avatar_tint` are two plain strings — a character and a
 * palette key — and cost this payload nothing. They are a picture the
 * photographer chose of themselves for exactly this purpose, so sending them to
 * the audience the «Організатор» card exists for is what they are for.
 *
 * **`avatar_url` is deliberately absent, and not for privacy.** It holds a path
 * in a private bucket, so sending it would mean signing a URL here — and
 * CLAUDE.md's own warning is that signed media URLs expire while link tokens
 * never do, so an idle link would show a broken image on a page that is still
 * valid. The link views already carry that hazard for a location video and
 * handle it by re-requesting the payload on error; an avatar is not worth a
 * second instance of it. An organizer with a photo therefore reads as initials
 * on a link, which is what it has always done.
 */
async function organizer(supabase: Supabase, creatorId: string) {
  const { data } = await supabase
    .from('users')
    .select('name, role, phone, social_handle, telegram, avatar_emoji, avatar_tint')
    .eq('id', creatorId)
    .maybeSingle()

  if (!data) return null
  const row = data as {
    name: string
    role: string
    phone: string | null
    social_handle: string | null
    telegram: string | null
    avatar_emoji: string | null
    avatar_tint: string | null
  }
  return {
    name: row.name,
    role: row.role,
    phone: row.phone,
    instagram: row.social_handle,
    telegram: row.telegram,
    /*
      Both or neither. `users_avatar_one_of` already guarantees it, so this is
      not defending against a bad row — it means the reader has one thing to
      check instead of two, and a half-set pair can never cross the wire.
    */
    avatarEmoji: row.avatar_emoji && row.avatar_tint ? row.avatar_emoji : null,
    avatarTint: row.avatar_emoji && row.avatar_tint ? row.avatar_tint : null,
  }
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
 *
 * **`shoots.notes` is the exception, since 2026-08-31.** It is the shoot's own
 * production note — what the client wants, what to bring — and
 * `Shoot Link Preview.dc.html` shows it to crew under «Нотатки від
 * організатора», badged «Клієнт не бачить». The owner approved sending it to
 * crew and only crew.
 *
 * So this function selects it and `clientPayload` does not, which is the whole
 * of the guarantee: `US-026` requires the field to be absent from a client's
 * response, "not even an empty one", and a shape built from named fields is what
 * makes that true. **Adding `notes` to `clientPayload`'s select is the single
 * edit that would break `ADR-013` and CLAUDE.md rule 2.**
 */
/** The embedded client, whichever shape PostgREST handed back. */
function embeddedClient(row: ShootRow): EmbeddedClient | null {
  if (!row.clients) return null
  return Array.isArray(row.clients) ? (row.clients[0] ?? null) : row.clients
}

/** `09:00:00` → `09:00`. Postgres's precision is neither the app's nor the design's. */
function trimTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null
}

async function crewPayload(supabase: Supabase, shootId: string, viewer: MemberRow) {
  const { data: shoot } = await supabase
    .from('shoots')
    /*
      **`notes` is selected HERE and in no other query in this file.**

      `shoots.notes` is the shoot's production note, badged «Клієнт не бачить»
      wherever it appears. `US-026` requires the field to be absent from a
      client's response — "not even an empty one" — and the way that is
      guaranteed is that `clientPayload`'s own select does not name it. Adding it
      there would be the single change that breaks CLAUDE.md rule 2.

      `start_time` / `end_time` go to both audiences: `US-030` added them on
      2026-08-28 and this function was never updated, so no link view has ever
      been able to show a time.
    */
    .select(
      'id, date, start_time, end_time, creator_id, location_name, location_address, location_note, location_attachment, notes, clients(name, instagram)'
    )
    .eq('id', shootId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!shoot) return { ok: false }
  const row = shoot as ShootRow

  const { data: references } = await supabase
    .from('shoot_references')
    .select('id, kind, url_or_path, category')
    .eq('shoot_id', shootId)
    // ADR-014, by hand again: `shoot_references.removed_at` (migration
    // 20260830140000) is filtered by the table's policy for the app, and this
    // runs as service role where no policy applies. Without it a reference the
    // creator removed keeps being served to everyone holding a link.
    .is('removed_at', null)
    .order('created_at', { ascending: true })

  // ADR-014, and the one place it is not enforced for us: this runs as service
  // role, so `removed_at` has to be filtered by hand. Forgetting it here is
  // what risks.md calls the most likely bug in v1 — a removed person still
  // listed on a live shoot.
  const { data: crew } = await supabase
    .from('crew_members')
    .select('id, name, role, response, phone, email, instagram, telegram, note, note_image')
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
      // Postgres hands back `09:00:00`; the app and the design both speak
      // HH:MM. Trimmed here, as `toShoot` does for the creator's side — this
      // was the one reader that never trimmed, so every link view has shown
      // «08:00:00 – 11:00:00» since times reached this payload.
      startTime: trimTime(row.start_time),
      endTime: trimTime(row.end_time),
      client: embeddedClient(row),
      locationName: row.location_name,
      locationAddress: row.location_address,
      locationNote: row.location_note,
      locationAttachmentUrl: await signed(supabase, row.location_attachment),
      /* Crew only. See the SELECT above, and `US-026`. */
      notes: row.notes,
    },
    organizer: await organizer(supabase, row.creator_id),
    // "Ви: Ігор (Гафер)" — the prototype names the reader, so a shared phone
    // does not leave someone answering for the wrong person.
    viewer: {
      name: viewer.name,
      role: viewer.role,
      response: viewer.response,
      declineReason: viewer.decline_reason,
    },
    references: await Promise.all(
      (references ?? []).map(async (reference) => ({
        id: reference.id,
        kind: reference.kind,
        // `20260830120000`. On the link surface since 2026-09-03 so the
        // grid can group by it, as the artboard draws. A label the
        // creator typed — neither a note nor a contact.
        category: reference.category,
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
        telegram: member.telegram,
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
  response: 'confirmed' | 'declined',
  /**
   * `US-008`'s optional «Причина — за бажанням», already trimmed and capped by
   * the caller.
   *
   * **It was accepted and dropped until 2026-09-06.** The call site has passed
   * it since `20260831180000` added the column and widened the grant to
   * `(response, decline_reason)`, and this function took three parameters and
   * wrote one — so the reason was parsed, bounded, handed over and thrown away,
   * and the creator's screen has been reading a column nothing ever filled.
   *
   * Nothing caught it: a spare argument is a type error, and `tsconfig.json`
   * excludes `supabase/functions` because this is Deno. `deno check` on this
   * file is the thing that would have.
   */
  reason: string | null
) {
  const { data } = await supabase
    .from('crew_members')
    /*
      The column is named only when declining. A confirmation carries no reason
      — the link view does not collect one — and `US-008`'s "a submitted
      response is final" means there can be no earlier reason to clear: the
      WHERE below only ever matches a `pending` row.
    */
    .update(response === 'declined' ? { response, decline_reason: reason } : { response })
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
    /*
      **`notes` is deliberately absent**, and this comment is the reason it must
      stay absent: `US-026` requires the shoot's production note to be missing
      from a client's response entirely. The field is selected in `crewPayload`
      and nowhere else. Adding it to this list is the one edit that breaks
      `ADR-013` and CLAUDE.md rule 2.

      **`client_notes` is the opposite case and is selected HERE and nowhere
      else** (owner, 2026-09-05, migration `20260905160000`). Two columns whose
      names differ by a prefix, going to two different audiences, one line
      apart: `notes` is the crew's and must never appear below, `client_notes`
      is the client's and must never appear in `crewPayload`'s select. Read the
      whole word before editing either list.
    */
    .select(
      'id, date, start_time, end_time, creator_id, location_name, location_address, location_note, location_attachment, client_notes, raw_files_url, finished_photos_url, clients(name, instagram)'
    )
    .eq('id', shootId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!shoot) return { ok: false }
  const row = shoot as ShootRow

  const { data: references } = await supabase
    .from('shoot_references')
    .select('id, kind, url_or_path, category')
    .eq('shoot_id', shootId)
    // ADR-014, by hand again: `shoot_references.removed_at` (migration
    // 20260830140000) is filtered by the table's policy for the app, and this
    // runs as service role where no policy applies. Without it a reference the
    // creator removed keeps being served to everyone holding a link.
    .is('removed_at', null)
    .order('created_at', { ascending: true })

  // `removed_at` filtered by hand, as everywhere in this function: service role
  // bypasses RLS, so a removed person would otherwise still be listed.
  const { data: crew } = await supabase
    .from('crew_members')
    .select('id, name, role, phone, email, instagram, telegram')
    .eq('shoot_id', shootId)
    .is('removed_at', null)
    .order('created_at', { ascending: true })

  return {
    ok: true,
    audience: 'client' as const,
    shootId: row.id,
    /*
      **The organizer reaches a client from 2026-09-03** (owner), where the card
      was crew-only. `ClientLinkPayload` has declared the field all along and
      this builder never set it — the same gap the times had, and found the same
      way: the type described a payload assembled by hand in another process.

      It is the first thing from `users` a client receives. `ADR-018`'s note that
      "the gateway sends a client nothing from `users`" no longer holds, and
      `socialSeenByCrew` on the profile screen — «Команда бачить ці контакти в
      деталях зйомки» — is now **false**: the client sees them too. That copy
      needs the owner.

      A client reaching their own photographer is the most ordinary thing in
      this product, and the shoot is theirs; what is widened is the handles
      rather than the fact of contact.
    */
    organizer: await organizer(supabase, row.creator_id),
    shoot: {
      date: row.date,
      /*
        **These were selected and never mapped.** `ClientLinkPayload` has
        declared them since 2026-08-31 and the SELECT has always fetched them,
        but the object built here skipped both — so a client's link has carried
        `undefined` where its times should be, while TypeScript read the
        declaration and believed otherwise. `US-030` gives a client the times
        exactly as it gives them to a crew member.
      */
      startTime: trimTime(row.start_time),
      endTime: trimTime(row.end_time),
      client: embeddedClient(row),
      locationName: row.location_name,
      locationAddress: row.location_address,
      // US-018 AC-2 shows the location note "wherever the location is
      // displayed", and US-010 gives the client the location. A client finding
      // the studio needs the same directions a crew member does.
      locationNote: row.location_note,
      locationAttachmentUrl: await signed(supabase, row.location_attachment),
      /*
        The client's own note. Not on `CrewLinkPayload` — see the SELECT above.

        Sent as null rather than omitted when empty: `api.ts` trims a blank
        field to null before it is stored, so the column holds no empty strings
        and the screen has one absent case to test. That is the same shape
        `locationNote` has carried since it existed, and it is NOT the treatment
        `US-026` demands of the crew note — "not even an empty one" applies to a
        field a client must never learn the existence of, where this one is
        addressed to them.
      */
      clientNotes: row.client_notes,
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
        // `20260830120000`. On the link surface since 2026-09-03 so the
        // grid can group by it, as the artboard draws. A label the
        // creator typed — neither a note nor a contact.
        category: reference.category,
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
      /*
        `US-026` AC-1 enumerates name, role, contact and Instagram — and
        **Telegram is a fifth, added on the owner's instruction (2026-09-05)**.
        The story wants amending; logged in docs/redesign-log.md rather than
        slipped in as if it had always said five.

        What has NOT changed is the thing AC-1 exists for: `note` and
        `note_image` are absent from the select above and from this object, and
        adding either is still the edit that breaks `ADR-013` and rule 2. A
        contact handle and a private note are different kinds of fact — the
        first is how a client reaches a person on their own shoot, the second is
        what the photographer wrote about them.
      */
      contact: member.phone ?? member.email,
      instagram: member.instagram,
      telegram: member.telegram,
    })),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  const url = new URL(req.url)
  let token = url.searchParams.get('token')
  let wanted: 'confirmed' | 'declined' | null = null
  let wantedReason: string | null = null

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    token = body?.token ?? token
    // Only the two values the enum allows. Anything else is refused before it
    // reaches the database rather than relying on the enum to reject it.
    wanted = body?.response === 'confirmed' || body?.response === 'declined' ? body.response : null
    if (!wanted) return denied()
    /*
      Free text from an anonymous caller, so it is bounded here rather than
      trusted: the design offers three chips, and nothing in the product reads
      this column back except the creator's own screen. A cap is the difference
      between a reason and an upload.
    */
    wantedReason =
      typeof body?.reason === 'string' && body.reason.trim()
        ? body.reason.trim().slice(0, 120)
        : null
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
    .select('id, date, location_name, location_address, location_note, location_attachment')
    .eq('id', link.shoot_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!shoot) return denied()

  if (link.audience === 'crew') {
    // US-006 AC-2 — a removed crew member's link stops working. `removed_at`
    // is the only thing that revokes it; there is no expiry (ADR-014).
    const { data: member } = await supabase
      .from('crew_members')
      .select('id, name, role, response, decline_reason')
      .eq('id', link.crew_member_id!)
      .is('removed_at', null)
      .maybeSingle()

    if (!member) return denied()

    // AC-2 — the same resolution gates the write. An invalid or revoked link
    // never reaches `respond`, so no status change can occur through one.
    if (wanted) return await respond(supabase, member.id, wanted, wantedReason)

    return json(await crewPayload(supabase, shoot.id, member))
  }

  // A client link points at no crew member (the audience-shape CHECK), so there
  // is nobody for it to answer for. Refused rather than ignored.
  if (wanted) return denied()

  return json(await clientPayload(supabase, shoot.id))
})
