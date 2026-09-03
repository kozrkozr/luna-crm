import { supabase } from '../../lib/supabase/client'
import { isValidReferenceLink } from '../references/api'

export type ShootStatus = 'new' | 'finished'

export type Shoot = {
  id: string
  /** `ADR-018` — the client is a row now. */
  clientId: string
  /**
   * Read through the join below, not stored on the shoot. Kept on this type so
   * every screen that shows a shoot's client keeps working unchanged — the data
   * moved, the shape did not.
   */
  clientName: string
  clientContact: string
  /**
   * `ADR-018` gave the client an `instagram` column; this exposes it, because
   * the shoot-detail person sheet shows a client's phone AND handle side by
   * side. Owner-only, like `clientContact`: the link gateway's ShootRow selects
   * neither, so no crew member and no client has ever received either.
   */
  clientInstagram: string | null
  /** `20260831160000` — the client's Telegram, same provenance as above. */
  clientTelegram: string | null
  date: string
  /**
   * `US-030` — local wall-clock `HH:MM`. Null only for shoots created before
   * that story: the form requires both, the column does not, and AC-6 says such
   * a shoot renders its date alone rather than half a range.
   */
  startTime: string | null
  endTime: string | null
  status: ShootStatus
  /**
   * `20260903120000` — the venue's name («Студія KULT»), which `locationAddress`
   * used to carry alongside the street address. Not on the link surface: see
   * the migration.
   */
  locationName: string | null
  locationAddress: string | null
  /** «Деталі» on the forms — how to get IN (US-018 AC-2). */
  locationNote: string | null
  /**
   * The shoot's own note — what the client wants, what to bring.
   *
   * Added 2026-08-30 (migration `20260830160000_shoot_notes.sql`). **No story
   * defines it**; three designs drew it and the owner asked for the column.
   *
   * Not `locationNote`, which is how to get IN, and not `CrewMember.note`,
   * which is about a person. **The link gateway selects none of the three for a
   * client**, and this one it does not select for anyone — see the migration.
   */
  notes: string | null
  /** Storage path to one image OR one video (US-018 AC-2). */
  locationAttachment: string | null
  /**
   * `US-024` — an external link the creator pastes, e.g. to the file-sharing
   * service they already use. Null renders the «В розробці» placeholder on the
   * client's view; this is a link, not hosting (`ADR-008`).
   */
  rawFilesUrl: string | null
  /** `US-025` — the same, for finished photos. Also a link, not hosting. */
  finishedPhotosUrl: string | null
}

/**
 * US-018 — the editable half of a shoot.
 *
 * **`clientId` was absent until 2026-08-30.** The story's Out of scope said only
 * date and location were asked for, and "if that's also needed, it's a new ask,
 * not assumed here". The owner made the ask.
 *
 * It moves the shoot to a different client. It does **not** rename one: an
 * `ADR-018` client has cross-shoot identity, so renaming would silently rewrite
 * every other shoot that person appears on. That belongs on the client's own
 * profile (`US-028`), not on a shoot.
 */
export type UpdateShootInput = {
  /** `ADR-018` — which client this shoot belongs to. */
  clientId: string
  date: string // ISO date, YYYY-MM-DD
  /** `US-030` AC-5 — editable, under the same rules as creation. */
  startTime: string // HH:MM
  endTime: string // HH:MM
  /** `20260903120000` — «Назва», beside the address. */
  locationName: string | null
  locationAddress: string | null
  locationNote: string | null
  locationAttachment: string | null
  /** `20260830160000` — editable, like every other field on this form. */
  notes: string | null
  /** `US-024` — set on the edit screen, where `ux-notes.md` and the prototype
   *  both place it. Open question #6 recorded that no story's criteria cover
   *  the creator entering it; design covers it, and AC-2 is unreachable
   *  without it. */
  rawFilesUrl: string | null
  /** `US-025`, alongside `rawFilesUrl` and set on the same screen. */
  finishedPhotosUrl: string | null
}

/** Every column the app reads for a Shoot, in one place so the two queries agree. */
/*
 * `clients(name, phone)` is a join, not a subquery: PostgREST resolves it
 * through the `shoots.client_id` foreign key, so it costs one round trip and is
 * subject to the same RLS as a direct read of `clients`.
 */
