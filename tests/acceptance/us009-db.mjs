import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
/**
 * US-009 at the data layer: the matching rules from spike S-5, and the query
 * the schedule is built on.
 *
 * Every write here is made by the account that would really make it. The
 * service role is deliberately not used as a shortcut — it holds SELECT only
 * (the grants migration gives the link gateway exactly what it needs and no
 * more), and reaching for it would have tested a path no user can take.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const stamp = Date.now()

/**
 * Phone numbers, derived from `stamp` like the email addresses are.
 *
 * The local database is not reset between runs and nothing here cleans up, so a
 * hardcoded number gains another holder on every run — and the S-5 F-2
 * exactly-one rule then refuses to match it, correctly, turning a green suite
 * red on its second execution. `tail` keeps them UA-mobile shaped so
 * `normalise_phone` recognises them: `0XXXXXXXXX`, ten digits.
 */
const tail = String(stamp).slice(-7)
const ua = (prefix) => `0${prefix}${tail}`

/** A signed-in client for a fresh account. */
const account = async (tag, email = `us009-${tag}-${stamp}@example.com`, role = 'Візажист') => {
  const client = anon()
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role } },
  })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  return { client, id: data.user.id, email }
}
/**
 * A shoot, and the client row it now hangs off.
 *
 * `client_name` and `client_contact` were columns on `shoots` when this suite
 * was written; `ADR-018` (migration 20260829100000) replaced them with a
 * `clients` row and a not-null `client_id`, which left every insert here
 * failing on a column the schema cache no longer knows.
 */
const shootFor = async (photo, clientName) => {
  const clientId = (await photo.client.from('clients')
    .insert({ creator_id: photo.id, name: clientName })
    .select('id').single()).data.id
  return (await photo.client.from('shoots')
    .insert({ creator_id: photo.id, client_id: clientId, date: '2026-12-30' })
    .select('id').single()).data.id
}

const photoA = await account('photoa', undefined, 'Фотограф')
const photoB = await account('photob', undefined, 'Фотограф')
const shootA = await shootFor(photoA, 'Клієнт А')
const shootB = await shootFor(photoB, 'Клієнт Б')

// ---------- S-5 F-4 direction 2: added FIRST, registers AFTER ----------
const crewEmail = `us009-crew-${stamp}@example.com`
await photoA.client.from('crew_members').insert({ shoot_id: shootA, name: 'Оксана', role: 'Візажист', email: crewEmail })
await photoB.client.from('crew_members').insert({ shoot_id: shootB, name: 'Оксана', role: 'Візажист', email: crewEmail.toUpperCase() })
let row = (await photoA.client.from('crew_members').select('user_id').eq('shoot_id', shootA).single()).data
ok('before the account exists, the crew row is unmatched', row.user_id === null, JSON.stringify(row))

const crew = await account('crew', crewEmail)
const a = (await photoA.client.from('crew_members').select('user_id').eq('shoot_id', shootA).single()).data
const b = (await photoB.client.from('crew_members').select('user_id').eq('shoot_id', shootB).single()).data
ok('AC-1 registering backfills a shoot added earlier', a.user_id === crew.id, JSON.stringify(a))
ok('AC-1 and the second one too, from a different photographer', b.user_id === crew.id, JSON.stringify(b))
ok('S-5 matching is case-insensitive on email', b.user_id === crew.id)

// ---------- direction 1: registered FIRST, added AFTER ----------
const shootC = await shootFor(photoA, 'Клієнт В')
const added = (await photoA.client.from('crew_members')
  .insert({ shoot_id: shootC, name: 'Оксана', role: 'Гафер', email: crewEmail }).select('user_id').single()).data
ok('AC-1 someone added after registering is matched on insert', added.user_id === crew.id, JSON.stringify(added))

// ---------- S-5 F-2: no guessing ----------
const stranger = (await photoA.client.from('crew_members')
  .insert({ shoot_id: shootC, name: 'Чужий', role: 'Гафер', phone: ua('93') }).select('user_id').single()).data
ok('a contact with no account stays unmatched', stranger.user_id === null, JSON.stringify(stranger))
const junk = (await photoA.client.from('crew_members')
  .insert({ shoot_id: shootC, name: 'Текст', role: 'Гафер', phone: 'спитати у Наталії' }).select('user_id').single()).data
ok('S-5 F-2 an unparseable contact matches nobody rather than guessing', junk.user_id === null, JSON.stringify(junk))

// ---------- AC-1: one view, both photographers ----------
const sched = await crew.client.rpc('my_crew_shoots')
ok('AC-1 the schedule returns every shoot they are on', sched.data?.length === 3,
   JSON.stringify(sched.error ?? sched.data?.length))
