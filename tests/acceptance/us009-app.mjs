import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
/**
 * US-009, second half — a registered crew member opens a shoot they are ON,
 * from inside the app, with no link involved (owner, 2026-09-21).
 *
 * The schedule has listed these shoots since `20260827100000`. Opening one
 * needed the crew member's access link, and a link is minted only when the
 * photographer taps «копіювати посилання» — so a crew member nobody had shared
 * with saw the row, could not open it, and could not answer `US-008` at all.
 *
 * **Nothing in this file mints a link.** That is the point of it: every
 * assertion below is made against a shoot whose `access_links` table is empty,
 * which is the exact state the old row was inert in.
 *
 * The entrance is the same gateway (`ADR-013`) with `?shoot=` instead of
 * `?token=`, and the caller's own JWT as the credential. So the questions this
 * suite has to answer are the ones the token path already answers for a token:
 * who is refused, what a refusal says, and whether `ADR-014`'s soft deletes
 * still revoke.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const stamp = Date.now()
const GW = `${process.env.SB_URL.replace(/\/+$/, '')}/functions/v1/link-gateway`

/** Phone numbers derived from the run stamp — see `us009-db.mjs` for why. */
const tail = String(stamp).slice(-7)
const ua = (prefix) => `0${prefix}${tail}`

const account = async (tag, role = 'Візажист', phone = null) => {
  const email = `us009app-${tag}-${stamp}@example.com`
  const client = anon()
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role, ...(phone ? { phone } : {}) } },
  })
  if (error) throw error
  const { data: session } = await client.auth.signInWithPassword({ email, password: 'testpass123' })
  return { client, id: data.user.id, email, jwt: session.session.access_token }
}

const shootFor = async (photo, clientName, extra = {}) => {
  const clientId = (await photo.client.from('clients')
    .insert({ creator_id: photo.id, name: clientName })
    .select('id').single()).data.id
  return (await photo.client.from('shoots')
    .insert({ creator_id: photo.id, client_id: clientId, date: '2026-12-30', ...extra })
    .select('id').single()).data.id
}

