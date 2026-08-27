import { supabase } from '../../lib/supabase/client'
import type { CrewResponse } from '../crew/api'

/**
 * One shoot the signed-in user is ON, rather than one they created (`US-009`).
 *
 * There is no client name here, and that is not an omission. The crew link
 * payload gives a crew member the date, the location, the references and the
 * crew — never the client (`US-007`). The schedule shows the same person the
 * same fields, so it cannot become a way around that.
 */
export type CrewShoot = {
  shootId: string
  date: string
  locationAddress: string | null
  /** Their role on this shoot, which is why they are on the list. */
  role: string
  /** Their own answer, from `US-008`. */
  response: CrewResponse
  /**
   * Their link (`US-006`), or null if the photographer has not created one.
   *
   * It is what makes a row openable: a crew member cannot read the shoot row,
   * so the only view of it they have is the one their link already gives them.
   */
  token: string | null
}

/**
 * `US-009` AC-1 — every shoot they are on, whoever created it.
 *
 * Goes through `my_crew_shoots`, a SECURITY DEFINER function, for the reason
 * given in its migration: `shoots_select_own` restricts reads to the creator,
 * and widening that policy to "or I am crew here" would hand a crew member
 * `client_name` and `client_contact` along with it. The function returns only
 * the columns they are already entitled to.
 *
 * Soft deletes are filtered inside it (`ADR-014`, CLAUDE.md rule 3): a removed
 * crew member loses that row, and a deleted shoot leaves every schedule.
 *
 * AC-2 needs no code. A crew member who never registered has no account, so
 * there is nobody for this to run as — the view does not exist for them rather
 * than existing and being empty.
 */
export async function listCrewShoots(): Promise<CrewShoot[] | null> {
  const { data, error } = await supabase.rpc('my_crew_shoots')
  if (error || !data) return null

  return (data as Array<{
    shoot_id: string
    date: string
    location_address: string | null
    role: string
    response: string
    token: string | null
  }>).map((row) => ({
    shootId: row.shoot_id,
    date: row.date,
    locationAddress: row.location_address,
    role: row.role,
    response: row.response as CrewResponse,
    token: row.token,
  }))
}
