import { supabase } from '../../lib/supabase/client'
import { isValidReferenceLink } from '../references/api'

export type ShootStatus = 'new' | 'finished'

export type Shoot = {
  id: string
  clientName: string
  clientContact: string
  date: string
  status: ShootStatus
  locationAddress: string | null
  /** Free text — directions and the like (US-018 AC-2). */
  locationNote: string | null
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
 * US-018 — the editable half of a shoot. Client name and contact are absent on
 * purpose: the story's Out of scope says only date and location were asked for,
 * and "if that's also needed, it's a new ask, not assumed here".
 */
export type UpdateShootInput = {
  date: string // ISO date, YYYY-MM-DD
  locationAddress: string | null
  locationNote: string | null
  locationAttachment: string | null
  /** `US-024` — set on the edit screen, where `ux-notes.md` and the prototype
   *  both place it. Open question #6 recorded that no story's criteria cover
   *  the creator entering it; design covers it, and AC-2 is unreachable
   *  without it. */
  rawFilesUrl: string | null
  /** `US-025`, alongside `rawFilesUrl` and set on the same screen. */
  finishedPhotosUrl: string | null
}

/** Every column the app reads for a Shoot, in one place so the two queries agree. */
const SHOOT_COLUMNS =
  'id, client_name, client_contact, date, status, location_address, location_note, location_attachment, raw_files_url, finished_photos_url'

export type CreateShootInput = {
  clientName: string
  clientContact: string
  date: string // ISO date, YYYY-MM-DD
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
      client_name: input.clientName.trim(),
      client_contact: input.clientContact.trim(),
      date: input.date,
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
  client_name: string
  client_contact: string
  date: string
  status: string
  location_address: string | null
  location_note: string | null
  location_attachment: string | null
  raw_files_url: string | null
  finished_photos_url: string | null
}

function toShoot(row: ShootRow): Shoot {
  return {
    id: row.id,
    clientName: row.client_name,
    clientContact: row.client_contact,
    date: row.date,
    status: row.status as ShootStatus,
    locationAddress: row.location_address,
    locationNote: row.location_note,
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
      date: input.date,
      location_address: input.locationAddress?.trim() || null,
      location_note: input.locationNote?.trim() || null,
      location_attachment: input.locationAttachment,
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