/** The signed-in entrance. `jwt` null sends no authorization header at all. */
const call = async (shootId, jwt) => {
  const r = await fetch(`${GW}?shoot=${encodeURIComponent(shootId ?? '')}`, {
    headers: { apikey: process.env.SB_ANON, ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
  })
  return { status: r.status, body: await r.json().catch(() => null) }
}

const answer = async (shootId, jwt, response, reason = null) => {
  const r = await fetch(GW, {
    method: 'POST',
    headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
    body: JSON.stringify({ shoot: shootId, response, reason }),
  })
  return { status: r.status, body: await r.json().catch(() => null) }
}

// ---------- the setup the owner described ----------
//
// A photographer adds somebody by PHONE who has no account yet, and never
// shares a link with them. They register later with the same number.
const photoA = await account('photoa', 'Фотограф')
const photoB = await account('photob', 'Фотограф')
const crewPhone = ua('93')

const shootA = await shootFor(photoA, 'Клієнт А', {
  location_address: 'Студія Луна, Київ',
  notes: 'Прийти за 30 хвилин до початку',
})
const shootB = await shootFor(photoB, 'Клієнт Б', { location_address: 'Лофт на Подолі' })

await photoA.client.from('crew_members')
  .insert({ shoot_id: shootA, name: 'Оксана', role: 'Візажист', phone: crewPhone })
// A peer on the same shoot, with a note — US-023's «нічого не приховано».
await photoA.client.from('crew_members')
  .insert({ shoot_id: shootA, name: 'Ігор', role: 'Гафер', phone: ua('67'), note: 'Має власне світло' })

const crew = await account('crew', 'Візажист', crewPhone)
const matched = (await photoA.client.from('crew_members')
  .select('id, user_id').eq('shoot_id', shootA).eq('phone', crewPhone).single()).data
ok('the phone-matched crew row is connected to the new account',
   matched.user_id === crew.id, JSON.stringify(matched))

const links = await photoA.client.from('access_links').select('id').eq('shoot_id', shootA)
ok('and no link has ever been created for that shoot — the old dead end',
   (links.data?.length ?? 0) === 0, JSON.stringify(links.data))

// ---------- it opens ----------
let r = await call(shootA, crew.jwt)
ok('a matched crew member can open the shoot with no link involved',
   r.status === 200 && r.body?.ok === true, JSON.stringify(r.body)?.slice(0, 120))
ok('and gets the CREW audience, never the client one',
   r.body?.audience === 'crew' && r.body?.shootId === shootA, JSON.stringify(r.body?.audience))
ok('the payload is addressed to their own crew row',
   r.body?.crewMemberId === matched.id && r.body?.viewer?.role === 'Візажист', JSON.stringify(r.body?.viewer))
ok('US-007 the shoot itself — date and location',
   r.body?.shoot?.date === '2026-12-30' && r.body?.shoot?.locationAddress === 'Студія Луна, Київ',
   JSON.stringify(r.body?.shoot?.locationAddress))
ok('US-023 a peer\'s note reaches the crew audience',
   r.body?.crew?.find((m) => m.name === 'Ігор')?.note === 'Має власне світло',
   JSON.stringify(r.body?.crew?.map((m) => m.name)))
ok('the organizer is named, so the reader can reach them',
   r.body?.organizer?.name === 'photoa', JSON.stringify(r.body?.organizer?.name))
ok('the shoot\'s production note reaches the crew audience (US-026\'s other side)',
   r.body?.shoot?.notes === 'Прийти за 30 хвилин до початку', JSON.stringify(r.body?.shoot?.notes))

// ---------- who is refused ----------
r = await call(shootA, null)
ok('no session at all is denied', r.status === 404 && r.body?.ok === false, JSON.stringify(r.body))
r = await call(shootA, process.env.SB_ANON)
ok('the anon key is not a session — denied', r.status === 404 && r.body?.ok === false, JSON.stringify(r.body))
r = await call(shootA, `${crew.jwt}tampered`)
ok('a tampered JWT is denied', r.status === 404 && r.body?.ok === false, JSON.stringify(r.body))
r = await call(shootB, crew.jwt)
ok('a shoot they are NOT on is denied, whoever created it',
   r.status === 404 && r.body?.ok === false, JSON.stringify(r.body))
ok('and the denial carries no shoot data',
   !r.body?.shootId && !r.body?.shoot, JSON.stringify(r.body))
r = await call(shootA, photoB.jwt)
ok('another photographer\'s account gets nothing from this entrance', r.status === 404)
r = await call(shootA, photoA.jwt)
ok('the creator gets nothing from it either — they have their own screen',
   r.status === 404, JSON.stringify(r.body))
r = await call('not-a-uuid', crew.jwt)
ok('a malformed shoot id is denied rather than erroring', r.status === 404, String(r.status))

// ---------- US-008 through the same door ----------
let a = await answer(shootA, crew.jwt, 'confirmed')
ok('US-008 they can answer from the app, which they could not before',
   a.status === 200 && a.body?.ok === true, JSON.stringify(a.body))
let after = (await photoA.client.from('crew_members').select('response').eq('id', matched.id).single()).data
ok('and the photographer sees the answer on their own screen',
   after.response === 'confirmed', JSON.stringify(after))

a = await answer(shootA, crew.jwt, 'declined', 'Передумала')
after = (await photoA.client.from('crew_members').select('response, decline_reason').eq('id', matched.id).single()).data
ok('US-008 a submitted response is still final — the second answer changes nothing',
   after.response === 'confirmed' && after.decline_reason === null, JSON.stringify(after))

a = await answer(shootA, null, 'confirmed')
ok('and an unauthenticated write is denied', a.status === 404, JSON.stringify(a.body))

// A decline, with its reason, on a second shoot — the path US-008 AC-1 draws.
const shootC = await shootFor(photoB, 'Клієнт В', { location_address: 'Павільйон 4' })
const onC = (await photoB.client.from('crew_members')
  .insert({ shoot_id: shootC, name: 'Оксана', role: 'Візажист', phone: crewPhone })
  .select('id, user_id').single()).data
ok('a shoot added AFTER registration matches too, and needs no link either',
   onC.user_id === crew.id, JSON.stringify(onC))
a = await answer(shootC, crew.jwt, 'declined', 'Зайнята того дня')
after = (await photoB.client.from('crew_members').select('response, decline_reason').eq('id', onC.id).single()).data
ok('US-008 a decline carries its reason through this entrance',
   after.response === 'declined' && after.decline_reason === 'Зайнята того дня', JSON.stringify(after))

// ---------- ADR-014: the same two things still revoke ----------
await photoB.client.rpc('soft_remove_crew_member', { crew_member_id: onC.id })
r = await call(shootC, crew.jwt)
ok('ADR-014 removing the crew member closes this entrance too',
   r.status === 404 && r.body?.ok === false, JSON.stringify(r.body))

const shootD = await shootFor(photoA, 'Клієнт Г', { location_address: 'Дах' })
await photoA.client.from('crew_members')
  .insert({ shoot_id: shootD, name: 'Оксана', role: 'Візажист', phone: crewPhone })
r = await call(shootD, crew.jwt)
ok('(control) the fourth shoot opens before it is deleted', r.body?.ok === true)
await photoA.client.rpc('soft_delete_shoot', { shoot_id: shootD })
r = await call(shootD, crew.jwt)
ok('ADR-014 deleting the shoot closes it for everyone on it',
   r.status === 404 && r.body?.ok === false, JSON.stringify(r.body))

// ---------- the schedule no longer carries a token ----------
const { data: schedule } = await crew.client.rpc('my_crew_shoots')
ok('the schedule still lists the shoots they are on', (schedule?.length ?? 0) >= 1, JSON.stringify(schedule?.length))
ok('and no longer carries a token, because the row no longer needs one',
   schedule.every((row) => !('token' in row)), JSON.stringify(Object.keys(schedule[0] ?? {})))
ok('a removed row and a deleted shoot are both off it',
   !schedule.some((row) => row.shoot_id === shootC || row.shoot_id === shootD), JSON.stringify(schedule.map((s) => s.shoot_id)))

// ---------- parity with the link the photographer might still send ----------
//
// The two entrances must not drift: whatever US-007 gives through a token, this
// gives through a session, because both call `crewPayload`.
const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await photoA.client.from('access_links')
  .insert({ token, shoot_id: shootA, audience: 'crew', crew_member_id: matched.id })
const viaToken = await (await fetch(`${GW}?token=${token}`, {
  headers: { apikey: process.env.SB_ANON, authorization: `Bearer ${process.env.SB_ANON}` },
})).json()
const viaSession = (await call(shootA, crew.jwt)).body
const strip = (p) => JSON.stringify({ ...p, references: p.references?.length, crew: p.crew?.map((m) => [m.name, m.note]) })
ok('the link and the app resolve to the same payload for the same person',
   strip(viaToken) === strip(viaSession), strip(viaSession)?.slice(0, 110))

process.exit(0)
