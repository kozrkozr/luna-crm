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
import { syncAccount } from '../_shared/revenuecat.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    /*
      The account is checked BEFORE RevenueCat is asked: `GET /v1/subscribers`
      creates the customer it is asked about. The dashboard's test event carries
      a random uuid, and asking about it left a phantom customer in RevenueCat
      (found on the device run, 2026-10-09). An id with no Luna account — the
      test event, another environment's user, a deleted account — is ignored.
    */
    const { data: user } = await db.from('users').select('id').eq('id', userId).maybeSingle()
    if (!user) {
      console.log(`no account ${userId} here — ignored`)
      continue
    }
    const error = await syncAccount(db, userId)
    if (error) {
      console.error(`record ${userId}: ${error}`)
      return new Response('could not record', { status: 500 })
    }
  }

  return new Response('ok')
})
