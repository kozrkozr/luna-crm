import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep } from './cdp.mjs'
import { grantAccess } from './access.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
/**
 * US-036 in a real browser, on the desktop web app: files picked into a
 * section upload straight to the local S3 and list in that section (AC-1), the
 * quota line shows, a non-photo is refused in finished photos, and an upload
 * cut off by a reload is shown as interrupted and resumes when the same file is
 * picked again (S-6 F-7).
 *
 * Needs all of `us036-fn`'s servers plus the app on :8098. Folders and
 * drag-and-drop are not driven here — CDP cannot hand a page a folder with
 * paths; `collect.ts` is checked by hand on dev.
 */
const B = await openBrowser({ port: 9361, width: 1440, height: 1100 })
const { ev, send, waitFor } = B
const opts = { auth: { persistSession: false } }

const EMAIL = `us036ui-${Date.now()}@example.com`
const seed = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
const { data: acc, error } = await seed.auth.signUp({ email: EMAIL, password: 'testpass123', options: { data: { name: 'Upload', role: 'Фотограф' } } })
if (error) throw error
await seed.auth.signInWithPassword({ email: EMAIL, password: 'testpass123' })
await grantAccess(acc.user.id)
const clientId = (await seed.from('clients').insert({ creator_id: acc.user.id, name: 'Файли-тест' }).select('id').single()).data.id
const SHOOT = (await seed.from('shoots').insert({ creator_id: acc.user.id, client_id: clientId, date: '2026-11-21' }).select('id').single()).data.id

// Test files: real bytes for the small ones, a sparse one big enough for three parts.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'us036-'))
const raw = path.join(dir, 'IMG_0001.CR3')
fs.writeFileSync(raw, Buffer.alloc(1_500_000, 7))
const video = path.join(dir, 'clip.mp4')
fs.writeFileSync(video, Buffer.alloc(1000, 1))
const big = path.join(dir, 'big.bin')
execFileSync('mkfile', ['-n', '210m', big])

/** Hands files to the n-th `<input type=file>`: 0 raw files, 1 raw folder, 2 finished files, 3 finished folder. */
async function pick(index, files) {
  const { root } = await send('DOM.getDocument', { depth: -1 })
  const { nodeIds } = await send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'input[type=file]' })
  await send('DOM.setFileInputFiles', { nodeId: nodeIds[index], files })
}

const usageNow = async () => (await seed.rpc('my_files_usage')).data

// The app follows the device's language (`US-045`); these labels are Ukrainian.
const { result: ua } = await send('Runtime.evaluate', { expression: 'navigator.userAgent', returnByValue: true })
await send('Network.setUserAgentOverride', { userAgent: ua.value, acceptLanguage: 'uk-UA' })
await send('Emulation.setLocaleOverride', { locale: 'uk-UA' })
// `login` waits for «Мої зйомки», which the home screen no longer says
// (`US-035`); by then the session is in, so its timeout is survivable.
await B.login(APP_URL, EMAIL).catch(() => {})
await B.navigate(`${APP_URL}/shoot/${SHOOT}?tab=materials`)
await waitFor(`document.querySelectorAll('input[type=file]').length === 4`, { label: 'the two sections\' pickers' })

let body = await B.text()
ok('the quota line shows on the shoot (owner, 2026-10-23)', body.includes('Використано 0 Б з 200 ГБ'), body.match(/Використано[^\n]*/)?.[0])
ok('each section offers files and a folder', (body.match(/Додати файли/g) ?? []).length === 2 && (body.match(/Додати папку/g) ?? []).length === 2)

// ---------- AC-1 — picked, uploaded, listed ----------
await pick(0, [raw])
await waitFor(`document.body.innerText.includes('1,5 МБ') && !document.body.innerText.includes('% · 1,5 МБ')`, { label: 'the raw file to finish', timeout: 60000 })
const stored = (await seed.from('shoot_files').select('name, kind, status').eq('shoot_id', SHOOT)).data
ok('AC-1 the picked file is stored in raw files, complete', stored?.length === 1 && stored[0].kind === 'raw' && stored[0].status === 'complete', JSON.stringify(stored))
ok('AC-1 it lists with its size', (await B.text()).includes('IMG_0001.CR3'))

// ---------- finished photos are photos ----------
await pick(2, [video])
await waitFor(`document.body.innerText.includes('— не фото')`, { label: 'the not-a-photo message' })
body = await B.text()
ok('a video picked into finished photos is refused with the approved copy',
  body.includes('«clip.mp4» — не фото. У «Готові файли» можна завантажити JPEG, PNG, HEIC, TIFF або WebP.'), body.match(/«clip.mp4»[^\n]*/)?.[0])
ok('nothing was reserved for it', (await usageNow()) === 1_500_000, String(await usageNow()))

// ---------- S-6 F-7 — a reload interrupts, the same file resumes ----------
// Slow the uplink so the reload lands mid-upload (~10 MB/s: about 20 s for the file).
await send('Network.enable')
const slow = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: 10 * 1024 * 1024 }
await send('Network.emulateNetworkConditions', slow)
await pick(0, [big])
await waitFor(`(() => { const m = document.body.innerText.match(/(\\d+)% · 220,2 МБ/); return m && Number(m[1]) >= 48 })()`,
  { label: 'the big file past its first part', timeout: 120000 })
await B.navigate(`${APP_URL}/shoot/${SHOOT}?tab=materials`)
await send('Network.emulateNetworkConditions', slow)
await waitFor(`document.body.innerText.includes('Завантаження «big.bin» перервано')`, { label: 'the interrupted row', timeout: 20000 })
ok('S-6 F-7 a reloaded page shows the upload as interrupted, with the approved copy', true)
await pick(0, [big])
await waitFor(`!document.body.innerText.includes('перервано') && document.body.innerText.includes('220,2 МБ') && !/\\d+% · 220,2 МБ/.test(document.body.innerText)`,
  { label: 'the resumed upload to finish', timeout: 180000 })
const all = (await seed.from('shoot_files').select('name, status, size_bytes').eq('shoot_id', SHOOT).order('created_at')).data
ok('S-6 F-7 picking the same file again finishes the same upload — one row, complete',
  all?.length === 2 && all[1].name === 'big.bin' && all[1].status === 'complete' && all[1].size_bytes === 220_200_960, JSON.stringify(all))

body = await B.text()
ok('the quota line follows the uploads, in its own unit (owner, 2026-10-23)', body.includes('Використано 221,7 МБ з 200 ГБ'), body.match(/Використано[^\n]*/)?.[0])
ok('«Файли» counts the hosted files beside the links', body.includes('2 файли · 0 посилань'), body.match(/\d+ файл[^\n]*/)?.[0])
ok('an empty link slot no longer says «В розробці»', !body.includes('В розробці'))

fs.rmSync(dir, { recursive: true, force: true })
B.close()
await sleep(100)
