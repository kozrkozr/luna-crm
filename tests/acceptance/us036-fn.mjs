import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-036 at the server: the `files` Edge Function and the rows behind it.
 *
 * Needs Supabase, the local S3 (`bash scripts/local-s3.sh start`) and the
 * functions served against it:
 *
 *   npx supabase functions serve --env-file supabase/functions/local-s3.env
 *
 * Parts go from this script straight to the local S3 over the presigned URLs,
 * as a browser's would. The quota is tested with declared sizes, not bytes: a
 * start reserves the size before a byte is sent (AC-3).
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const FN = `${process.env.SB_URL}/functions/v1/files`
const stamp = Date.now()
const GB = 1000 ** 3

const account = async (tag, { access = true } = {}) => {
  const client = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
  const email = `us036-${tag}-${stamp}@example.com`
  const { data, error } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: tag, role: 'Фотограф' } } })
  if (error) throw error
  const { data: signed } = await client.auth.signInWithPassword({ email, password: 'testpass123' })
  if (access) await grantAccess(data.user.id)
  return { client, id: data.user.id, jwt: signed.session.access_token }
}

const newShoot = async (who) => {
  const clientId = (await who.client.from('clients').insert({ creator_id: who.id, name: 'Клієнт' }).select('id').single()).data.id
  return (await who.client.from('shoots').insert({ creator_id: who.id, client_id: clientId, date: '2026-11-20' }).select('id').single()).data.id
}

const call = async (jwt, action, args = {}) => {
  const res = await fetch(FN, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

/** Starts, sends every part, completes — what the page does for one file. */
async function upload(who, shootId, { kind = 'raw', name = 'IMG_0001.CR3', relativePath, bytes = 1234 } = {}) {
  const start = await call(who.jwt, 'start', { shootId, kind, name, relativePath, size: bytes })
  if (start.status !== 200) return { start }
  const { fileId, partCount, partSize } = start.body
  const numbers = Array.from({ length: partCount }, (_, i) => i + 1)
  const { body: { urls } } = await call(who.jwt, 'signParts', { fileId, partNumbers: numbers })
  for (const n of numbers) {
    const size = Math.min(partSize, bytes - (n - 1) * partSize)
    const res = await fetch(urls[n], { method: 'PUT', body: new Uint8Array(size).fill(n) })
    await res.arrayBuffer()
  }
  const complete = await call(who.jwt, 'complete', { fileId })
  return { start, fileId, complete }
}

const photo = await account('photo')
const other = await account('other')
const lapsed = await account('lapsed', { access: false })
const shoot = await newShoot(photo)

// ---------- AC-1 + AC-2 — upload, listed, the first upload fixes the date ----------
let r = await upload(photo, shoot)
ok('AC-1 a raw file uploads: start, parts, complete', r.complete?.status === 200, JSON.stringify(r.start?.body ?? r))
const firstDate = r.complete?.body?.filesDeleteAt
const days = (new Date(firstDate) - Date.now()) / 86400000
ok('AC-2 the first upload sets the deletion date 30 days out', days > 29.9 && days <= 30, `${firstDate} (${days.toFixed(3)} days)`)

let rows = (await photo.client.from('shoot_files').select('name, kind, status, size_bytes').eq('shoot_id', shoot)).data
ok('AC-1 the creator sees the file in its section, complete', rows?.length === 1 && rows[0].kind === 'raw' && rows[0].status === 'complete' && rows[0].size_bytes === 1234, JSON.stringify(rows))

r = await upload(photo, shoot, { kind: 'finished', name: 'final.HEIC' })
ok('AC-1 a finished photo uploads (HEIC, upper case)', r.complete?.status === 200, JSON.stringify(r.start?.body))
ok('AC-2 a later upload leaves the date alone', r.complete?.body?.filesDeleteAt === firstDate, `${r.complete?.body?.filesDeleteAt} vs ${firstDate}`)

// ---------- AC-4 — no per-file size limit; parts sized to stay within 10 000 ----------
r = await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'huge.bin', size: 2_000_000_000_000 })
ok('AC-4 a single 2 TB file is not refused for its size (quota aside)', r.body.error === 'quota', JSON.stringify(r.body))
const quotaFits = await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'big.mov', size: 150 * GB })
ok('AC-4 a 150 GB file starts, in at most 10 000 parts', quotaFits.status === 200 && quotaFits.body.partCount <= 10_000, JSON.stringify(quotaFits.body))

// ---------- AC-3 — the quota, reserved at the start ----------
r = await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'more.mov', size: 60 * GB })
ok('AC-3 a start that would pass 200 GB with an upload in progress is refused', r.status === 409 && r.body.error === 'quota', JSON.stringify(r.body))
const usage = (await photo.client.rpc('my_files_usage')).data
ok('AC-3 usage counts finished files and reserved uploads', usage === 1234 + 1234 + 150 * GB, String(usage))
await call(photo.jwt, 'abort', { fileId: quotaFits.body.fileId })
r = await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'more.mov', size: 60 * GB })
ok('AC-3 an aborted upload gives its space back', r.status === 200, JSON.stringify(r.body))
await call(photo.jwt, 'abort', { fileId: r.body.fileId })

// ---------- finished photos are photos; raw takes anything (owner, 2026-10-23) ----------
r = await call(photo.jwt, 'start', { shootId: shoot, kind: 'finished', name: 'clip.mp4', size: 10 })
ok('a video is refused in finished photos', r.status === 422 && r.body.error === 'not_a_photo', JSON.stringify(r.body))
r = await upload(photo, shoot, { kind: 'raw', name: 'clip.mp4' })
ok('a video uploads to raw files', r.complete?.status === 200, JSON.stringify(r.start?.body))

