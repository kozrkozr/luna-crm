import './env.mjs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-055 at the data layer: the owner's beta list and launch date, and what
 * they do to `has_access()`.
 *
 * Both tables are edited by the owner in the dashboard as `postgres`, never
 * through the API — so this suite edits them the same way, with `psql` in the
 * local database container, and checks that the API cannot.
 *
 * Supabase only. The launch row is shared by the whole database; the suite
 * sets it and puts back what was there.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const service = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const stamp = Date.now()
const sql = (q) =>
  execFileSync('docker', ['exec', 'supabase_db_luna-crm', 'psql', '-U', 'postgres', '-Atc', q], { encoding: 'utf8' }).trim()

const account = async (tag) => {
  const client = anon()
  const email = `us055-${tag}-${stamp}@example.com`
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role: 'photographer' } },
  })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  return { client, id: data.user.id }
}
const canCreate = async (a) =>
  (await a.client.from('clients').insert({ creator_id: a.id, name: 'К' })).error === null

const before = sql('select launched_on from launch')
const setLaunch = (date) => sql(`delete from launch; ${date ? `insert into launch (launched_on) values ('${date}');` : ''}`)
const iso = (d) => d.toISOString().slice(0, 10)
const DAY = 864e5

try {
  const picked = await account('picked')
  const other = await account('other')
  sql(`insert into beta_testers (user_id, note) values ('${picked.id}', 'us055-db')`)

  setLaunch(null)
  ok('AC-1 no launch date yet → no beta access', !(await canCreate(picked)))

  setLaunch(iso(new Date(Date.now() - 10 * DAY)))
  ok('AC-1 a picked tester has access after the launch', await canCreate(picked))
  ok('AC-1 a tester not on the list does not', !(await canCreate(other)))
  const until = (await picked.client.rpc('beta_access_until')).data
  const expected = new Date(Date.now() - 10 * DAY); expected.setMonth(expected.getMonth() + 3)
  ok('AC-1 until the launch date plus 3 months', until?.slice(0, 10) === iso(expected), JSON.stringify(until))
  ok('AC-1 the others see no beta end', (await other.client.rpc('beta_access_until')).data === null)

  setLaunch(iso(new Date(Date.now() - 100 * DAY)))
  ok('AC-3 three months on, the picked tester is in view mode', !(await canCreate(picked)))

  await grantAccess(picked.id)
  ok('AC-4 a subscription still gives access after the beta ended', await canCreate(picked))

  // AC-1a — what RevenueCat writes never touches the list
  await service.from('account_access').delete().eq('user_id', picked.id)
  ok('AC-1a RevenueCat removing its rows leaves the list', sql(`select count(*) from beta_testers where user_id = '${picked.id}'`) === '1')

  const r1 = await picked.client.from('beta_testers').select('*')
  const r2 = await picked.client.from('beta_testers').insert({ user_id: picked.id })
  const r3 = await other.client.from('launch').select('*')
  ok('the API cannot read or write the list or the launch date', r1.error !== null && r2.error !== null && r3.error !== null,
    JSON.stringify([r1.error?.code, r2.error?.code, r3.error?.code]))
} finally {
  setLaunch(before || null)
}
