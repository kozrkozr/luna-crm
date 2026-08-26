import { supabase } from '../../lib/supabase/client'

export type ShootStatus = 'new' | 'finished'

export type Shoot = {
  id: string
  clientName: string
  clientContact: string
  date: string
  status: ShootStatus
  locationAddress: string | null
}

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
    .select('id, client_name, client_contact, date, status, location_address')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    clientName: data.client_name,
    clientContact: data.client_contact,
    date: data.date,
    status: data.status as ShootStatus,
    locationAddress: data.location_address,
  }
}

/**
 * The creator's shoots. No `deleted_at is null` filter is written here and none
 * can be forgotten: the RLS policy carries it (ADR-014, CLAUDE.md rule 3).
 */
export async function listShoots(): Promise<Shoot[] | null> {
  const { data, error } = await supabase
    .from('shoots')
    .select('id, client_name, client_contact, date, status, location_address')
    .order('date', { ascending: true })

  if (error || !data) return null

  return data.map((row) => ({
    id: row.id,
    clientName: row.client_name,
    clientContact: row.client_contact,
    date: row.date,
    status: row.status as ShootStatus,
    locationAddress: row.location_address,
  }))
}
