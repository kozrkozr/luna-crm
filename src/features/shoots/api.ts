import { supabase } from '../../lib/supabase/client'

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
}

/** Every column the app reads for a Shoot, in one place so the two queries agree. */
const SHOOT_COLUMNS =
  'id, client_name, client_contact, date, status, location_address, location_note, location_attachment'

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
  }
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
    })
    .eq('id', id)

  return !error
}
