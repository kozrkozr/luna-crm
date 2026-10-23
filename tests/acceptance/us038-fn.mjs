import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-038 at the server: the creator deletes one file or all of a shoot's
 * files before the date — gone from the store, from the client's payload and
 * from the quota (AC-1), the date kept (AC-3), nobody else allowed (AC-4).
 *
 * Needs `us036-fn`'s servers.
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const BASE = process.env.SB_URL.replace(/\/+$/, '')
const stamp = Date.now()

async function account(tag) {
  const client = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
  const email = `us038-${tag}-${stamp}@example.com`
  const { data } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: tag, role: 'Фотограф' } } })
  const { data: signed } = await client.auth.signInWithPassword({ email, password: 'testpass123' })
  await grantAccess(data.user.id)
  return { client, id: data.user.id, jwt: signed.session.access_token }
}
const call = async (jwt, action, args) => {
  const res = await fetch(`${BASE}/functions/v1/files`, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
async function upload(who, shootId, name, size = 100) {
  const { body: start } = await call(who.jwt, 'start', { shootId, kind: 'raw', name, size })
  const { body: { urls } } = await call(who.jwt, 'signParts', { fileId: start.fileId, partNumbers: [1] })
  await (await fetch(urls[1], { method: 'PUT', body: new Uint8Array(size) })).arrayBuffer()
  await call(who.jwt, 'complete', { fileId: start.fileId })
  return start.fileId
}

const photo = await account('photo')
const other = await account('other')
const clientRow = (await photo.client.from('clients').insert({ creator_id: photo.id, name: 'Оля' }).select('id').single()).data.id
const shoot = (await photo.client.from('shoots').insert({ creator_id: photo.id, client_id: clientRow, date: '2026-11-27' }).select('id').single()).data.id
const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await photo.client.from('access_links').insert({ token, shoot_id: shoot, audience: 'client' })
const clientFiles = async () =>
  (await (await fetch(`${BASE}/functions/v1/link-gateway?token=${token}`, {
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${process.env.SB_ANON}` },
  })).json()).files
const status = async (url) => {
  const res = await fetch(url, { headers: { range: 'bytes=0-0' } })
  await res.arrayBuffer()
  return res.status
}
const usage = async () => (await photo.client.rpc('my_files_usage')).data

const a = await upload(photo, shoot, 'a.CR3', 100)
const b = await upload(photo, shoot, 'b.CR3', 200)
const c = await upload(photo, shoot, 'c.CR3', 300)
const urls = Object.fromEntries((await clientFiles()).raw.map((f) => [f.name, f.url]))
const date = (await service.from('shoots').select('files_delete_at').eq('id', shoot).single()).data.files_delete_at

// ---------- AC-4 — only the creator ----------
let r = await call(other.jwt, 'delete', { fileId: a })
ok('AC-4 another account cannot delete a file', r.status === 404, JSON.stringify(r.body))
r = await call(other.jwt, 'deleteAll', { shootId: shoot })
ok('AC-4 another account cannot delete all of them', r.status === 404, JSON.stringify(r.body))
r = await call(process.env.SB_ANON, 'delete', { fileId: a })
ok('AC-4 no account (a crew or client link) is refused', r.status === 401, JSON.stringify(r.body))
ok('AC-4 … and all three files are still there', (await clientFiles()).raw.length === 3)

// ---------- AC-1 + AC-2 — one file ----------
r = await call(photo.jwt, 'delete', { fileId: a })
ok('AC-2 the creator deletes a single file', r.status === 200, JSON.stringify(r.body))
ok('AC-1 it is gone from the store', (await status(urls['a.CR3'])) === 404)
ok('AC-1 the client no longer sees it, the others stay', (await clientFiles()).raw.map((f) => f.name).join() === 'b.CR3,c.CR3')
ok('AC-1 it no longer counts against the quota', (await usage()) === 500, String(await usage()))

// ---------- AC-2 — all at once, an upload in progress included ----------
const pending = (await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'half.CR3', size: 50 })).body.fileId
r = await call(photo.jwt, 'deleteAll', { shootId: shoot })
ok('AC-2 the creator deletes every file of the shoot at once', r.status === 200 && r.body.deleted === 3, JSON.stringify(r.body))
ok('AC-1 all of them gone from the store', (await status(urls['b.CR3'])) === 404 && (await status(urls['c.CR3'])) === 404)
ok('AC-1 nothing left in the quota or the table', (await usage()) === 0 &&
  (await service.from('shoot_files').select('id').eq('shoot_id', shoot)).data.length === 0)
ok('AC-1 the client sees «Файли видалено» (US-024 AC-5)', (await clientFiles()).deleted === true)
ok('the upload in progress went too', !(await service.from('shoot_files').select('id').eq('id', pending)).data.length)

// ---------- AC-3 — the date stays ----------
const after = (await service.from('shoots').select('files_delete_at').eq('id', shoot).single()).data.files_delete_at
ok('AC-3 deleting everything leaves the date', after === date, `${after} vs ${date}`)
await upload(photo, shoot, 'again.CR3', 10)
const again = (await service.from('shoots').select('files_delete_at').eq('id', shoot).single()).data.files_delete_at
ok('AC-3 a new upload keeps the original date', again === date, `${again} vs ${date}`)

// ---------- ADR-014 ----------
await photo.client.rpc('soft_delete_shoot', { shoot_id: shoot })
r = await call(photo.jwt, 'deleteAll', { shootId: shoot })
ok('ADR-014 a deleted shoot is not found (the sweeper takes its files)', r.status === 404, JSON.stringify(r.body))
