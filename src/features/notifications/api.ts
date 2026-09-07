import { supabase } from '../../lib/supabase/client'

/**
 * The photographer's notifications — today, only "a crew member answered".
 *
 * Migration `20260906120000`. **No story covers notifications**; the owner asked
 * for them on 2026-09-06 and scoped them to this one event. `US-008` gives a
 * crew member the ability to answer and says nothing about telling anybody.
 *
 * Rows are written by a database trigger and by nothing else — no caller holds
 * INSERT, not even the service role, so this module reads and marks read and
 * has no create function by design.
 */

/** The two events that exist. Mirrors the `notification_kind` enum. */
export type NotificationKind = 'crew_confirmed' | 'crew_declined'

export type ShootNotification = {
  id: string
  kind: NotificationKind
  read: boolean
  createdAt: string
  /** Who answered. */
  crewName: string
  crewRole: string
  /** Which shoot, as the list names it. */
  shootId: string
  shootDate: string
  clientName: string
}

/*
  `!inner` on both joins, and that is rule 3 rather than a preference.

  `crew_members`'s and `shoots`'s SELECT policies carry `removed_at is null` and
  `deleted_at is null` in their own USING clauses (`20260826200000`,
  `20260825120000`), so a notification about somebody since removed — or on a
  shoot since deleted — comes back with a null join rather than a row. An inner
  join drops it instead of rendering a notification with no name on it.

  That is a decision as well as a mechanism: **removing a crew member removes
  their notification.** `ADR-014` makes `removed_at` how access is revoked, and a
  bell that still announces somebody the photographer took off the shoot is the
  resurrection rule 3 exists to prevent. The event is kept in the table; it just
  stops being shown, which is the same treatment the shoot itself gets.
*/
const NOTIFICATION_COLUMNS =
  'id, kind, read_at, created_at, crew_members!inner(name, role), shoots!inner(id, date, clients(name))'

type Row = {
  id: string
  kind: NotificationKind
  read_at: string | null
  created_at: string
  crew_members: { name: string; role: string } | { name: string; role: string }[] | null
  shoots:
    | { id: string; date: string; clients: { name: string } | { name: string }[] | null }
    | { id: string; date: string; clients: { name: string } | { name: string }[] | null }[]
    | null
}

/** PostgREST hands an embedded row back as an object or a one-element array. */
function one<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function toNotification(row: Row): ShootNotification | null {
  const crew = one(row.crew_members)
  const shoot = one(row.shoots)
  // Unreachable through `!inner`, and typed as reachable because PostgREST's
  // types cannot express the join's own guarantee. Dropped rather than faked.
  if (!crew || !shoot) return null
  return {
    id: row.id,
    kind: row.kind,
    read: row.read_at !== null,
    createdAt: row.created_at,
    crewName: crew.name,
    crewRole: crew.role,
    shootId: shoot.id,
    shootDate: shoot.date,
    clientName: one(shoot.clients)?.name ?? '',
  }
}

/**
 * Every notification, newest first. Null on failure, which the screen shows as
 * its error state rather than as an empty list.
 *
 * No `eq('user_id', …)`: the RLS policy is `user_id = auth.uid()`, so asking
 * again here would be a second copy of the rule that matters — and the copy
 * that could be forgotten.
 */
export async function listNotifications(): Promise<ShootNotification[] | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false })

  if (error || !data) return null
  return (data as Row[]).map(toNotification).filter((n): n is ShootNotification => n !== null)
}

/**
 * How many are unread — what the bell's dot means.
 *
 * `head: true` with an exact count, so this is one round trip that transfers no
 * rows: the home screen asks on every focus and never needs the bodies.
 */
export async function unreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error || count === null) return 0
  return count
}

/**
 * Mark everything read.
 *
 * All of them rather than one at a time: the screen that shows them shows them
 * all at once, so anything still unread after it has been opened would be
 * unread for no reason a reader could see.
 *
 * `is('read_at', null)` so a second visit writes nothing — the update is
 * idempotent, and `read_at` keeps the moment it was first read rather than the
 * last time the screen was opened.
 *
 * `read_at` is the only column granted to `authenticated` on this table
 * (`20260906120000`), so this is the only write the app can make to it.
 */
export async function markNotificationsRead(): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  return !error
}
