import { SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep } from './cdp.mjs'
import { grantAccess } from './access.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
/**
 * US-024 / US-025 on the client's link view, logged out, at phone width: the
 * hosted files listed per section with their size and «Завантажити», the
 * deletion date, «Завантажити все», the pasted link beside them, AC-5's notice
 * after deletion, and nothing of it on a crew member's link.
 *
 * Needs `us024-fn`'s servers plus the exported link surface on :8099
 * (`npm run export:web && npm run serve:link`, exported against local Supabase).
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const BASE = process.env.SB_URL.replace(/\/+$/, '')
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

const client = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
const email = `us024ui-${Date.now()}@example.com`
const { data: acc } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: 'Фото', role: 'Фотограф' } } })
const { data: signed } = await client.auth.signInWithPassword({ email, password: 'testpass123' })
await grantAccess(acc.user.id)
const files = async (action, args) =>
  (await fetch(`${BASE}/functions/v1/files`, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${signed.session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  })).json()
async function upload(shootId, kind, name, size, relativePath) {
  const start = await files('start', { shootId, kind, name, relativePath, size })
  const { urls } = await files('signParts', { fileId: start.fileId, partNumbers: [1] })
  await (await fetch(urls[1], { method: 'PUT', body: new Uint8Array(size).fill(5) })).arrayBuffer()
  await files('complete', { fileId: start.fileId })
}
const clientRow = (await client.from('clients').insert({ creator_id: acc.user.id, name: 'Оля' }).select('id').single()).data.id
async function shoot({ rawLink = null } = {}) {
  const id = (await client.from('shoots')
    .insert({ creator_id: acc.user.id, client_id: clientRow, date: '2026-11-25', raw_files_url: rawLink })
    .select('id').single()).data.id
  const crew = (await client.from('crew_members').insert({ shoot_id: id, name: 'Ігор', role: 'Гафер', phone: '+380501112233' }).select('id').single()).data.id
  const clientToken = newToken()
  const crewToken = newToken()
  await client.from('access_links').insert([
    { token: clientToken, shoot_id: id, audience: 'client' },
    { token: crewToken, shoot_id: id, audience: 'crew', crew_member_id: crew },
  ])
  return { id, clientToken, crewToken }
}

const LINK = 'https://fex.net/s/abc123'
const withFiles = await shoot({ rawLink: LINK })
await upload(withFiles.id, 'raw', 'IMG_0001.CR3', 2_000_000, 'Card1/IMG_0001.CR3')
await upload(withFiles.id, 'raw', 'IMG_0002.CR3', 3_500_000)
await upload(withFiles.id, 'finished', 'Оля-001.jpg', 500_000)
const gone = await shoot()
await upload(gone.id, 'raw', 'old.CR3', 1000)
await service.from('shoots').update({ files_delete_at: new Date(Date.now() - 1000).toISOString() }).eq('id', gone.id)

const B = await openBrowser({ port: 9363, width: 390, height: 1400 })
// The link follows the browser's language (`US-046`); these labels are Ukrainian.
const { result: ua } = await B.send('Runtime.evaluate', { expression: 'navigator.userAgent', returnByValue: true })
await B.send('Network.setUserAgentOverride', { userAgent: ua.value, acceptLanguage: 'uk-UA' })
await B.send('Emulation.setLocaleOverride', { locale: 'uk-UA' })
const downloads = []
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'us024-'))
B.onEvent((msg) => msg.method === 'Browser.downloadWillBegin' && downloads.push(msg.params.suggestedFilename))
await B.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir, eventsEnabled: true })

// ---------- AC-1, AC-3, AC-4 ----------
await B.navigate(`${SITE_URL}/s/${withFiles.clientToken}`)
await B.waitFor(`document.body.innerText.includes('IMG_0002.CR3')`, { label: 'the hosted files' })
let body = await B.text()
ok('AC-1 the raw files list with their sizes', body.includes('Card1 · IMG_0001.CR3') && body.includes('2 МБ') && body.includes('3,5 МБ'))
ok('US-025 AC-1 the finished photo lists in its own section', body.includes('Оля-001.jpg') && body.includes('500 КБ'))
ok('AC-1 every file has «Завантажити»', (body.match(/^Завантажити$/gm) ?? []).length === 3, String((body.match(/^Завантажити$/gm) ?? []).length))
ok('AC-3 «Файли доступні до {дата}» with the date in words', /Файли доступні до \d{1,2} (листопада|грудня)/.test(body), body.match(/Файли доступні[^\n]*/)?.[0])
ok('AC-4 the pasted link shows beside the hosted files', body.includes('fex.net/s/abc123'))

await B.tapByText('Завантажити')
await B.waitFor(`true`)
await sleep(1500)
ok('AC-1 «Завантажити» saves the file under its shown name', downloads[0] === 'Card1 · IMG_0001.CR3', JSON.stringify(downloads))

downloads.length = 0
await B.ev(`(() => { const b = [...document.querySelectorAll('div[role=button],button')].find(e => e.innerText.trim() === 'Завантажити все'); b && b.click(); return !!b })()`)
await sleep(5500)
ok('AC-2 «Завантажити все» downloads every file of the section', downloads.length === 2 && downloads.includes('IMG_0002.CR3'), JSON.stringify(downloads))

// ---------- AC-5 ----------
await B.navigate(`${SITE_URL}/s/${gone.clientToken}`)
await B.waitFor(`document.body.innerText.includes('Файли видалено')`, { label: 'the deleted notice' })
body = await B.text()
ok('AC-5 after deletion, no link: the notice', body.includes('Файли видалено. Зверніться до фотографа, якщо вони ще потрібні.'))
ok('AC-5 … and no file rows', !body.includes('old.CR3'))

// ---------- AC-7 ----------
await B.navigate(`${SITE_URL}/s/${withFiles.crewToken}`)
await B.waitFor(`document.body.innerText.includes('Ігор') || document.body.innerText.includes('Гафер')`, { label: 'the crew view' })
body = await B.text()
ok('AC-7 a crew member\'s link shows none of the files', !body.includes('IMG_0001') && !body.includes('Оля-001.jpg') && !body.includes('Файли доступні'))

fs.rmSync(dir, { recursive: true, force: true })
B.close()
await sleep(100)
