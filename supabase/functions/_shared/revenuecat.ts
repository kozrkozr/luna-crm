/**
 * `S-7` / `US-052` — reading a customer's access from RevenueCat and writing it
 * to `account_access`. Shared by the two ways access gets recorded:
 *
 * - `revenuecat-webhook` — RevenueCat calls it on every change, including the
 *   ones that happen with the app closed (renewals, cancellations, expiry);
 * - `revenuecat-sync` — the app calls it right after a purchase or restore, so
 *   access returns at once instead of whenever the webhook lands (`S-7` F-3;
 *   on the device, once, about a minute — `US-052` AC-7 says "at once").
 *
 * Both read the whole customer back from `GET /v1/subscribers` and replace the
 * account's rows, so the two can run in any order, any number of times.
 */
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

type Entitlement = {
  expires_date: string | null
  grace_period_expires_date: string | null
  product_identifier: string
}
type Subscription = {
  period_type: string
  store: string
  is_sandbox: boolean
  unsubscribe_detected_at: string | null
}
type Subscriber = {
  entitlements: Record<string, Entitlement>
  subscriptions: Record<string, Subscription>
}

export async function fetchSubscriber(userId: string): Promise<Subscriber | null> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { authorization: `Bearer ${Deno.env.get('REVENUECAT_SECRET_KEY')}` },
  })
  if (!res.ok) {
    console.error(`GET subscribers ${userId}: ${res.status} ${await res.text()}`)
    return null
  }
  return (await res.json()).subscriber as Subscriber
}

/**
 * Replaces the account's rows with what RevenueCat reports: one per
 * entitlement it has ever held, and none for one it no longer lists.
 */
export async function record(db: SupabaseClient, userId: string, subscriber: Subscriber): Promise<string | null> {
  const rows = Object.entries(subscriber.entitlements).map(([entitlement, e]) => {
    const subscription = subscriber.subscriptions[e.product_identifier]
    return {
      user_id: userId,
      entitlement,
      expires_at: e.grace_period_expires_date ?? e.expires_date,
      product_id: e.product_identifier,
      period_type: subscription?.period_type ?? 'normal',
      store: subscription?.store ?? 'unknown',
      is_sandbox: subscription?.is_sandbox ?? false,
      will_renew: subscription ? subscription.unsubscribe_detected_at === null : false,
      updated_at: new Date().toISOString(),
    }
  })

  if (rows.length > 0) {
    const { error } = await db.from('account_access').upsert(rows)
    if (error) return error.message
  }

  const keep = rows.map((r) => r.entitlement)
  let stale = db.from('account_access').delete().eq('user_id', userId)
  if (keep.length > 0) stale = stale.not('entitlement', 'in', `(${keep.join(',')})`)
  const { error } = await stale
  return error?.message ?? null
}

/** Re-reads one account from RevenueCat and records it. Null on success. */
export async function syncAccount(db: SupabaseClient, userId: string): Promise<string | null> {
  const subscriber = await fetchSubscriber(userId)
  if (!subscriber) return 'revenuecat unavailable'
  return await record(db, userId, subscriber)
}