ok('AC-1 from two different photographers, in one view',
   new Set(sched.data.map((r) => r.shoot_id)).size === 3)
ok('AC-1 each row carries their own role and response',
   sched.data.every((r) => r.role && r.response), JSON.stringify(sched.data[0]))

// ---------- the security boundary ----------
ok('the schedule carries no client details',
   !('client_name' in sched.data[0]) && !('client_contact' in sched.data[0]),
   Object.keys(sched.data[0]).join(','))
ok('and a crew member still cannot read the shoots table itself',
   ((await crew.client.from('shoots').select('id, client_id')).data ?? []).length === 0)

// ---------- AC-2 ----------
ok('AC-2 an anonymous caller has no schedule', ((await anon().rpc('my_crew_shoots')).data ?? []).length === 0)
const outsider = await account('outsider')
ok('AC-2 an account never added to a shoot has an empty schedule, not an error',
   (await outsider.client.rpc('my_crew_shoots')).data?.length === 0)

// ---------- ADR-014 ----------
await photoA.client.rpc('soft_remove_crew_member', {
  crew_member_id: (await photoA.client.from('crew_members').select('id').eq('shoot_id', shootC).eq('email', crewEmail).single()).data.id,
})
ok('a removed crew member loses that shoot from their schedule',
   (await crew.client.rpc('my_crew_shoots')).data.length === 2)
await photoB.client.rpc('soft_delete_shoot', { shoot_id: shootB })
ok('a deleted shoot leaves every schedule it was on',
   (await crew.client.rpc('my_crew_shoots')).data.length === 1)

// ---------- a creator on their own crew ----------
await photoA.client.from('crew_members').insert({ shoot_id: shootA, name: 'Фотограф', role: 'Фотограф', email: photoA.email })
ok('a creator added to their own crew does not see their own shoot as a commitment',
   (await photoA.client.rpc('my_crew_shoots')).data.length === 0,
   JSON.stringify((await photoA.client.rpc('my_crew_shoots')).data))

// ---------- a match key that arrives AFTER registration (20260907120000) ----------
//
// `ADR-015` accepted one cost when it chose email + password: "a person added
// as crew by phone number only must also enter that phone on their profile
// before the match can fire". Entering it did nothing until the update trigger
// existed — `users_match_crew_members` was `after insert` alone.
const latePhone = ua('67')
const shootD = await shootFor(photoA, 'Клієнт Г')
await photoA.client.from('crew_members')
  .insert({ shoot_id: shootD, name: 'Ігор', role: 'Гафер', phone: latePhone })
const late = await account('late')
const lateRow = async () =>
  (await photoA.client.from('crew_members').select('user_id').eq('shoot_id', shootD).eq('name', 'Ігор').single()).data

ok('registering does not match a phone-only crew row — signup carries no phone',
   (await lateRow()).user_id === null, JSON.stringify(await lateRow()))
await late.client.from('users').update({ phone: latePhone }).eq('id', late.id)
ok('ADR-015 entering that phone on the profile matches the row',
   (await lateRow()).user_id === late.id, JSON.stringify(await lateRow()))
ok('and the shoot reaches their schedule',
   ((await late.client.rpc('my_crew_shoots')).data ?? []).some((r) => r.shoot_id === shootD))

// Additive only. Revoking a crew member is `removed_at` and the photographer's
// decision (ADR-014, US-022), not a side effect of someone editing a profile.
await late.client.from('users').update({ phone: ua('63') }).eq('id', late.id)
ok('changing the key away does not unmatch',
   (await lateRow()).user_id === late.id, JSON.stringify(await lateRow()))

// S-5 F-2 still decides on this path too: two accounts carrying the same phone
// are two candidates, and two candidates is no match.
const shared = ua('66')
const twinA = await account('twina')
const twinB = await account('twinb')
await twinA.client.from('users').update({ phone: shared }).eq('id', twinA.id)
await twinB.client.from('users').update({ phone: shared }).eq('id', twinB.id)
const shootE = await shootFor(photoA, 'Клієнт Д')
await photoA.client.from('crew_members')
  .insert({ shoot_id: shootE, name: 'Двійник', role: 'Гафер', phone: shared })
// Away and back, because the trigger's WHEN ignores a write that changes nothing.
await twinB.client.from('users').update({ phone: ua('68') }).eq('id', twinB.id)
await twinB.client.from('users').update({ phone: shared }).eq('id', twinB.id)
ok('S-5 F-2 two accounts on one phone stay two candidates, so the row keeps no match',
   (await photoA.client.from('crew_members').select('user_id').eq('shoot_id', shootE).single()).data.user_id === null)

process.exit(0)
