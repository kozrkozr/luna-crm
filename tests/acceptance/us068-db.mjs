import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
/**
 * US-068 at the data layer: a photo is marked «Знято» and unmarked by its
 * creator (AC-3, AC-5); a link cannot be marked (AC-7); view mode refuses the
 * mark (AC-11); nobody else can mark it; and the link gateway never sends it
 * (Context — creator only).
 *
 * Supabase and the link gateway only.
 */
const anon = () => createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const service = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const stamp = Date.now()
const HOUR = 3600 * 1000

const account = async (tag) => {
  const client = anon()
  const email = `us068-${tag}-${stamp}@example.com`
  const { data, error } = await client.auth.signUp({
    email, password: 'testpass123', options: { data: { name: tag, role: 'photographer' } },
  })
  if (error) throw error
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  return { client, id: data.user.id }
}
const setAccess = async (id, expiresAt) => {
  const { error } = await service.from('account_access').upsert({
    user_id: id, entitlement: 'base', expires_at: expiresAt, product_id: 'com.lunashoots.ios.base.monthly',
    period_type: 'trial', store: 'test_store', is_sandbox: true, will_renew: true,
  })
  if (error) throw error
}

const owner = await account('owner')
const other = await account('other')
const c = owner.client
await setAccess(owner.id, new Date(Date.now() + 14 * 24 * HOUR).toISOString())
await setAccess(other.id, new Date(Date.now() + 14 * 24 * HOUR).toISOString())

const clientId = (await c.from('clients').insert({ creator_id: owner.id, name: 'Клієнт' }).select('id').single()).data?.id
const shootId = (await c.from('shoots').insert({ creator_id: owner.id, client_id: clientId, date: '2026-12-01' }).select('id').single()).data?.id
const photoId = (await c.from('shoot_references').insert({ shoot_id: shootId, kind: 'image', url_or_path: `${shootId}/references/x.jpg`, category: 'light' }).select('id').single()).data?.id
const linkId = (await c.from('shoot_references').insert({ shoot_id: shootId, kind: 'link', url_or_path: 'https://example.com/a' }).select('id').single()).data?.id
ok('setup', Boolean(shootId && photoId && linkId))

let res = await c.from('shoot_references').select('shot_at').eq('id', photoId).single()
ok('a new photo is still to shoot', res.data?.shot_at === null, JSON.stringify(res))

// AC-3
res = await c.from('shoot_references').update({ shot_at: new Date().toISOString() }).eq('id', photoId).select('shot_at').single()
ok('AC-3 the creator marks a photo «Знято»', Boolean(res.data?.shot_at), JSON.stringify(res.error))

// AC-5
res = await c.from('shoot_references').update({ shot_at: null }).eq('id', photoId).select('shot_at').single()
ok('AC-5 the creator clears the mark', res.data?.shot_at === null, JSON.stringify(res.error))

// AC-7
res = await c.from('shoot_references').update({ shot_at: new Date().toISOString() }).eq('id', linkId)
ok('AC-7 a link cannot be marked', res.error?.code === '23514', JSON.stringify(res.error))

// Someone else's photo
res = await other.client.from('shoot_references').update({ shot_at: new Date().toISOString() }).eq('id', photoId).select('id')
const after = (await c.from('shoot_references').select('shot_at').eq('id', photoId).single()).data
ok("another account cannot mark someone else's photo", (res.data ?? []).length === 0 && after?.shot_at === null,
  JSON.stringify({ res, after }))

// AC-11 — view mode
await setAccess(owner.id, new Date(Date.now() - HOUR).toISOString())
res = await c.from('shoot_references').update({ shot_at: new Date().toISOString() }).eq('id', photoId)
ok('AC-11 without access the mark is refused', res.error?.code === '42501', JSON.stringify(res.error))
await setAccess(owner.id, new Date(Date.now() + 14 * 24 * HOUR).toISOString())

// Creator only — the gateway never sends it, for crew or client
await c.from('shoot_references').update({ shot_at: new Date().toISOString() }).eq('id', photoId)
const crewId = (await c.from('crew_members').insert({ shoot_id: shootId, name: 'Оля', role: 'makeup', phone: '0501112233' }).select('id').single()).data?.id
const token = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const crewToken = token()
const clientToken = token()
await c.from('access_links').insert({ token: crewToken, shoot_id: shootId, audience: 'crew', crew_member_id: crewId })
await c.from('access_links').insert({ token: clientToken, shoot_id: shootId, audience: 'client' })
const GW = `${process.env.SB_URL.replace(/\/+$/, '')}/functions/v1/link-gateway`
for (const [audience, t] of [['crew', crewToken], ['client', clientToken]]) {
  const r = await fetch(`${GW}?token=${encodeURIComponent(t)}`, {
    headers: { apikey: process.env.SB_KEY, authorization: `Bearer ${process.env.SB_KEY}` },
  })
  const text = await r.text()
  ok(`the ${audience} payload carries references but no shot_at`,
    r.status === 200 && text.includes('example.com/a') && !/shot_?at/i.test(text), `${r.status} ${text.slice(0, 200)}`)
}
