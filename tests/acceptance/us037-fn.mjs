import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-037 AC-3 and the owner's two sweeper rules (plan #12, #13): the
 * `files-sweeper` function deletes what is due from the store and from the
 * table, and leaves everything else alone.
 *
 * Needs `us036-fn`'s servers. The sweeper is called here the way `pg_cron`
 * calls it — with `x-sweeper-secret` — instead of waiting for 03:15.
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const BASE = process.env.SB_URL.replace(/\/+$/, '')
const SECRET = 'local-sweeper-secret' // supabase/functions/local-s3.env

const client = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
const email = `us037-${Date.now()}@example.com`
const { data: acc } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: 'Фото', role: 'Фотограф' } } })
const { data: signed } = await client.auth.signInWithPassword({ email, password: 'testpass123' })
await grantAccess(acc.user.id)

const files = async (action, args) =>
  (await fetch(`${BASE}/functions/v1/files`, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${signed.session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  })).json()

/** Uploads a file and returns a presigned GET to its object, for checking it is gone. */
async function upload(shootId, name, size = 100) {
  const start = await files('start', { shootId, kind: 'raw', name, size })
  const { urls } = await files('signParts', { fileId: start.fileId, partNumbers: [1] })
  await (await fetch(urls[1], { method: 'PUT', body: new Uint8Array(size).fill(9) })).arrayBuffer()
  await files('complete', { fileId: start.fileId })
  return start.fileId
}

const clientRow = (await client.from('clients').insert({ creator_id: acc.user.id, name: 'Оля' }).select('id').single()).data.id
const newShoot = async () =>
  (await client.from('shoots').insert({ creator_id: acc.user.id, client_id: clientRow, date: '2026-11-26' }).select('id').single()).data.id

// A download URL per file, signed while the object exists — afterwards it must 404.
const clientToken = async (shootId) => {
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  await client.from('access_links').insert({ token, shoot_id: shootId, audience: 'client' })
  return token
}
const payloadUrls = async (token) => {
  const p = await (await fetch(`${BASE}/functions/v1/link-gateway?token=${token}`, {
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${process.env.SB_ANON}` },
  })).json()
  return (p.files?.raw ?? []).map((f) => f.url)
}
const status = async (url) => {
  const res = await fetch(url, { headers: { range: 'bytes=0-0' } })
  await res.arrayBuffer()
  return res.status
}
const sweep = async (secret = SECRET) => {
  const res = await fetch(`${BASE}/functions/v1/files-sweeper`, { method: 'POST', headers: { 'x-sweeper-secret': secret } })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}
const rows = async (shootId) => (await service.from('shoot_files').select('id, status').eq('shoot_id', shootId)).data

// ---------- the cases ----------
const expired = await newShoot()
await upload(expired, 'old-1.CR3')
await upload(expired, 'old-2.CR3')
const expiredUrls = await payloadUrls(await clientToken(expired))
await service.from('shoots').update({ files_delete_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', expired)

const live = await newShoot()
await upload(live, 'keep.CR3')
const liveUrls = await payloadUrls(await clientToken(live))

const removed = await newShoot()
await upload(removed, 'gone-with-shoot.CR3')
const removedUrls = await payloadUrls(await clientToken(removed))
await client.rpc('soft_delete_shoot', { shoot_id: removed })

const uploads = await newShoot()
const stale = await files('start', { shootId: uploads, kind: 'raw', name: 'stale.CR3', size: 10 })
const fresh = await files('start', { shootId: uploads, kind: 'raw', name: 'fresh.CR3', size: 10 })
await service.from('shoot_files').update({ created_at: new Date(Date.now() - 8 * 86400_000).toISOString() }).eq('id', stale.fileId)

const usageBefore = (await client.rpc('my_files_usage')).data

// ---------- who may call it ----------
let r = await sweep('wrong')
ok('a call without the shared secret is refused', r.status === 401, String(r.status))

// ---------- AC-3 + #12 + #13 ----------
r = await sweep()
ok('the sweep runs', r.status === 200 && r.body.failed === 0, JSON.stringify(r.body))
ok('AC-3 a shoot past its date loses every file row', (await rows(expired)).length === 0, JSON.stringify(await rows(expired)))
ok('AC-3 … and the objects are gone from the store', (await Promise.all(expiredUrls.map(status))).every((s) => s === 404), JSON.stringify(await Promise.all(expiredUrls.map(status))))
const usageAfter = (await client.rpc('my_files_usage')).data
ok('AC-3 the space is back in the quota', usageBefore - usageAfter === 200 + 10, `${usageBefore} → ${usageAfter}`)
ok('AC-3 the date stays, so the client sees «Файли видалено» (US-024 AC-5)',
  !!(await service.from('shoots').select('files_delete_at').eq('id', expired).single()).data.files_delete_at)

ok('#12 a deleted shoot\'s files are deleted', (await rows(removed)).length === 0 && (await Promise.all(removedUrls.map(status))).every((s) => s === 404))
ok('#13 an upload unfinished after 7 days is aborted', !(await rows(uploads)).some((f) => f.id === stale.fileId))
ok('#13 a recent unfinished upload is left to finish', (await rows(uploads)).some((f) => f.id === fresh.fileId))
ok('a shoot before its date keeps its file, row and object', (await rows(live)).length === 1 && (await status(liveUrls[0])) === 206)

r = await sweep()
ok('a second sweep finds nothing to do', r.status === 200 && Object.values(r.body.deleted ?? {}).every((n) => n === 0), JSON.stringify(r.body))

// ---------- the schedule ----------
const { data: job } = await service.rpc('files_due_for_sweep', { p_limit: 1 })
ok('nothing is due after the sweep', Array.isArray(job) && !job.some((f) => [stale.fileId].includes(f.id)), JSON.stringify(job))
