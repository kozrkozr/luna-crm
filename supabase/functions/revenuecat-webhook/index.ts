/**
 * S-7 — RevenueCat's webhook records an account's access (`ADR-023`).
 *
 * RevenueCat calls this on every purchase, renewal, cancellation, expiry and
 * transfer. The event itself is used only to learn **whose** access changed:
 * the access is then read back from RevenueCat's REST API and written to
 * `account_access` whole. That is RevenueCat's own recommendation, and it is
 * what makes the function indifferent to event types and to events arriving
 * out of order or retried — the last call always writes the current truth.
 *
 * The RevenueCat customer id is the Luna account id (`ADR-023` decision 10),
 * so `app_user_id` is a `users.id`. Anything else — the dashboard's test event,
 * an anonymous id — is acknowledged and ignored; a non-2xx would only make
 * RevenueCat retry it five times.
 *
 * Secrets (`supabase secrets set`):
 * - `REVENUECAT_WEBHOOK_AUTH` — the exact Authorization header value entered
 *   in RevenueCat's webhook settings. Without it anyone could make this
 *   function re-read a customer; harmless, but not ours to allow.
 * - `REVENUECAT_SECRET_KEY` — a RevenueCat secret API key (v1), for
 *   `GET /v1/subscribers`.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')
  if (!expected || req.headers.get('authorization') !== expected) {
    return new Response('unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const event = body?.event
  if (!event) return new Response('no event', { status: 400 })

  /*
    A TRANSFER moves a purchase between customers and carries no
    `app_user_id` — both sides change, so both are re-read.
  */
  const ids = new Set<string>(
    [event.app_user_id, ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter(
      (id: unknown): id is string => typeof id === 'string' && UUID.test(id),
    ),
  )

  console.log(`event ${event.type} ${event.environment ?? ''} → ${[...ids].join(', ') || 'no account'}`)

  for (const userId of ids) {
    const subscriber = await fetchSubscriber(userId)
    if (!subscriber) return new Response('revenuecat unavailable', { status: 502 })
    const error = await record(userId, subscriber)
    if (error) {
      console.error(`record ${userId}: ${error}`)
      return new Response('could not record', { status: 500 })
    }
  }

  return new Response('ok')
})

async function fetchSubscriber(userId: string): Promise<Subscriber | null> {
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
async function record(userId: string, subscriber: Subscriber): Promise<string | null> {
  // An id that is a uuid but no Luna account — another environment's user, a
  // deleted account. The foreign key would refuse it; skip instead.
  const { data: user } = await db.from('users').select('id').eq('id', userId).maybeSingle()
  if (!user) {
    console.log(`no account ${userId} here — ignored`)
    return null
  }

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
