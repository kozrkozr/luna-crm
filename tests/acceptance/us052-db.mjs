import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
/**
 * US-052 at the data layer: without access the database refuses AC-2's writes
 * (AC-3), lets AC-4's through, keeps reads (AC-1) and gives everything back the
 * moment access returns (AC-7).
 *
 * Access is written the way the RevenueCat webhook writes it — a row in
 * `account_access` under the service role (`S-7`). Every other write is made by
 * the account itself, bypassing the app, which is exactly AC-3's premise.
 *
 * Supabase only.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const service = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const stamp = Date.now()

const account = async (tag) => {
  const client = anon()
  const email = `us052-${tag}-${stamp}@example.com`
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role: 'photographer' } },
  })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  return { client, id: data.user.id }
}

const HOUR = 3600 * 1000
const setAccess = async (id, expiresAt) => {
  const { error } = await service.from('account_access').upsert({
    user_id: id, entitlement: 'base', expires_at: expiresAt, product_id: 'com.lunashoots.ios.base.monthly',
    period_type: 'trial', store: 'test_store', is_sandbox: true, will_renew: true,
  })
  if (error) throw error
}
const refused = (res) => res.error?.code === '42501'

const photo = await account('photo')
const c = photo.client

// ---------- while the trial runs, the account makes one of everything ----------
await setAccess(photo.id, new Date(Date.now() + 14 * 24 * HOUR).toISOString())
const clientId = (await c.from('clients').insert({ creator_id: photo.id, name: 'Клієнт' }).select('id').single()).data?.id
const shootId = (await c.from('shoots').insert({ creator_id: photo.id, client_id: clientId, date: '2026-12-01' }).select('id').single()).data?.id
const crewId = (await c.from('crew_members').insert({ shoot_id: shootId, name: 'Оля', role: 'makeup', phone: '0501112233' }).select('id').single()).data?.id
const refId = (await c.from('shoot_references').insert({ shoot_id: shootId, kind: 'link', url_or_path: 'https://example.com/a', category: 'light' }).select('id').single()).data?.id
const contactRes = await c.from('contacts').insert({ creator_id: photo.id, name: 'Контакт', role: 'stylist', phone: `050${String(stamp).slice(-7)}` }).select('id').single()
const contactId = contactRes.data?.id
ok('setup: with access, every write goes through', Boolean(clientId && shootId && crewId && refId && contactId),
  JSON.stringify({ clientId, shootId, crewId, refId, contactId }))

// ---------- the trial ends ----------
await setAccess(photo.id, new Date(Date.now() - HOUR).toISOString())

// AC-3 — creating
let res = await c.from('clients').insert({ creator_id: photo.id, name: 'Ще клієнт' })
ok('AC-3 a client cannot be created', refused(res), JSON.stringify(res.error))
res = await c.from('shoots').insert({ creator_id: photo.id, client_id: clientId, date: '2026-12-02' })
ok('AC-3 a shoot cannot be created', refused(res), JSON.stringify(res.error))
res = await c.from('crew_members').insert({ shoot_id: shootId, name: 'Ігор', role: 'light', phone: '0502223344' })
ok('AC-3 a crew member cannot be added', refused(res), JSON.stringify(res.error))
res = await c.from('shoot_references').insert({ shoot_id: shootId, kind: 'link', url_or_path: 'https://example.com/b', category: 'light' })
ok('AC-3 a reference cannot be added', refused(res), JSON.stringify(res.error))
res = await c.from('contacts').insert({ creator_id: photo.id, name: 'Ще контакт', role: 'stylist', phone: '0503334455' })
ok('AC-3 a contact cannot be created', refused(res), JSON.stringify(res.error))
res = await c.storage.from('shoot-media').upload(`${shootId}/references/${stamp}.jpg`, new Blob(['x']), { contentType: 'image/jpeg' })
ok('AC-3 a file cannot be uploaded', res.error !== null, JSON.stringify(res.error))

// AC-3 — editing
res = await c.from('shoots').update({ date: '2026-12-03' }).eq('id', shootId)
ok('AC-3 a shoot cannot be edited', refused(res), JSON.stringify(res.error))
res = await c.from('crew_members').update({ name: 'Оля К.' }).eq('id', crewId)
ok('AC-3 a crew member cannot be edited', refused(res), JSON.stringify(res.error))
res = await c.from('shoot_references').update({ category: 'pose' }).eq('id', refId)
ok('AC-3 a reference cannot be edited', refused(res), JSON.stringify(res.error))
res = await c.from('clients').update({ name: 'Клієнтка' }).eq('id', clientId)
ok('AC-3 a client cannot be edited', refused(res), JSON.stringify(res.error))
res = await c.from('contacts').update({ name: 'Контактка' }).eq('id', contactId)
ok('AC-3 a contact cannot be edited', refused(res), JSON.stringify(res.error))

// AC-3 — deleting
res = await c.rpc('soft_remove_crew_member', { crew_member_id: crewId })
ok('AC-3 a crew member cannot be removed', refused(res), JSON.stringify(res.error))
res = await c.rpc('soft_remove_reference', { reference_id: refId })
ok('AC-3 a reference cannot be removed', refused(res), JSON.stringify(res.error))
res = await c.rpc('soft_delete_client', { client_id: clientId })
ok('AC-3 a client cannot be deleted', refused(res), JSON.stringify(res.error))
res = await c.rpc('soft_delete_shoot', { shoot_id: shootId })
ok('AC-3 a shoot cannot be deleted', refused(res), JSON.stringify(res.error))
res = await c.from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', contactId)
ok('AC-3 a contact cannot be deleted', refused(res), JSON.stringify(res.error))

// AC-1 / AC-6 — everything is still there, unchanged
const shoot = (await c.from('shoots').select('date, deleted_at').eq('id', shootId).single()).data
ok('AC-1 the shoot is still visible, unchanged', shoot?.date === '2026-12-01' && shoot?.deleted_at === null, JSON.stringify(shoot))
const crew = (await c.from('crew_members').select('name').eq('id', crewId).single()).data
ok('AC-1 the crew member is still visible, unchanged', crew?.name === 'Оля', JSON.stringify(crew))
const refs = (await c.from('shoot_references').select('id').eq('shoot_id', shootId)).data
ok('AC-1 the reference is still visible', refs?.length === 1, JSON.stringify(refs))

// AC-4 — what stays allowed
res = await c.from('users').update({ name: 'Нове імʼя' }).eq('id', photo.id).select('name').single()
ok('AC-4 the profile can still be edited', res.data?.name === 'Нове імʼя', JSON.stringify(res.error))
res = await c.from('users').update({ currency: 'EUR' }).eq('id', photo.id).select('currency').single()
ok('AC-4 the currency can still be changed', res.data?.currency === 'EUR', JSON.stringify(res.error))
res = await c.storage.from('avatars').upload(`${photo.id}/${stamp}.jpg`, new Blob(['x']), { contentType: 'image/jpeg' })
ok('AC-4 an avatar can still be uploaded', res.error === null, JSON.stringify(res.error))
res = await c.from('access_links').insert({ token: `us052-${stamp}`, shoot_id: shootId, audience: 'crew', crew_member_id: crewId }).select('token').single()
ok('AC-4 a crew member\'s link can still be copied (minted on first copy)', res.data?.token === `us052-${stamp}`, JSON.stringify(res.error))

// AC-7 — access regained
await setAccess(photo.id, new Date(Date.now() + 30 * 24 * HOUR).toISOString())
res = await c.from('shoots').update({ date: '2026-12-04' }).eq('id', shootId).select('date').single()
ok('AC-7 with access again, the shoot can be edited at once', res.data?.date === '2026-12-04', JSON.stringify(res.error))
res = await c.from('shoots').insert({ creator_id: photo.id, client_id: clientId, date: '2026-12-05' }).select('id').single()
ok('AC-7 and a shoot can be created', Boolean(res.data?.id), JSON.stringify(res.error))

// Another account's access does not open this one's doors, and vice versa.
const other = await account('other')
res = await other.client.from('clients').insert({ creator_id: other.id, name: 'Чужий' })
ok('AC-3 an account that never had access is refused', refused(res), JSON.stringify(res.error))

// AC-4 — deleting the account works without access
await setAccess(photo.id, new Date(Date.now() - HOUR).toISOString())
res = await c.rpc('delete_own_account')
ok('AC-4 the account can be deleted without access', res.error === null, JSON.stringify(res.error))
