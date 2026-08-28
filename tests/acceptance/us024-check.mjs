import { APP_URL, SITE_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * US-024 — the client's raw-files section.
 *
 * Three states, and the suite's job is to keep them apart: no link at all
 * (AC-1, placeholder), a real link (AC-2, shown), and a pasted value that is
 * not a link (AC-3, falls back to the placeholder — NOT shown as a link).
 *
 * The third is the one worth testing hardest. "Falls back to the placeholder"
 * and "the creator never set one" look identical on screen, so the assertion
 * has to be that the malformed value is absent from the page AND from the
 * payload — otherwise a leak that renders as plain text would pass.
 */
import { createClient } from '@supabase/supabase-js'
const SITE = SITE_URL
const GW = `${process.env.SB_URL.replace(/\/+$/, '')}/functions/v1/link-gateway`
const call = async (token) =>
  (await fetch(`${GW}?token=${encodeURIComponent(token)}`, {
    headers: { apikey: process.env.SB_KEY, authorization: `Bearer ${process.env.SB_KEY}` },
  })).json()
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `us024-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({ email, password: 'testpass123' })
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })

const GOOD = 'https://fex.net/s/abc123'
const MALFORMED = 'fex.net/no-scheme'

const mk = async (rawFilesUrl) => {
  const { data: shoot } = await db.from('shoots')
    .insert({ creator_id: acc.user.id, client_name: 'Оля', client_contact: 'o@example.com',
              date: '2026-12-30', raw_files_url: rawFilesUrl })
    .select('id').single()
  await db.from('crew_members').insert({ shoot_id: shoot.id, name: 'Ігор', role: 'Гафер', phone: '+380501112233' })
  const token = newToken()
  await db.from('access_links').insert({ token, shoot_id: shoot.id, audience: 'client' })
  return { id: shoot.id, token }
}

const empty = await mk(null)
const set = await mk(GOOD)
const bad = await mk(MALFORMED)

// ---------- the payload ----------
const pEmpty = await call(empty.token)
const pSet = await call(set.token)
const pBad = await call(bad.token)
ok('AC-1 no link set arrives as null', pEmpty.rawFilesUrl === null, JSON.stringify(pEmpty.rawFilesUrl))
ok('AC-2 a pasted link arrives intact', pSet.rawFilesUrl === GOOD, pSet.rawFilesUrl)
ok('AC-3 a malformed value arrives as null, not as a link', pBad.rawFilesUrl === null, JSON.stringify(pBad.rawFilesUrl))
ok('AC-3 the malformed value is nowhere in the client payload', !JSON.stringify(pBad).includes(MALFORMED))

// The crew audience has no files section in the prototype, so it is not sent one.
const crewShoot = await db.from('crew_members').select('id').eq('shoot_id', set.id).single()
const crewToken = newToken()
await db.from('access_links').insert({ token: crewToken, shoot_id: set.id, audience: 'crew', crew_member_id: crewShoot.data.id })
const pCrew = await call(crewToken)
ok('the crew payload carries no files section', pCrew.rawFilesUrl === undefined, JSON.stringify(pCrew.rawFilesUrl))

// ---------- the screen ----------
const B = await openBrowser({ port: 9558, width: 390, height: 1400 })
const { ev } = B

/**
 * The text of ONE files section.
 *
 * Both sections are on the client's screen now, and each shows «В розробці»
 * when it has no link — so `body.includes('В розробці')` cannot tell which one
 * is the placeholder. Scoping to the section's own element is the difference
 * between asserting AC-2 and asserting that the page contains a word.
 */
const sectionText = (label) =>
  ev(`(()=>{
    // querySelectorAll('*'), not 'div': RNR renders <Text variant="h4"> as a
    // real <h4>, so a tag list is a way to miss the thing being looked for.
    const el=[...document.querySelectorAll('*')].find(e=>e.innerText && e.innerText.trim()===${JSON.stringify(label)});
    return el && el.parentElement ? el.parentElement.innerText : null;
  })()`)
const RAW = 'Вихідники'

await B.navigate(`${SITE}/s/${empty.token}`)
let body = await ev('document.body.innerText')
let section = await sectionText(RAW)
ok('AC-1 the section is present with no link set', body.includes(RAW), body.replace(/\n/g, ' | ').slice(0, 120))
ok('AC-1 and shows the «В розробці» placeholder, not an empty section',
   section?.includes('В розробці') === true, JSON.stringify(section))

await B.navigate(`${SITE}/s/${set.token}`)
body = await ev('document.body.innerText')
section = await sectionText(RAW)
ok('AC-2 a pasted link is shown', section?.includes(GOOD) === true, JSON.stringify(section))
ok('AC-2 and THIS section no longer shows the placeholder',
   section?.includes('В розробці') === false, JSON.stringify(section))
const href = await ev(`(()=>{const b=[...document.querySelectorAll('div[role=button],button,a')].find(e=>e.innerText.includes('fex.net')); return b?b.tagName:'none'})()`)
ok('AC-2 the link is an actual control, not plain text', href !== 'none', `element: ${href}`)

await B.navigate(`${SITE}/s/${bad.token}`)
body = await ev('document.body.innerText')
section = await sectionText(RAW)
ok('AC-3 a malformed link falls back to the placeholder',
   section?.includes('В розробці') === true, JSON.stringify(section))
ok('AC-3 and the malformed value is not shown at all', !body.includes(MALFORMED))

// ---------- the creator's input (prototype/ux-notes place it on the edit screen) ----------
const APP = APP_URL
await B.login(APP, email)
await B.navigate(`${APP}/shoot/${empty.id}/edit`)
body = await ev('document.body.innerText')
ok('the edit screen offers a Файли section', body.includes('Файли') && body.includes('Вихідники'),
   body.replace(/\n/g, ' | ').slice(0, 140))

// US-030 AC-5 made start and end times required on this screen, so a save that
// leaves them empty is now blocked before any other validation runs — the time
// error would mask the one this suite is about. Filled the way us030-check does
// it: the pickers have no web rendering, so «Готово» accepts the draft.
await B.tap(`document.querySelector('#start-time')`); await B.settle()
await B.tapByText('Готово'); await B.settle()
await B.tap(`document.querySelector('#end-time')`); await B.settle()
await B.tapByText('Готово'); await B.settle()

// AC-3 at input time — US-003 AC-2's rule: a message, and nothing saved.
await B.setInput('#raw-files', MALFORMED)
await B.tapByText('Зберегти')
body = await ev('document.body.innerText')
ok('AC-3 a malformed link is refused with a message', body.includes('коректне посилання'),
   body.replace(/\n/g, ' | ').slice(0, 140))
ok('AC-3 and the screen did not navigate away', (await ev('location.pathname')).includes('/edit'),
   await ev('location.pathname'))
const stillNull = (await db.from('shoots').select('raw_files_url').eq('id', empty.id).single()).data
ok('AC-3 and nothing was saved', stillNull.raw_files_url === null, JSON.stringify(stillNull))

// AC-2 at input time — a good link saves and reaches the client.
await B.setInput('#raw-files', GOOD)
await B.tapByText('Зберегти')
await B.settle()
const saved = (await db.from('shoots').select('raw_files_url').eq('id', empty.id).single()).data
ok('AC-2 a valid link is saved by the creator', saved.raw_files_url === GOOD, JSON.stringify(saved))
await B.navigate(`${SITE}/s/${empty.token}`)
section = await sectionText(RAW)
ok('AC-2 and the client then sees it instead of the placeholder',
   section?.includes(GOOD) === true && section?.includes('В розробці') === false, JSON.stringify(section))

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
