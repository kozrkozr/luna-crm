import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
/**
 * EP-07 foundation at the data layer: the numbers of file hosting in one row
 * (`ADR-020`; owner, 2026-10-22: the retention period changes without code).
 *
 * Who may see them: the functions (service role) read the whole row; a signed-in
 * account reads the three its copy needs through `file_hosting_limits()`; an
 * anonymous caller — the link view — reads nothing.
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const anon = createClient(process.env.SB_URL, process.env.SB_ANON, opts)

const user = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
const email = `files-settings-${Date.now()}@example.com`
await user.auth.signUp({ email, password: 'testpass123', options: { data: { name: 'Settings', role: 'Фотограф' } } })
await user.auth.signInWithPassword({ email, password: 'testpass123' })

// ---------- the defaults (`ADR-020` decisions 3–5) ----------
let res = await service.from('file_hosting_settings').select('*')
const row = res.data?.[0]
ok('one settings row', res.data?.length === 1, JSON.stringify(res))
ok('30 days retention, 3 days warning (ADR-020 decisions 3, 4)', row?.retention_days === 30 && row?.warning_days === 3, JSON.stringify(row))
ok('200 GB quota per account (decision 5)', row?.quota_bytes === 200_000_000_000, JSON.stringify(row))
ok('download URLs work for an hour', row?.download_url_seconds === 3600, JSON.stringify(row))

// ---------- the functions read, never write ----------
// (One row only is the table's `check (id)`; the owner edits it as `postgres`.)
res = await service.from('file_hosting_settings').update({ retention_days: 1 }).eq('id', true).select()
ok('the service role cannot change the settings', res.error?.code === '42501', JSON.stringify(res.error))

// ---------- who reads what ----------
res = await user.from('file_hosting_settings').select('*')
ok('a signed-in account cannot read the table', res.error !== null || res.data?.length === 0, JSON.stringify(res))
res = await anon.from('file_hosting_settings').select('*')
ok('an anonymous caller cannot read the table', res.error !== null || res.data?.length === 0, JSON.stringify(res))

res = await user.rpc('file_hosting_limits')
ok('a signed-in account reads retention, warning and quota for its copy',
  res.data?.[0]?.retention_days === 30 && res.data?.[0]?.quota_bytes === 200_000_000_000 && !('download_url_seconds' in (res.data?.[0] ?? {})),
  JSON.stringify(res))
res = await anon.rpc('file_hosting_limits')
ok('an anonymous caller cannot call file_hosting_limits()', res.error !== null, JSON.stringify(res.error))

res = await user.from('file_hosting_settings').update({ retention_days: 1 }).eq('id', true).select()
ok('a signed-in account cannot change the settings', res.error !== null || res.data?.length === 0, JSON.stringify(res))
