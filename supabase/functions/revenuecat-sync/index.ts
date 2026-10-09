/**
 * `US-052` AC-7 — "full access returns at once" after a purchase.
 *
 * The app calls this right after RevenueCat reports a purchase or a restore,
 * with the signed-in user's JWT. It re-reads **that user** from RevenueCat and
 * records them — the same code the webhook runs (`_shared/revenuecat.ts`) — so
 * access no longer waits on the webhook, which on the device once took about a
 * minute.
 *
 * Only ever the caller's own account: the id comes from the verified JWT, never
 * from the request. Nothing here grants access the store did not report.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { syncAccount } from '../_shared/revenuecat.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const jwt = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const { data, error: authError } = await db.auth.getUser(jwt)
  if (authError || !data.user) return new Response('unauthorized', { status: 401 })

  const error = await syncAccount(db, data.user.id)
  if (error) {
    console.error(`sync ${data.user.id}: ${error}`)
    return new Response('could not sync', { status: 502 })
  }
  return new Response('ok')
})
