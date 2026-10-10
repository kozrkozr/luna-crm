import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
/**
 * US-051 at the data layer: `users.paywall_shown_at`, which makes the paywall
 * show itself once per account (AC-1) and never again on its own (AC-5).
 *
 * Supabase only. The screen and the store are the device's.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const stamp = Date.now()

const client = anon()
const email = `us051-${stamp}@example.com`
const { data } = await client.auth.signUp({
  email, password: 'testpass123', options: { data: { name: 'n', role: 'photographer' } },
})
await client.auth.signInWithPassword({ email, password: 'testpass123' })
const id = data.user.id

let row = (await client.from('users').select('paywall_shown_at').single()).data
ok('AC-1 a new account has not been shown the paywall', row?.paywall_shown_at === null, JSON.stringify(row))

const res = await client.from('users').update({ paywall_shown_at: new Date().toISOString() }).eq('id', id)
ok('AC-1 the account can mark it shown — without access (US-052 AC-4)', res.error === null, JSON.stringify(res.error))

row = (await client.from('users').select('paywall_shown_at').single()).data
ok('AC-5 once marked, it stays marked', row?.paywall_shown_at !== null, JSON.stringify(row))
