import { SITE_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * «Нотатки для клієнта» — `shoots.client_notes`, migration `20260905160000`.
 *
 * **Named for no story, because no story covers it.** The owner asked for the
 * field on 2026-09-05 after `Shoot Detail v3.dc.html` grew it; `US-002`,
 * `US-018` and `US-026` all need amending (docs/redesign-log.md). The file is
 * named for the field instead, like `softdelete-fn.mjs` is named for the
 * function it exercises.
 *
 * ── What this suite is actually for ─────────────────────────────────────────
 *
 * The shoot now carries TWO notes whose names differ by a prefix and whose
 * audiences are opposite:
 *
 *   `shoots.notes`        → crew only.   Selected in `crewPayload`.
 *   `shoots.client_notes` → client only. Selected in `clientPayload`.
 *
 * A copy-paste between those two SELECT lists is the single most plausible way
 * this breaks, and it breaks silently: the screens would keep rendering, and
 * the only visible symptom would be a client reading the crew's note. So every
 * assertion below is run on ONE shoot through TWO tokens, and asserts the
 * contrast rather than an absence — `us026-check.mjs`'s method, for the same
 * reason it uses it.
 *
 * The crew half of that contrast is `US-026`'s territory and is already covered
 * there; what is new here is the direction nothing tested before, a column that
 * must reach the client and must NOT reach the crew.
 */
import { createClient } from '@supabase/supabase-js'
const SITE = SITE_URL
const GW = `${process.env.SB_URL.replace(/\/+$/, '')}/functions/v1/link-gateway`
const call = async (token) =>
  (await fetch(`${GW}?token=${encodeURIComponent(token)}`, {
    headers: { apikey: process.env.SB_KEY, authorization: `Bearer ${process.env.SB_KEY}` },
  })).json()
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

/* Two notes on one shoot, each unmistakable in a body of text. */
const TEAM_NOTE = 'ДЛЯ КОМАНДИ: софтбокс лишити в машині'
const CLIENT_NOTE = 'ДЛЯ КЛІЄНТА: візьміть 2–3 комплекти одягу'

const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `client-notes-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({ email, password: 'testpass123' })
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })

const { data: shoot } = await db
  .from('shoots')
  .insert({
    creator_id: acc.user.id,
    client_name: 'Оля',
    client_contact: 'olya@example.com',
    date: '2026-12-30',
    notes: TEAM_NOTE,
    client_notes: CLIENT_NOTE,
  })
  .select('id').single()
const sid = shoot.id

/* A second shoot with neither note: the absent case has to be a null on the
   wire rather than a missing key, or a screen testing `payload.shoot.clientNotes`
   would read `undefined` and pass for the wrong reason. */
const { data: bare } = await db
  .from('shoots')
  .insert({ creator_id: acc.user.id, client_name: 'Без нотаток', client_contact: 'x', date: '2026-12-31' })
  .select('id').single()

const { data: viewer } = await db.from('crew_members')
  .insert({ shoot_id: sid, name: 'Ігор', role: 'Гафер', phone: '+380501112233' })
  .select('id').single()

const crewToken = newToken()
const clientToken = newToken()
const bareClientToken = newToken()
await db.from('access_links').insert({ token: crewToken, shoot_id: sid, audience: 'crew', crew_member_id: viewer.id })
await db.from('access_links').insert({ token: clientToken, shoot_id: sid, audience: 'client' })
await db.from('access_links').insert({ token: bareClientToken, shoot_id: bare.id, audience: 'client' })

// ---------- the payload ----------
const asCrew = await call(crewToken)
const asClient = await call(clientToken)
const asBare = await call(bareClientToken)
const crewRaw = JSON.stringify(asCrew)
const clientRaw = JSON.stringify(asClient)

ok('the fixture is real — the crew audience receives the CREW note',
   asCrew.shoot?.notes === TEAM_NOTE, JSON.stringify(asCrew.shoot?.notes))
ok('the client audience receives the CLIENT note',
   asClient.shoot?.clientNotes === CLIENT_NOTE, JSON.stringify(asClient.shoot?.clientNotes))

ok('the crew payload carries no clientNotes key at all',
   !crewRaw.includes('clientNotes'), Object.keys(asCrew.shoot ?? {}).join(','))
ok('and no client-note TEXT anywhere in the crew payload', !crewRaw.includes(CLIENT_NOTE))

ok('rule 2 unbroken: the client payload still carries no `notes` key',
   !clientRaw.includes('"notes"'), Object.keys(asClient.shoot ?? {}).join(','))
ok('and no crew-note TEXT anywhere in the client payload', !clientRaw.includes(TEAM_NOTE))

ok('an unwritten note reaches the client as null, not as a missing key',
   'clientNotes' in (asBare.shoot ?? {}) && asBare.shoot.clientNotes === null,
   JSON.stringify(asBare.shoot?.clientNotes))

// ---------- the screen ----------
const B = await openBrowser({ port: 9570, width: 390, height: 1600 })
const { ev } = B

await B.navigate(`${SITE}/s/${clientToken}`)
let body = await ev('document.body.innerText')
ok('the client sees their note on the link view', body.includes(CLIENT_NOTE),
   body.replace(/\n/g, ' | ').slice(0, 160))
ok('under «Нотатки від організатора», not «Нотатки для клієнта»',
   body.includes('Нотатки від організатора') && !body.includes('Нотатки для клієнта'),
   body.replace(/\n/g, ' | ').slice(0, 160))
ok('and never the crew note', !body.includes(TEAM_NOTE))
ok('and no «Клієнт не бачить» badge on a card the client is reading',
   !body.includes('Клієнт не бачить'), body.replace(/\n/g, ' | ').slice(0, 160))

// The contrast: the SAME shoot, a crew token.
await B.navigate(`${SITE}/s/${crewToken}`)
body = await ev('document.body.innerText')
ok('the crew member still sees their own note', body.includes(TEAM_NOTE),
   body.replace(/\n/g, ' | ').slice(0, 160))
ok('the crew member does NOT see the client note', !body.includes(CLIENT_NOTE),
   body.replace(/\n/g, ' | ').slice(0, 160))

// S-2 F-2 — the prerendered HTML is served before any script runs, so a leak
// there is a leak to anything that fetches the page without executing it.
await B.send('Emulation.setScriptExecutionDisabled', { value: true })
await B.navigateRaw(`${SITE}/s/${crewToken}`)
body = await ev('document.body.innerText')
ok('S-2 F-2 no client note baked into the crew page’s static HTML', !body.includes(CLIENT_NOTE))
await B.send('Emulation.setScriptExecutionDisabled', { value: false })

// ---------- ADR-014 ----------
await db.rpc('soft_delete_shoot', { shoot_id: sid })
const afterDelete = JSON.stringify(await call(clientToken))
ok('a deleted shoot stops serving the client note too', !afterDelete.includes(CLIENT_NOTE))

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
