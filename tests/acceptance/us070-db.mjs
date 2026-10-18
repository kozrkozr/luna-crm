import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-070 at the data layer: a shoot's own currency (`ADR-027`) — the column, the
 * five it may hold, and the trigger that fills it from the account when a build
 * predating the story sends none (AC-2).
 *
 * Supabase only. The form, the sheet and «Статистика» are the screens'; the
 * per-currency arithmetic lives in `src/features/shoots/stats.ts`.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const stamp = Date.now()

const account = async (tag, currency) => {
  const client = anon()
  const email = `us070-${tag}-${stamp}@example.com`
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role: 'Фотограф', currency } },
  })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  await grantAccess(data.user.id)
  return { client, id: data.user.id }
}

const photo = await account('photo', 'PLN')
const other = await account('other', 'UAH')
const clientId = (await photo.client.from('clients')
  .insert({ creator_id: photo.id, name: 'Клієнт' })
  .select('id').single()).data.id
const insert = (extra) => photo.client.from('shoots')
  .insert({ creator_id: photo.id, client_id: clientId, date: '2026-11-10', ...extra })
  .select('id, currency').single()
const read = async (id) =>
  (await photo.client.from('shoots').select('price, prepayment, currency').eq('id', id).single()).data

// ---------- AC-2 — a new shoot starts in the account's currency ----------
let res = await insert({ price: 1000 })
ok('AC-2 a shoot sent without a currency takes the account\'s (an old build)', res.data?.currency === 'PLN', JSON.stringify(res))

// ---------- AC-3 — chosen on the form ----------
res = await insert({ price: 500, prepayment: 200, currency: 'USD' })
const usd = res.data?.id
ok('AC-3 a shoot sent with a currency keeps it', res.data?.currency === 'USD', JSON.stringify(res))

// ---------- AC-1 — the five ----------
res = await insert({ currency: 'GBP' })
ok('AC-1 a currency outside the five is refused', res.error !== null, JSON.stringify(res.error))

// ---------- AC-4 — changing it keeps the numbers ----------
await photo.client.from('shoots').update({ currency: 'EUR' }).eq('id', usd)
let row = await read(usd)
ok('AC-4 a changed currency keeps price and prepayment', row.currency === 'EUR' && row.price === 500 && row.prepayment === 200, JSON.stringify(row))
res = await photo.client.from('shoots').update({ currency: null }).eq('id', usd)
ok('AC-4 a shoot cannot be left without a currency', res.error !== null, JSON.stringify(res.error))

// ---------- AC-6 — the account's change leaves existing shoots alone ----------
await photo.client.from('users').update({ currency: 'CZK' }).eq('id', photo.id)
row = await read(usd)
ok('AC-6 changing the account\'s currency leaves an existing shoot\'s', row.currency === 'EUR', JSON.stringify(row))
res = await insert({})
ok('AC-6 and a new shoot then starts in the new one', res.data?.currency === 'CZK', JSON.stringify(res))

// ---------- AC-8 — the creator's only ----------
const seen = (await other.client.from('shoots').select('currency').eq('id', usd)).data
ok('AC-8 another account reads nothing of the shoot', Array.isArray(seen) && seen.length === 0, JSON.stringify(seen))
