import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-024 / US-025 at the gateway: hosted files reach the client's payload,
 * signed for download, and never the crew's (AC-7).
 *
 * Needs `us036-fn`'s servers: Supabase, the local S3, and the functions served
 * with `--env-file supabase/functions/local-s3.env` (the gateway signs the
 * download URLs with the same settings). Files are uploaded through the
 * `files` function, as the creator's browser would.
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const BASE = process.env.SB_URL.replace(/\/+$/, '')
const stamp = Date.now()

const gateway = async (token) =>
  (await fetch(`${BASE}/functions/v1/link-gateway?token=${encodeURIComponent(token)}`, {
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${process.env.SB_ANON}` },
  })).json()
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

const client = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
const email = `us024-${stamp}@example.com`
const { data: acc, error } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: 'Фото', role: 'Фотограф' } } })
if (error) throw error
const { data: signed } = await client.auth.signInWithPassword({ email, password: 'testpass123' })
await grantAccess(acc.user.id)
const jwt = signed.session.access_token

const files = async (action, args) =>
  (await fetch(`${BASE}/functions/v1/files`, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  })).json()

async function upload(shootId, kind, name, bytes, relativePath) {
  const start = await files('start', { shootId, kind, name, relativePath, size: bytes.length })
  const { urls } = await files('signParts', { fileId: start.fileId, partNumbers: [1] })
  await (await fetch(urls[1], { method: 'PUT', body: bytes })).arrayBuffer()
  await files('complete', { fileId: start.fileId })
  return start.fileId
}

const clientRow = (await client.from('clients').insert({ creator_id: acc.user.id, name: 'Оля' }).select('id').single()).data.id
async function shoot({ rawLink = null } = {}) {
  const id = (await client.from('shoots')
    .insert({ creator_id: acc.user.id, client_id: clientRow, date: '2026-11-25', raw_files_url: rawLink })
    .select('id').single()).data.id
  const crew = (await client.from('crew_members').insert({ shoot_id: id, name: 'Ігор', role: 'Гафер', phone: '+380501112233', note: 'нотатка для команди' }).select('id').single()).data.id
  const clientToken = newToken()
  const crewToken = newToken()
  // As the creator: the service role only reads `access_links`.
  await client.from('access_links').insert([
    { token: clientToken, shoot_id: id, audience: 'client' },
    { token: crewToken, shoot_id: id, audience: 'crew', crew_member_id: crew },
  ])
  return { id, clientToken, crewToken }
}

const LINK = 'https://fex.net/s/abc123'
const s1 = await shoot({ rawLink: LINK })
await upload(s1.id, 'raw', 'IMG_0001.CR3', new Uint8Array(2000).fill(1), 'Card1/IMG_0001.CR3')
await upload(s1.id, 'raw', 'IMG_0001.CR3', new Uint8Array(3000).fill(2), 'Card2/IMG_0001.CR3')
await upload(s1.id, 'finished', 'Оля-001.jpg', new Uint8Array(500).fill(3))
// An upload still in progress — not the client's to see.
await files('start', { shootId: s1.id, kind: 'raw', name: 'half.CR3', size: 10 })

// ---------- AC-1 — listed, downloadable ----------
let p = await gateway(s1.clientToken)
ok('AC-1 the client payload lists the raw files', p.files?.raw?.length === 2, JSON.stringify(p.files?.raw?.map((f) => f.name)))
ok('US-025 AC-1 … and the finished photos, in their own list', p.files?.finished?.length === 1 && p.files.finished[0].name === 'Оля-001.jpg', JSON.stringify(p.files?.finished))
ok('AC-1 same-named files from two cards keep their path in the name', p.files?.raw?.map((f) => f.name).join('|') === 'Card1 · IMG_0001.CR3|Card2 · IMG_0001.CR3', JSON.stringify(p.files?.raw?.map((f) => f.name)))
ok('AC-1 an upload still in progress is not listed', !JSON.stringify(p.files).includes('half.CR3'))

const second = p.files.raw[1]
const res = await fetch(second.url)
const bytes = new Uint8Array(await res.arrayBuffer())
const disposition = res.headers.get('content-disposition') ?? ''
ok('AC-1 a file downloads from its URL, the right bytes', res.status === 200 && bytes.length === 3000 && bytes[0] === 2 && second.size === 3000, `${res.status} ${bytes.length}`)
ok('AC-1 it saves under its shown name', decodeURIComponent(disposition.split("UTF-8''")[1] ?? '') === 'Card2 · IMG_0001.CR3', disposition)

// ---------- AC-3 — the deletion date ----------
const deleteAt = (await service.from('shoots').select('files_delete_at').eq('id', s1.id).single()).data.files_delete_at
ok('AC-3 the payload carries the deletion date', p.files?.deleteAt && new Date(p.files.deleteAt).getTime() === new Date(deleteAt).getTime(), `${p.files?.deleteAt} vs ${deleteAt}`)

// ---------- AC-4 — the pasted link beside the files ----------
ok('AC-4 the pasted link comes with the files', p.rawFilesUrl === LINK && p.files.raw.length === 2)

// ---------- AC-7 — the crew gets nothing of it ----------
const crew = await gateway(s1.crewToken)
ok('AC-7 the crew payload has no files field', crew.ok !== false && !('files' in crew), Object.keys(crew).join(','))
ok('AC-7 no file name or store URL anywhere in the crew payload',
  !JSON.stringify(crew).includes('IMG_0001') && !JSON.stringify(crew).includes('X-Amz-Signature'), '')
ok('rule 2 the client payload still carries no crew note', !JSON.stringify(p).includes('нотатка для команди'))

// ---------- AC-5 — after deletion ----------
await service.from('shoots').update({ files_delete_at: new Date(Date.now() - 1000).toISOString() }).eq('id', s1.id)
p = await gateway(s1.clientToken)
ok('AC-5 past the date: deleted, no files, no URLs', p.files?.deleted === true && p.files.raw.length === 0 && !JSON.stringify(p.files).includes('X-Amz'), JSON.stringify(p.files))
ok('AC-5 the pasted link still shows after deletion', p.rawFilesUrl === LINK)
ok('AC-5 the shoot link itself keeps working (ADR-014 unchanged)', p.ok !== false && p.audience === 'client')

const s2 = await shoot()
const only = await upload(s2.id, 'raw', 'x.CR3', new Uint8Array(10))
await service.from('shoot_files').delete().eq('id', only)
p = await gateway(s2.clientToken)
ok('AC-5 every file deleted by the creator before the date: deleted', p.files?.deleted === true && p.files.raw.length === 0, JSON.stringify(p.files))

// ---------- never any files ----------
const s3 = await shoot()
p = await gateway(s3.clientToken)
ok('a shoot that never had files: nothing to list, not "deleted"', p.files?.deleted === false && p.files.raw.length === 0 && p.files.deleteAt === null, JSON.stringify(p.files))

// ---------- ADR-014 — a deleted shoot ----------
const s4 = await shoot()
await upload(s4.id, 'raw', 'y.CR3', new Uint8Array(10))
await client.rpc('soft_delete_shoot', { shoot_id: s4.id })
p = await gateway(s4.clientToken)
ok('ADR-014 a deleted shoot\'s link serves no files', p.ok === false || !p.files, JSON.stringify(p).slice(0, 120))
