import { createClient } from '@supabase/supabase-js'
/**
 * US-052 — without access the database refuses every create, edit and delete
 * (`20261010120000_view_mode.sql`), so a suite whose accounts make shoots has to
 * give them access first, the way the RevenueCat webhook would: a row in
 * `account_access` under the service role (`S-7`).
 *
 * `us052-db` tests the refusals themselves; every other suite just calls this
 * after signing an account up.
 */
const service = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })

export async function grantAccess(userId, expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()) {
  const { error } = await service.from('account_access').upsert({
    user_id: userId, entitlement: 'base', expires_at: expiresAt, product_id: 'com.lunashoots.ios.base.monthly',
    period_type: 'normal', store: 'test_store', is_sandbox: true, will_renew: true,
  })
  if (error) throw new Error(`grantAccess: ${error.message}`)
}
