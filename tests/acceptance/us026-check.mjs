import { SITE_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * US-026 — a CLIENT reads a crew member's details and gets everything except
 * the notes.
 *
 * The point of this suite is the CONTRAST. Asserting "the client's screen has no
 * notes" alone is weak: it passes just as well if the note was never written, if
 * the crew member does not exist, or if the screen failed to load. So every
 * check below is run twice on the SAME person through TWO tokens — a crew token
 * and a client token — and the assertion is that one shows the note and the
 * other does not.
 */
import { createClient } from '@supabase/supabase-js'
const SITE = SITE_URL
const GW = `${process.env.SB_URL.replace(/\/+$/, '')}/functions/v1/link-gateway`
const call = async (token) =>
  (await fetch(`${GW}?token=${encodeURIComponent(token)}`, {
    headers: { apikey: process.env.SB_KEY, authorization: `Bearer ${process.env.SB_KEY}` },
  })).json()
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

const NOTE = 'ВЕЛИКА ТАЄМНИЦЯ: просить каву без цукру'
const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `us026-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({ email, password: 'testpass123' })
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })
const { data: shoot } = await db
  .from('shoots')
  .insert({ creator_id: acc.user.id, client_name: 'Оля', client_contact: 'olya@example.com', date: '2026-12-30' })
  .select('id').single()
const sid = shoot.id

const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAgACABAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiigD//2Q==', 'base64')
const notePath = `${sid}/crew/${crypto.randomUUID()}.jpg`
await db.storage.from('shoot-media').upload(notePath, jpg, { contentType: 'image/jpeg' })

// One person with EVERY field filled, so an absence in the client's view is
// always the rule working and never a missing fixture.
const { data: subject } = await db.from('crew_members').insert({
  shoot_id: sid, name: 'Оксана', role: 'Візажист',
  phone: '+380509876543', instagram: '@oksana', telegram: '@oksana_tg',
  note: NOTE, note_image: notePath,
}).select('id').single()
const { data: viewer } = await db.from('crew_members')
  .insert({ shoot_id: sid, name: 'Ігор', role: 'Гафер', phone: '+380501112233' })
  .select('id').single()

const crewToken = newToken()
const clientToken = newToken()
await db.from('access_links').insert({ token: crewToken, shoot_id: sid, audience: 'crew', crew_member_id: viewer.id })
await db.from('access_links').insert({ token: clientToken, shoot_id: sid, audience: 'client' })

// ---------- the payload: rule 2, on the wire ----------
const asCrew = await call(crewToken)
const asClient = await call(clientToken)
const clientRaw = JSON.stringify(asClient)
const crewSubject = asCrew.crew.find((c) => c.id === subject.id)
const clientSubject = asClient.crew.find((c) => c.id === subject.id)

ok('the fixture is real — the crew audience does receive the note', crewSubject?.note === NOTE)
ok('AC-1 the client receives the same person', clientSubject?.id === subject.id && clientSubject?.name === 'Оксана')
ok('AC-1 with name, role, contact and Instagram',
   clientSubject?.role === 'Візажист' && clientSubject?.contact === '+380509876543' && clientSubject?.instagram === '@oksana',
   JSON.stringify(clientSubject))
/*
  Telegram is a FIFTH field, added on the owner's instruction 2026-09-05.
  `US-026` AC-1 names four and wants amending — see docs/redesign-log.md. It is
  asserted positively here so the count below cannot be satisfied by a key that
  arrives empty.
*/
ok('AC-1 and Telegram, added 2026-09-05', clientSubject?.telegram === '@oksana_tg',
   JSON.stringify(clientSubject?.telegram))
ok('AC-1 RULE 2: no note text anywhere in the client payload', !clientRaw.includes(NOTE))
ok('AC-1 and no `note` key — "not even an empty one"',
   !clientRaw.includes('"note"') && !clientRaw.includes('noteImage'),
   Object.keys(clientSubject ?? {}).join(','))
/*
  The list is exhaustive on purpose: this is the assertion that fails when
  somebody widens `clientPayload`'s crew select without meaning to. It went from
  five to six on 2026-09-05 when Telegram was added deliberately — which is the
  only way it should ever move.
*/
ok('AC-1 the client is given exactly six fields and no more',
   JSON.stringify(Object.keys(clientSubject ?? {}).sort()) === JSON.stringify(['contact','id','instagram','name','role','telegram']),
   Object.keys(clientSubject ?? {}).sort().join(','))
ok('AC-1 the note image path never reaches the client either', !clientRaw.includes(notePath))

// ---------- the screen ----------
const B = await openBrowser({ port: 9556, width: 390, height: 1400 })
const { ev } = B

// The client's shoot view (US-010) is where AC-1's click starts.
await B.navigate(`${SITE}/s/${clientToken}`)
let body = await ev('document.body.innerText')
ok('AC-1 the client sees the team on their shoot view', body.includes('Оксана') && body.includes('Візажист'),
   body.replace(/\n/g, ' | ').slice(0, 110))
ok('the client shoot view shows no note either', !body.includes(NOTE))

const tapped = await B.tap(`[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes('Оксана'))`)
ok('AC-1 a crew member row is clickable through', tapped && (await ev('location.pathname')).includes('/crew/'),
   await ev('location.pathname'))

body = await ev('document.body.innerText')
ok('AC-1 the client sees the details screen',
   body.includes('Деталі учасника') && body.includes('Оксана') && body.includes('Візажист'),
   body.replace(/\n/g, ' | ').slice(0, 140))
ok('AC-1 including contact and Instagram', body.includes('+380509876543') && body.includes('@oksana'))
ok('AC-1 with NO notes value', !body.includes(NOTE), body.replace(/\n/g, ' | ').slice(0, 160))
ok('AC-1 and no notes LABEL — "not even an empty one"', !body.includes('Нотатки'),
   body.replace(/\n/g, ' | ').slice(0, 160))
const clientImgs = await ev('document.querySelectorAll("img").length')
ok('AC-1 no note image on the client screen', clientImgs === 0, `img count: ${clientImgs}`)

// The contrast: the SAME person, the SAME route, a crew token.
await B.navigate(`${SITE}/s/${crewToken}/crew/${subject.id}`)
body = await ev('document.body.innerText')
ok('US-023 unbroken: the same route shows the note to a crew member',
   body.includes('Нотатки') && body.includes(NOTE), body.replace(/\n/g, ' | ').slice(0, 140))
ok('US-023 unbroken: the note image still renders for crew',
   (await ev('[...document.querySelectorAll("img")].filter(i=>i.naturalWidth>0).length')) >= 1)

// ---------- AC-2 ----------
await B.navigate(`${SITE}/s/${newToken()}/crew/${subject.id}`)
body = await ev('document.body.innerText')
ok('AC-2 an unknown token cannot reach the details', body.includes('Це посилання більше не діє') && !body.includes('Оксана'),
   body.replace(/\n/g, ' | ').slice(0, 90))

// A client link cannot reach someone on a different shoot.
const { data: other } = await db.from('shoots')
  .insert({ creator_id: acc.user.id, client_name: 'Інша', client_contact: 'x', date: '2027-01-05' })
  .select('id').single()
const { data: stranger } = await db.from('crew_members')
  .insert({ shoot_id: other.id, name: 'ЧУЖИЙ', role: 'Гафер', phone: '+1' })
  .select('id').single()
await B.navigate(`${SITE}/s/${clientToken}/crew/${stranger.id}`)
body = await ev('document.body.innerText')
ok('AC-2 a client cannot reach a person on another shoot',
   body.includes('Це посилання більше не діє') && !body.includes('ЧУЖИЙ'), body.replace(/\n/g, ' | ').slice(0, 90))

// S-2 F-2 — the prerendered HTML must not accuse a valid link of being dead.
await B.send('Emulation.setScriptExecutionDisabled', { value: true })
await B.navigateRaw(`${SITE}/s/${clientToken}/crew/${subject.id}`)
body = await ev('document.body.innerText')
ok('S-2 F-2 the prerendered client details page shows no error copy',
   !body.includes('Це посилання більше не діє'), JSON.stringify(body?.slice(0, 60)))
ok('S-2 F-2 and no note is baked into the static HTML', !body.includes(NOTE))
await B.send('Emulation.setScriptExecutionDisabled', { value: false })

// ---------- ADR-014: a deleted shoot closes the client's details too ----------
await db.rpc('soft_delete_shoot', { shoot_id: sid })
await B.navigate(`${SITE}/s/${clientToken}/crew/${subject.id}`)
body = await ev('document.body.innerText')
ok('AC-2 a deleted shoot closes the client details and leaks no note',
   body.includes('Це посилання більше не діє') && !body.includes(NOTE) && !body.includes('Оксана'),
   body.replace(/\n/g, ' | ').slice(0, 90))

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
