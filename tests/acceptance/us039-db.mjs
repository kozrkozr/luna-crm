import './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { ok } from './cdp.mjs'
import { grantAccess } from './access.mjs'
/**
 * US-039 at the data layer: the query the phone plans its warnings from
 * (`listFileDeadlines` in `src/features/files/api.ts`, repeated here). A shoot
 * is warned about only while it has finished files and a date still ahead —
 * AC-2: files deleted early, nothing to warn about.
 *
 * Supabase only; rows are written as the service role, as the `files` function
 * would leave them.
 */
const opts = { auth: { persistSession: false } }
const service = createClient(process.env.SB_URL, process.env.SB_KEY, opts)
const stamp = Date.now()

async function account(tag) {
  const client = createClient(process.env.SB_URL, process.env.SB_ANON, opts)
  const email = `us039-${tag}-${stamp}@example.com`
  const { data } = await client.auth.signUp({ email, password: 'testpass123', options: { data: { name: tag, role: 'Фотограф' } } })
  await client.auth.signInWithPassword({ email, password: 'testpass123' })
  await grantAccess(data.user.id)
  const clientId = (await client.from('clients').insert({ creator_id: data.user.id, name: 'Оля' }).select('id').single()).data.id
  const shoot = async (filesDeleteAt, files = []) => {
    const id = (await client.from('shoots').insert({ creator_id: data.user.id, client_id: clientId, date: '2026-11-29' }).select('id').single()).data.id
    if (filesDeleteAt) await service.from('shoots').update({ files_delete_at: filesDeleteAt }).eq('id', id)
    for (const status of files) {
      await service.from('shoot_files').insert({
        shoot_id: id, kind: 'raw', name: 'x.CR3', object_key: `${id}/raw/${crypto.randomUUID()}`, size_bytes: 1,
        status, upload_id: status === 'uploading' ? 'u' : null, completed_at: status === 'complete' ? new Date().toISOString() : null,
      })
    }
    return id
  }
  return { client, shoot }
}

const deadlines = async (client) =>
  ((await client.from('shoots')
    .select('id, files_delete_at, shoot_files!inner(id)')
    .is('deleted_at', null)
    .gt('files_delete_at', new Date().toISOString())
    .eq('shoot_files.status', 'complete')).data ?? []).map((r) => r.id)

const later = new Date(Date.now() + 20 * 86400_000).toISOString()
const photo = await account('photo')
const withFiles = await photo.shoot(later, ['complete', 'complete'])
const deletedEarly = await photo.shoot(later)
const onlyUploading = await photo.shoot(later, ['uploading'])
const past = await photo.shoot(new Date(Date.now() - 1000).toISOString(), ['complete'])
const removed = await photo.shoot(later, ['complete'])
await photo.client.rpc('soft_delete_shoot', { shoot_id: removed })
const other = await account('other')
await other.shoot(later, ['complete'])

const listed = await deadlines(photo.client)
ok('AC-1 a shoot with files and a date ahead is listed, once', listed.filter((id) => id === withFiles).length === 1, JSON.stringify(listed))
ok('AC-2 files deleted early: not listed', !listed.includes(deletedEarly))
ok('an upload not finished yet: not listed', !listed.includes(onlyUploading))
ok('a date already passed: not listed', !listed.includes(past))
ok('ADR-014 a deleted shoot: not listed', !listed.includes(removed))
ok('only the creator\'s own shoots', listed.length === 1, JSON.stringify(listed))