const SHOOT_COLUMNS =
  'id, client_id, clients(name, phone, instagram, telegram), date, start_time, end_time, status, location_name, location_address, location_note, location_attachment, notes, raw_files_url, finished_photos_url'

export type CreateShootInput = {
  /**
   * `ADR-018` — the caller supplies a client that already exists. Finding or
   * creating one is `US-029`'s job on the creation form, not this function's:
   * a `createShoot` that quietly created clients would make the dedup rule
   * unenforceable, because every path would have its own.
   */
  clientId: string
  date: string // ISO date, YYYY-MM-DD
  /**
   * `US-030` AC-1 — both required, and typed non-nullable so AC-2's "save is
   * blocked" cannot be bypassed by calling this directly. The *column* is
   * nullable (see the migration); required-ness lives here and in the form,
   * because only rows predating the story are allowed to lack them.
   */
  startTime: string // HH:MM
  endTime: string // HH:MM
  /**
   * `US-002`'s Out of scope excludes location at creation — it moved to
   * `US-018` after Ilona's prototype review. `ADR-017`'s client-match-flow
   * mockup collects it here again and the owner confirmed it (2026-08-29), so
   * the story needs amending; see docs/redesign-log.md.
   *
   * Nullable, because a shoot created without one is still valid — the column
   * has always been nullable and `US-018` still owns editing it.
   */
  locationAddress: string | null
  /** `20260903120000` — «Назва», collected on the create form beside it. */
  locationName: string | null
  /** `20260830160000` — how to get in; «Деталі» on the form. */
  locationNote: string | null
  /** `20260830160000` — the shoot's own note, collected on the create form. */
  notes: string | null
}

export type CreateShootResult = { ok: true; id: string } | { ok: false }

/**
 * US-002 AC-1 — create a shoot. `status` is not sent: the column defaults to
 * 'new' (US-020), so the default lives in one place instead of being restated
 * by every caller.
 *
 * `creator_id` is likewise not sent by the caller — it is set from the session
 * here, and the RLS insert policy requires it to equal auth.uid(), so a client
 * cannot create a shoot owned by someone else.
 */
export async function createShoot(input: CreateShootInput): Promise<CreateShootResult> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return { ok: false }

  const { data, error } = await supabase
    .from('shoots')
    .insert({
      creator_id: userId,
      client_id: input.clientId,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      location_name: input.locationName?.trim() || null,
      location_address: input.locationAddress?.trim() || null,
      location_note: input.locationNote?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !data) return { ok: false }
  return { ok: true, id: data.id }
}

/**
 * One shoot by id, or null if it is not the caller's or has been soft-deleted —
 * the RLS policy makes those two cases indistinguishable from here, which is
 * the point (ADR-014).
 */
export async function getShoot(id: string): Promise<Shoot | null> {
  const { data, error } = await supabase
    .from('shoots')
    .select(SHOOT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return toShoot(data)
}

/**
 * The creator's shoots. No `deleted_at is null` filter is written here and none
 * can be forgotten: the RLS policy carries it (ADR-014, CLAUDE.md rule 3).
 */
export async function listShoots(): Promise<Shoot[] | null> {
  const { data, error } = await supabase
    .from('shoots')
    .select(SHOOT_COLUMNS)
    .order('date', { ascending: true })

  if (error || !data) return null

  return data.map(toShoot)
}

type ShootRow = {
  id: string
  client_id: string
  /*
   * PostgREST returns an embedded row for a to-one join, but types it as
   * possibly an array — hence both shapes here. It is never actually an array:
   * `client_id` is NOT NULL and points at a single row.
   */
  clients: EmbeddedClient | EmbeddedClient[] | null
  date: string
  start_time: string | null
  end_time: string | null
  status: string
  location_name: string | null
  location_address: string | null
  location_note: string | null
  location_attachment: string | null
  notes: string | null
  raw_files_url: string | null
  finished_photos_url: string | null
}

type EmbeddedClient = {
  name: string
  phone: string | null
  instagram: string | null
  telegram: string | null
}

/** The joined client row, whichever shape PostgREST handed back. */
function embeddedClient(row: ShootRow): EmbeddedClient | null {
  if (!row.clients) return null
  return Array.isArray(row.clients) ? (row.clients[0] ?? null) : row.clients
}

function toShoot(row: ShootRow): Shoot {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: embeddedClient(row)?.name ?? '',
    clientContact: embeddedClient(row)?.phone ?? '',
    clientInstagram: embeddedClient(row)?.instagram ?? null,
    clientTelegram: embeddedClient(row)?.telegram ?? null,
    date: row.date,
    // Postgres hands back `09:00:00`; the app and the design both speak HH:MM.
    // Trimmed here so no screen has to know the column's precision.
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    endTime: row.end_time ? row.end_time.slice(0, 5) : null,
    status: row.status as ShootStatus,
    locationName: row.location_name,
    locationAddress: row.location_address,
    locationNote: row.location_note,
    notes: row.notes,
    locationAttachment: row.location_attachment,
    rawFilesUrl: row.raw_files_url,
    finishedPhotosUrl: row.finished_photos_url,
  }
}

