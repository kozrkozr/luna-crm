import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-042 at the data layer: the delivery deadline's two columns, the rules the
 * database holds for them, and the trigger that moves the deadline with the
 * shoot (AC-8).
 *
 * Supabase only. The chip, the progress and the editor are the screen's, and
 * their rules live in `src/features/shoots/deadline.ts`.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const stamp = Date.now()

const account = async (tag) => {
  const client = anon()
  const email = `us042-${tag}-${stamp}@example.com`
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role: 'Фотограф' } },
  })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  await grantAccess(data.user.id)
  return { client, id: data.user.id }
}

const shootFor = async (photo, date) => {
  const clientId = (await photo.client.from('clients')
    .insert({ creator_id: photo.id, name: 'Клієнт' })
    .select('id').single()).data.id
  return (await photo.client.from('shoots')
    .insert({ creator_id: photo.id, client_id: clientId, date })
    .select('id').single()).data.id
}

const photo = await account('photo')
const other = await account('other')
const read = async (id) =>
  (await photo.client.from('shoots').select('date, delivery_due, delivered_at').eq('id', id).single()).data
const write = (id, patch) => photo.client.from('shoots').update(patch).eq('id', id)

// ---------- AC-1 — optional ----------
const shoot = await shootFor(photo, '2026-11-10')
let row = await read(shoot)
ok('AC-1 a new shoot has no deadline and no mark', row.delivery_due === null && row.delivered_at === null, JSON.stringify(row))

// ---------- AC-3 — not before the shoot ----------
let res = await write(shoot, { delivery_due: '2026-11-09' })
ok('AC-3 a deadline before the shoot is refused', res.error !== null, JSON.stringify(res.error))
res = await write(shoot, { delivery_due: '2026-11-10' })
ok('AC-3 the shoot day itself is allowed', res.error === null, JSON.stringify(res.error))
res = await write(shoot, { delivery_due: '2026-11-17' })
row = await read(shoot)
ok('AC-3 a deadline after the shoot is saved', row.delivery_due === '2026-11-17', JSON.stringify(row))

// ---------- AC-7 — no mark without a deadline ----------
const bare = await shootFor(photo, '2026-11-10')
res = await write(bare, { delivered_at: new Date().toISOString() })
ok('AC-7 a delivered mark without a deadline is refused', res.error !== null, JSON.stringify(res.error))

// ---------- AC-8 — the deadline follows the date ----------
await write(shoot, { date: '2026-11-20' })
row = await read(shoot)
ok('AC-8 moving the shoot later moves the deadline by as many days', row.delivery_due === '2026-11-27', JSON.stringify(row))
await write(shoot, { date: '2026-11-05' })
row = await read(shoot)
ok('AC-8 and earlier, in the other direction', row.delivery_due === '2026-11-12', JSON.stringify(row))
await write(shoot, { date: '2026-11-06', delivery_due: '2026-11-30' })
row = await read(shoot)
ok('AC-8 a write that sets the deadline itself is taken at its word', row.delivery_due === '2026-11-30', JSON.stringify(row))
await write(bare, { date: '2026-11-15' })
row = await read(bare)
ok('AC-8 a shoot without a deadline stays without one', row.delivery_due === null, JSON.stringify(row))

// ---------- AC-1 — the creator's only ----------
const seen = (await other.client.from('shoots').select('delivery_due').eq('id', shoot)).data
ok('AC-1 another account reads nothing of the shoot', Array.isArray(seen) && seen.length === 0, JSON.stringify(seen))