// ---------- folders — the path in the name (owner, 2026-10-23) ----------
r = await upload(photo, shoot, { name: 'IMG_0001.CR3', relativePath: 'Card1/DCIM/IMG_0001.CR3' })
const fromFolder = (await photo.client.from('shoot_files').select('name, relative_path').eq('id', r.fileId).single()).data
ok('a file from a dropped folder is named by its path', fromFolder?.name === 'Card1 · DCIM · IMG_0001.CR3' && fromFolder?.relative_path === 'Card1/DCIM/IMG_0001.CR3', JSON.stringify(fromFolder))

// ---------- resume — the store says which parts it holds ----------
const big = 100 * 1024 * 1024 + 7 // two parts: one full, one of 7 bytes
const partial = await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'resume.bin', size: big })
const { body: { urls } } = await call(photo.jwt, 'signParts', { fileId: partial.body.fileId, partNumbers: [1] })
await (await fetch(urls[1], { method: 'PUT', body: new Uint8Array(Math.min(partial.body.partSize, big)) })).arrayBuffer()
r = await call(photo.jwt, 'listParts', { fileId: partial.body.fileId })
ok('listParts names the parts already sent', r.body.parts?.length === 1 && r.body.parts[0].partNumber === 1, JSON.stringify(r.body))
r = await call(photo.jwt, 'complete', { fileId: partial.body.fileId })
ok('complete with parts missing is refused as incomplete, the upload kept', r.status === 409 && r.body.error === 'incomplete', JSON.stringify(r.body))
r = await call(photo.jwt, 'check', { fileId: partial.body.fileId })
ok('check says an upload in progress may go on', r.status === 200, JSON.stringify(r.body))
r = await call(photo.jwt, 'signParts', { fileId: partial.body.fileId, partNumbers: [partial.body.partCount + 1] })
ok('a part number past the declared size is not signed', r.status === 400, JSON.stringify(r.body))
await call(photo.jwt, 'abort', { fileId: partial.body.fileId })

// ---------- AC-7 — no upload once the deletion date has passed ----------
const expiredShoot = await newShoot(photo)
await service.from('shoots').update({ files_delete_at: new Date(Date.now() - 1000).toISOString() }).eq('id', expiredShoot)
r = await call(photo.jwt, 'start', { shootId: expiredShoot, kind: 'raw', name: 'late.CR3', size: 10 })
ok('AC-7 a shoot past its deletion date refuses uploads', r.status === 409 && r.body.error === 'expired', JSON.stringify(r.body))
const date = (await service.from('shoots').select('files_delete_at').eq('id', expiredShoot).single()).data.files_delete_at
ok('AC-7 the date is not reset', new Date(date) < new Date(), date)

// ---------- AC-8 — only the creator ----------
r = await call(other.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'x.CR3', size: 10 })
ok('AC-8 another account cannot start an upload to the shoot', r.status === 404 && r.body.error === 'not_found', JSON.stringify(r.body))
const mine = await call(photo.jwt, 'start', { shootId: shoot, kind: 'raw', name: 'mine.CR3', size: 10 })
r = await call(other.jwt, 'signParts', { fileId: mine.body.fileId, partNumbers: [1] })
ok('AC-8 another account cannot sign parts of the creator\'s upload', r.status === 404, JSON.stringify(r.body))
r = await call(other.jwt, 'abort', { fileId: mine.body.fileId })
ok('AC-8 another account cannot abort it', r.status === 404, JSON.stringify(r.body))
r = await call(process.env.SB_ANON, 'start', { shootId: shoot, kind: 'raw', name: 'x.CR3', size: 10 })
ok('AC-8 no account (a crew or client link) is refused', r.status === 401, JSON.stringify(r.body))
rows = (await other.client.from('shoot_files').select('id').eq('shoot_id', shoot)).data
ok('AC-8 another account reads none of the shoot\'s files', rows?.length === 0, JSON.stringify(rows))
const anonRead = await createClient(process.env.SB_URL, process.env.SB_ANON, opts).from('shoot_files').select('id')
ok('an anonymous caller reads no files', anonRead.error !== null || anonRead.data?.length === 0, JSON.stringify(anonRead))
const write = await photo.client.from('shoot_files').update({ size_bytes: 1 }).eq('shoot_id', shoot).select()
ok('the creator cannot write a file row directly (only through the function)', write.error !== null || write.data?.length === 0, JSON.stringify(write.error ?? write.data))

// ---------- base access until the PRO ADR (#11) ----------
const lapsedShoot = await (async () => {
  await grantAccess(lapsed.id)
  const id = await newShoot(lapsed)
  await grantAccess(lapsed.id, new Date(Date.now() - 1000).toISOString())
  return id
})()
r = await call(lapsed.jwt, 'start', { shootId: lapsedShoot, kind: 'raw', name: 'x.CR3', size: 10 })
ok('an account without access cannot upload', r.status === 403 && r.body.error === 'no_access', JSON.stringify(r.body))

// ---------- ADR-014 — a deleted shoot is gone for uploads ----------
await photo.client.rpc('soft_delete_shoot', { shoot_id: shoot })
r = await call(photo.jwt, 'signParts', { fileId: mine.body.fileId, partNumbers: [1] })
ok('ADR-014 an upload to a deleted shoot can no longer be signed', r.status === 404, JSON.stringify(r.body))
rows = (await photo.client.from('shoot_files').select('id').eq('shoot_id', shoot)).data
ok('ADR-014 a deleted shoot\'s files are hidden from the creator', rows?.length === 0, JSON.stringify(rows))
