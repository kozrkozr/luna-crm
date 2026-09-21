import { APP_URL, SITE_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * US-009 on screen — a self-registered crew member's commitments, on the same
 * list and calendar the creator uses.
 *
 * AC-2 is the one that cannot be tested by looking at a screen: "no such view
 * exists" for someone who never registered. There is no session to render it
 * for, so the assertion is made where the view actually comes from — the
 * function is unreachable without an account, and the person's access remains
 * the link the photographer shared (US-007), which is checked to still work.
 */
import { createClient } from '@supabase/supabase-js'
const APP = APP_URL
const SITE = SITE_URL
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const stamp = Date.now()

const account = async (tag, email = `us009ui-${tag}-${stamp}@example.com`, role = 'Фотограф') => {
  const client = anon()
  const { data, error } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: tag, role } } })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  return { client, id: data.user.id, email }
}
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

const photoA = await account('photoa')
const photoB = await account('photob')
/**
 * A shoot, and the client row it hangs off.
 *
 * `client_name` and `client_contact` were columns on `shoots` when this suite
 * was written; `ADR-018` (migration 20260829100000) replaced them with a
 * `clients` row and a `client_id`, which left every insert here failing on
 * columns the schema no longer has. `us009-db.mjs`'s helper was repaired in
 * `8a90c9e`; this one was missed, and the suite has not run since.
 */
const mkShoot = async (photo, client, date, address) => {
  const clientId = (await photo.client.from('clients')
    .insert({ creator_id: photo.id, name: client })
    .select('id').single()).data.id
  return (await photo.client.from('shoots')
    .insert({ creator_id: photo.id, client_id: clientId, date, location_address: address })
    .select('id').single()).data.id
}

const shootA = await mkShoot(photoA, 'Клієнт А', '2026-12-10', 'Студія Луна, Київ')
const shootB = await mkShoot(photoB, 'Клієнт Б', '2026-12-20', 'Лофт на Подолі')

// The crew member is added by BOTH photographers before registering.
const crewEmail = `us009ui-crew-${stamp}@example.com`
const cA = (await photoA.client.from('crew_members').insert({ shoot_id: shootA, name: 'Оксана', role: 'Візажист', email: crewEmail }).select('id').single()).data
const cB = (await photoB.client.from('crew_members').insert({ shoot_id: shootB, name: 'Оксана', role: 'Візажист', email: crewEmail }).select('id').single()).data
const tokenA = newToken()
await photoA.client.from('access_links').insert({ token: tokenA, shoot_id: shootA, audience: 'crew', crew_member_id: cA.id })
// shootB deliberately gets NO link, to exercise the inert row.

// AC-2, before there is an account: the link still works, and that is all they have.
const B = await openBrowser({ port: 9566, width: 390, height: 1400 })
const { ev } = B
await B.navigate(`${SITE}/s/${tokenA}`)
let body = await ev('document.body.innerText')
ok('AC-2 before registering, their only view is the link the photographer shared',
   body.includes('Зйомка') && body.includes('Оксана'), body.replace(/\n/g, ' | ').slice(0, 100))

// ---------- the crew member registers ----------
const crew = await account('crew', crewEmail, 'Візажист')

await B.login(APP, crewEmail)
body = await ev('document.body.innerText')
ok('AC-1 both shoots appear, from two different photographers',
   body.includes('Студія Луна, Київ') && body.includes('Лофт на Подолі'),
   body.replace(/\n/g, ' | ').slice(0, 160))
ok('AC-1 each is marked as a shoot they are on, not one they created',
   (body.match(/В команді/g) || []).length === 2, body.replace(/\n/g, ' | ').slice(0, 160))
ok('AC-1 their role is shown', body.includes('Візажист'))
ok('the client\'s name is NOT shown to a crew member',
   !body.includes('Клієнт А') && !body.includes('Клієнт Б'), body.replace(/\n/g, ' | ').slice(0, 160))
ok('a crew-only account is not told it has no shoots',
   !body.includes('У вас ще немає зйомок'), body.replace(/\n/g, ' | ').slice(0, 120))

// The calendar must mark commitments, not just created shoots. The shoots are
// in December and the calendar opens on the current month, so it has to be
// stepped there first — an earlier version of this check looked at August,
// found nothing marked, and blamed the app.
const monthLabel = () => ev(`(()=>{const h=[...document.querySelectorAll('*')].find(e=>/^(Січень|Лютий|Березень|Квітень|Травень|Червень|Липень|Серпень|Вересень|Жовтень|Листопад|Грудень) \\d{4}$/.test(e.innerText.trim())); return h?h.innerText.trim():null})()`)
for (let i = 0; i < 24 && !(await monthLabel())?.startsWith('Грудень 2026'); i++) {
  await B.tapByText('›')
}
ok('AC-3 the calendar reaches the month the shoots are in', (await monthLabel()) === 'Грудень 2026', await monthLabel())
// bg-status-new is what ShootCalendar paints a date that has a shoot.
const marked = await ev(`JSON.stringify([...document.querySelectorAll('div')].filter(e=>e.className.includes('bg-status-new')).map(e=>e.innerText.trim()).filter(t=>/^\\d+$/.test(t)))`)
ok('AC-1 the calendar marks the crew shoots, not only created ones',
   JSON.parse(marked).includes('10') && JSON.parse(marked).includes('20'), `marked: ${marked}`)

// AC-4 still filters, across both kinds.
await B.tap(`[...document.querySelectorAll('div')].filter(e=>e.className.includes('bg-status-new')).find(e=>e.innerText.trim()==='10')`)
body = await ev('document.body.innerText')
ok('AC-4 tapping a date filters to that commitment',
   body.includes('Студія Луна, Київ') && !body.includes('Лофт на Подолі'),
   body.replace(/\n/g, ' | ').slice(-120))
await B.tapByText('Всі зйомки')

// A row with a link opens the reader's own link view.
const opened = await B.tap(`[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes('Студія Луна'))`)
ok('a row with a link opens their own link view', opened && (await ev('location.pathname')).startsWith('/s/'),
   await ev('location.pathname'))
body = await ev('document.body.innerText')
ok('and that view is the crew one they already had', body.includes('Оксана') && body.includes('Візажист'),
   body.replace(/\n/g, ' | ').slice(0, 110))

// A row with no link yet is inert rather than broken.
await B.navigate(`${APP}/`)
const inert = await ev(`(()=>{
  const r=[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes('Лофт на Подолі'));
  return r ? 'linked' : 'inert';
})()`)
ok('a shoot with no link yet is inert, not a broken link', inert === 'inert', inert)

// ---------- a photographer's own screen is unchanged ----------
await B.tapByText('Вийти')
await B.settle()
await B.login(APP, photoA.email)
body = await ev('document.body.innerText')
ok("a creator's own list still shows their client and status",
   body.includes('Клієнт А') && body.includes('Запланована'), body.replace(/\n/g, ' | ').slice(0, 130))
ok("and carries no В команді rows", !body.includes('В команді'), body.replace(/\n/g, ' | ').slice(0, 130))

// ---------- ADR-014 ----------
await photoB.client.rpc('soft_remove_crew_member', { crew_member_id: cB.id })
await B.tapByText('Вийти')
await B.settle()
await B.login(APP, crewEmail)
body = await ev('document.body.innerText')
ok('being removed from a shoot takes it off their schedule',
   !body.includes('Лофт на Подолі') && body.includes('Студія Луна, Київ'),
   body.replace(/\n/g, ' | ').slice(0, 140))

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
