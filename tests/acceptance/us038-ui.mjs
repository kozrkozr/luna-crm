import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep } from './cdp.mjs'
import { grantAccess } from './access.mjs'
import { createClient } from '@supabase/supabase-js'
/**
 * US-038 on the desktop web app: a file's bin and «Видалити всі файли» ask the
 * approved questions and delete; deleting a shoot that has files says so
 * (plan #12). Needs `us036-ui`'s servers.
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const BASE = process.env.SB_URL.replace(/\/+$/, '')

const EMAIL = `us038ui-${Date.now()}@example.com`
const seed = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
const { data: acc } = await seed.auth.signUp({ email: EMAIL, password: 'testpass123', options: { data: { name: 'Delete', role: 'Фотограф' } } })
const { data: signed } = await seed.auth.signInWithPassword({ email: EMAIL, password: 'testpass123' })
await grantAccess(acc.user.id)
const files = async (action, args) =>
  (await fetch(`${BASE}/functions/v1/files`, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${signed.session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...args }),
  })).json()
async function upload(shootId, kind, name, size) {
  const start = await files('start', { shootId, kind, name, size })
  const { urls } = await files('signParts', { fileId: start.fileId, partNumbers: [1] })
  await (await fetch(urls[1], { method: 'PUT', body: new Uint8Array(size) })).arrayBuffer()
  await files('complete', { fileId: start.fileId })
}
const clientRow = (await seed.from('clients').insert({ creator_id: acc.user.id, name: 'Видалення' }).select('id').single()).data.id
const SHOOT = (await seed.from('shoots').insert({ creator_id: acc.user.id, client_id: clientRow, date: '2026-11-28' }).select('id').single()).data.id
await upload(SHOOT, 'raw', 'first.CR3', 1_000_000)
await upload(SHOOT, 'raw', 'second.CR3', 2_000_000)
await upload(SHOOT, 'finished', 'final.jpg', 500_000)
const rows = async () => (await service.from('shoot_files').select('name').eq('shoot_id', SHOOT)).data.map((r) => r.name).sort()

const B = await openBrowser({ port: 9365, width: 1440, height: 1100 })
const { send, ev, waitFor } = B
const { result: ua } = await send('Runtime.evaluate', { expression: 'navigator.userAgent', returnByValue: true })
await send('Network.setUserAgentOverride', { userAgent: ua.value, acceptLanguage: 'uk-UA' })
await send('Emulation.setLocaleOverride', { locale: 'uk-UA' })
await B.login(APP_URL, EMAIL).catch(() => {})
await B.navigate(`${APP_URL}/shoot/${SHOOT}?tab=materials`)
await waitFor(`document.body.innerText.includes('second.CR3')`, { label: 'the three files' })

const dialogText = () => ev(`document.querySelector('[role=alertdialog]')?.innerText ?? ''`)
const confirmDialog = () => ev(`(() => { const d = document.querySelector('[role=alertdialog]'); const b = d && [...d.querySelectorAll('div[role=button],button')].find(e => e.innerText.trim() === 'Видалити'); b && b.click(); return !!b })()`)

// ---------- AC-2 — one file ----------
await ev(`(() => { const b = [...document.querySelectorAll('[aria-label="Видалити"]')][0]; b && b.click(); return !!b })()`)
await waitFor(`!!document.querySelector('[role=alertdialog]')`, { label: 'the one-file question' })
ok('AC-2 a file\'s bin asks the approved question, with its name',
  (await dialogText()).includes('Видалити «first.CR3»? Файл буде видалено назавжди, і клієнт більше не зможе його завантажити.'), await dialogText())
await confirmDialog()
await waitFor(`!document.body.innerText.includes('first.CR3')`, { label: 'the file to go' })
ok('AC-1 the file is deleted', (await rows()).join() === 'final.jpg,second.CR3', (await rows()).join())
await waitFor(`document.body.innerText.includes('Використано 2,5 МБ з 200 ГБ')`, { label: 'the quota to follow' })
ok('AC-1 the quota line follows', true)

// ---------- AC-2 — all of them ----------
await B.tapByText('Видалити всі файли')
await waitFor(`!!document.querySelector('[role=alertdialog]')`, { label: 'the all-files question' })
ok('AC-2 «Видалити всі файли» asks with the count and the size',
  (await dialogText()).includes('Видалити всі файли зйомки (2 файли, 2,5 МБ)? Їх буде видалено назавжди'), await dialogText())
await confirmDialog()
await waitFor(`!document.body.innerText.includes('second.CR3') && !document.body.innerText.includes('final.jpg')`, { label: 'every file to go' })
ok('AC-1 every file of the shoot is deleted', (await rows()).length === 0)
ok('the button goes with the files', !(await B.text()).includes('Видалити всі файли'))

// ---------- plan #12 — deleting a shoot that has files ----------
await upload(SHOOT, 'raw', 'last.CR3', 3_000_000)
await B.navigate(`${APP_URL}/shoot/${SHOOT}`)
await waitFor(`document.body.innerText.includes('Деталі')`, { label: 'the shoot' })
await ev(`(() => { const b = document.querySelector('[aria-label="Скасувати зйомку"]') || [...document.querySelectorAll('div[role=button],button')].find(e => e.innerText.trim() === 'Скасувати зйомку'); b && b.click(); return !!b })()`)
await waitFor(`!!document.querySelector('[role=alertdialog]')`, { label: 'the delete-shoot question' })
ok('#12 deleting a shoot with files says it takes them, with count and size',
  (await dialogText()).includes('Видалити цю зйомку разом із файлами (1 файл, 3 МБ)?'), await dialogText())

B.close()
await sleep(100)