/**
 * US-019 AC-1 — delete a shoot.
 *
 * Goes through a SECURITY DEFINER function rather than an UPDATE, because the
 * SELECT policy's `deleted_at is null` is applied to the *new* row and makes a
 * plain soft delete impossible. The reasoning is in the migration; the summary
 * is that the policy is right and the write has to happen outside it.
 *
 * The function does its own authorisation, so this is not a bare escape hatch:
 * it deletes only a shoot the caller created, and only one not already deleted.
 * `false` means it did none of that, and deliberately does not say which.
 *
 * ADR-014 does the rest — every crew and client link for this shoot derives its
 * validity from the parent row, so AC-1's "every link stops working" needs no
 * cascade of its own.
 */
export async function deleteShoot(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('soft_delete_shoot', { shoot_id: id })
  return !error && data === true
}

/**
 * US-020 AC-1 — mark a shoot Finished, or back to New.
 *
 * The parameter is `ShootStatus`, which is the union of exactly the two values
 * the enum column allows. That is AC-2's requirement — "no way to reach any
 * other status value, intentionally or by mistake" — held at three levels: the
 * screen offers a toggle rather than a picker, this signature admits nothing
 * else, and `shoot_status` rejects anything else in the database.
 */
export async function setShootStatus(id: string, status: ShootStatus): Promise<boolean> {
  const { error } = await supabase.from('shoots').update({ status }).eq('id', id)
  return !error
}

/**
 * US-018 AC-1 — save the edited date and location.
 *
 * `date` is typed as a required string rather than nullable, so AC-3's "save is
 * blocked when the date is cleared" cannot be reached by calling this: the
 * screen refuses first, and the column is NOT NULL behind it. Two barriers, and
 * the type is the cheaper one.
 *
 * Empty address and note are written as null rather than '', so "never filled
 * in" and "cleared" are the same state in the database and every reader has one
 * case to handle instead of two.
 */
export async function updateShoot(id: string, input: UpdateShootInput): Promise<boolean> {
  const { error } = await supabase
    .from('shoots')
    .update({
      client_id: input.clientId,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      location_name: input.locationName?.trim() || null,
      location_address: input.locationAddress?.trim() || null,
      location_note: input.locationNote?.trim() || null,
      location_attachment: input.locationAttachment,
      notes: input.notes?.trim() || null,
      // AC-3 — stored only if it is a link at all. The screen rejects a
      // malformed one with a message first (US-003 AC-2's rule, reused rather
      // than restated); this is the second guard, so a bad value cannot reach
      // the column by another route.
      raw_files_url: normaliseFilesLink(input.rawFilesUrl),
      finished_photos_url: normaliseFilesLink(input.finishedPhotosUrl),
    })
    .eq('id', id)

  return !error
}

/**
 * `US-024` AC-3 — "rejected the same way a reference link is (`US-003` AC-2)".
 *
 * So it IS that check, imported rather than reimplemented: http(s) and it
 * parses. The two rules cannot drift apart, which is what the AC asks for.
 *
 * Reachability is deliberately not checked. AC-3's "or unreachable" needs a
 * server-side fetch that file-sharing services routinely refuse, and a valid
 * private link commonly answers 403 — a probe would hide working links more
 * often than it caught dead ones. Owner's decision, 2026-08-27; recorded
 * against docs/open-questions.md #7.
 */
export function normaliseFilesLink(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return isValidReferenceLink(trimmed) ? trimmed : null
}
