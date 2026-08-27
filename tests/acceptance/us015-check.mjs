import { APP_URL, SITE_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * US-015 — switch the UI to English, and remember it.
 *
 * AC-2 is the assertion that matters most and is the easiest to fake: "the
 * shoot's own content is unchanged". Checking that a shoot still exists proves
 * nothing. So the fixture carries content in three places a careless
 * implementation could translate or clobber — the client's name, a crew
 * member's name and stored role, and a reference URL — and each is compared
 * BEFORE and AFTER a round trip through English, on screen and in the row.
 */
import { createClient } from '@supabase/supabase-js'
const APP = APP_URL
const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `us015-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({
  email, password: 'testpass123', options: { data: { name: 'Ілона', role: 'Фотограф' } },
})
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })

const CLIENT = 'Оля Ковальчук'
const CREW = 'Оксана'
const ROLE = 'Візажист'
const REF = 'https://pinterest.com/luna-ref-1'
const { data: shoot } = await db.from('shoots')
  .insert({ creator_id: acc.user.id, client_name: CLIENT, client_contact: 'o@example.com', date: '2026-12-30' })
  .select('id').single()
await db.from('crew_members').insert({ shoot_id: shoot.id, name: CREW, role: ROLE, phone: '+380509876543' })
await db.from('shoot_references').insert({ shoot_id: shoot.id, kind: 'link', url_or_path: REF })

const B = await openBrowser({ port: 9564, width: 390, height: 1400 })
const { ev } = B
const lang = () => db.from('users').select('language').eq('id', acc.user.id).single().then((r) => r.data?.language)

await B.login(APP, email)
let body = await ev('document.body.innerText')
ok('starts in Ukrainian (the US-014 default)', body.includes('Мої зйомки'), body.replace(/\n/g, ' | ').slice(0, 90))
ok('the switcher offers both languages',
   (await ev(`JSON.stringify([...document.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')).filter(l=>l==='English'||l==='Українська'))`)) === '["Українська","English"]',
   await ev(`JSON.stringify([...document.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')).filter(l=>/English|Укра/.test(l)))`))

// ---------- what the shoot looks like in Ukrainian ----------
await B.tap(`[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes(${JSON.stringify(CLIENT)}))`)
const before = await ev('document.body.innerText')
ok('the shoot screen shows its content', before.includes(CLIENT) && before.includes(CREW) && before.includes(ROLE),
   before.replace(/\n/g, ' | ').slice(0, 130))

// ---------- AC-1 — switch ----------
await B.navigate(`${APP}/`)
await B.tap(`document.querySelector('[aria-label="English"]')`)
body = await ev('document.body.innerText')
ok('AC-1 the UI changes to English', body.includes('My shoots') && !body.includes('Мої зйомки'),
   body.replace(/\n/g, ' | ').slice(0, 110))
ok('AC-1 the calendar switches too', /January|February|August|December/.test(body) && body.includes('Mon'),
   body.replace(/\n/g, ' | ').slice(0, 140))
ok('AC-1 the choice is written to the account', (await lang()) === 'en', await lang())

// ---------- AC-1 — it persists across a login ----------
await B.tapByText('Log out')
await B.settle()
await B.login(APP, email, 'testpass123')
body = await ev('document.body.innerText')
ok('AC-1 still English after logging out and back in', body.includes('My shoots'),
   body.replace(/\n/g, ' | ').slice(0, 110))

// ---------- AC-2 — content is untouched while in English ----------
await B.tap(`[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes(${JSON.stringify(CLIENT)}))`)
const during = await ev('document.body.innerText')
ok('AC-2 the client name is unchanged in English', during.includes(CLIENT), during.replace(/\n/g, ' | ').slice(0, 120))
ok("AC-2 the crew member's name is unchanged", during.includes(CREW))
ok('AC-2 the stored role is unchanged — it is data, not interface',
   during.includes(ROLE), during.replace(/\n/g, ' | ').slice(0, 140))
ok('AC-2 the chrome around it did change', during.includes('Client') || during.includes('Crew') || during.includes('Edit'),
   during.replace(/\n/g, ' | ').slice(0, 140))

// ---------- AC-2 — and after switching back ----------
await B.navigate(`${APP}/`)
await B.tap(`document.querySelector('[aria-label="Українська"]')`)
body = await ev('document.body.innerText')
ok('AC-2 switching back returns to Ukrainian', body.includes('Мої зйомки'), body.replace(/\n/g, ' | ').slice(0, 90))
ok('AC-2 and that is persisted too', (await lang()) === 'uk', await lang())

await B.tap(`[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes(${JSON.stringify(CLIENT)}))`)
const after = await ev('document.body.innerText')
ok('AC-2 every piece of content survived the round trip',
   after.includes(CLIENT) && after.includes(CREW) && after.includes(ROLE),
   after.replace(/\n/g, ' | ').slice(0, 130))

const rows = await Promise.all([
  db.from('shoots').select('client_name').eq('id', shoot.id).single(),
  db.from('crew_members').select('name, role').eq('shoot_id', shoot.id).single(),
  db.from('shoot_references').select('url_or_path').eq('shoot_id', shoot.id).single(),
])
ok('AC-2 the rows themselves were never rewritten',
   rows[0].data.client_name === CLIENT && rows[1].data.name === CREW &&
   rows[1].data.role === ROLE && rows[2].data.url_or_path === REF,
   JSON.stringify(rows.map((r) => r.data)))

// ---------- EP-05 scope — the link surface never switches ----------
const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await db.from('access_links').insert({ token, shoot_id: shoot.id, audience: 'client' })
await db.from('users').update({ language: 'en' }).eq('id', acc.user.id)
await B.navigate(`${SITE_URL}/s/${token}`)
body = await ev('document.body.innerText')
ok('EP-05 the client link view stays Ukrainian even with the account on English',
   body.includes('Зйомка') && !body.includes('Shoot for'), body.replace(/\n/g, ' | ').slice(0, 110))
ok('EP-05 and offers no switcher',
   (await ev(`document.querySelectorAll('[aria-label="English"]').length`)) === 0)

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
