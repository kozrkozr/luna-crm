/**
 * `US-036` — upload raw files and finished photos to a shoot (`ADR-020`,
 * `ADR-021`). The browser sends the bytes straight to the store, part by part,
 * to URLs signed here; this function never touches a byte. What it does is
 * decide whether a part may be sent at all:
 *
 *   - the caller created the shoot and it is not deleted (AC-8, `ADR-014`);
 *   - the account may host files — base access until the PRO ADR (`ADR-023` d. 7);
 *   - the shoot's deletion date has not passed (AC-7);
 *   - the file fits in the account's quota (AC-3), reserved at the start;
 *   - a finished photo is a photo (owner, 2026-10-23).
 *
 * POST { action, ... }, the caller's JWT in Authorization:
 *   start      { shootId, kind, name, relativePath?, size, contentType? }
 *                → { fileId, partSize, partCount }
 *   signParts  { fileId, partNumbers[] }  → { urls: { [n]: url } }
 *   listParts  { fileId }                 → { parts: [{ partNumber, size }] }
 *   complete   { fileId }                 → { filesDeleteAt }
 *   abort      { fileId }                 → {}
 *   check      { fileId }                 → {}   — "may this upload go on?" (S-6 F-5)
 *
 * A refusal is { error: reason } with a stable reason the app maps to its copy:
 *   unauthorized, not_found, no_access, expired, quota, not_a_photo,
 *   bad_request, incomplete, store
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { configFromEnv, createStorage } from '../_shared/storage.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const db = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const storage = createStorage(configFromEnv())

/** Which store new uploads go to — the column `shoot_files.provider`. */
const PROVIDER = 'b2'

/** S3 multipart: parts of 5 MiB..5 GiB, at most 10 000 of them. */
const MiB = 1024 * 1024
const BASE_PART = 100 * MiB
const MAX_PARTS = 10_000
/** A part URL outlives the slowest part on a slow uplink; re-signed per batch. */
const PART_URL_SECONDS = 60 * 60

/** Finished photos only (owner, 2026-10-23); raw files take anything, video included. */
const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'tif', 'tiff', 'webp']

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } })
const refuse = (reason: string, status: number) => json({ error: reason }, status)

/** The part size that keeps a file within 10 000 parts, in whole MiB. */
export function partSizeFor(size: number) {
  const needed = Math.ceil(size / MAX_PARTS / MiB) * MiB
  return Math.max(BASE_PART, needed)
}

export const partCountFor = (size: number, partSize: number) => Math.max(1, Math.ceil(size / partSize))

export const isPhoto = (name: string) => PHOTO_EXTENSIONS.includes(name.split('.').pop()?.toLowerCase() ?? '')

/**
 * The shown name: the path inside the dropped folder, its parts joined with
 * « · », so same-named files from two cards stay apart (owner, 2026-10-23).
 */
export function displayName(name: string, relativePath: string | null) {
  if (!relativePath) return name
  return relativePath.split('/').filter(Boolean).join(' · ')
}

type FileRow = {
  id: string
  shoot_id: string
  object_key: string
  size_bytes: number
  status: string
  upload_id: string | null
}

/** The caller's uploading file on a live shoot of theirs, or null. */
async function ownUpload(userId: string, fileId: unknown): Promise<FileRow | null> {
  if (typeof fileId !== 'string') return null
  const { data } = await db
    .from('shoot_files')
    .select('id, shoot_id, object_key, size_bytes, status, upload_id, shoots!inner(creator_id, deleted_at)')
    .eq('id', fileId)
    .eq('status', 'uploading')
    .eq('shoots.creator_id', userId)
    .is('shoots.deleted_at', null)
    .maybeSingle()
  return (data as FileRow | null) ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return refuse('bad_request', 405)

  const jwt = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const { data: auth, error: authError } = await db.auth.getUser(jwt)
  if (authError || !auth.user) return refuse('unauthorized', 401)
  const userId = auth.user.id

  const body = await req.json().catch(() => ({}))

  try {
    switch (body.action) {
      case 'start': {
        const { shootId, kind, contentType } = body
        const size = Number(body.size)
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        const relativePath = typeof body.relativePath === 'string' && body.relativePath.includes('/')
          ? body.relativePath.replace(/^\/+/, '')
          : null
        if (typeof shootId !== 'string' || (kind !== 'raw' && kind !== 'finished') || !name ||
            !Number.isSafeInteger(size) || size < 0) {
          return refuse('bad_request', 400)
        }
        if (kind === 'finished' && !isPhoto(name)) return refuse('not_a_photo', 422)

        // As the user, so it is the same `has_access()` the app's writes obey.
        const asUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { authorization: `Bearer ${jwt}` } },
        })
        const { data: allowed } = await asUser.rpc('can_host_files')
        if (allowed !== true) return refuse('no_access', 403)

        const objectKey = `${shootId}/${kind}/${crypto.randomUUID()}`
        const { data: fileId, error } = await db.rpc('reserve_shoot_file', {
          p_user: userId,
          p_shoot: shootId,
          p_kind: kind,
          p_name: displayName(name, relativePath),
          p_relative_path: relativePath,
          p_size: size,
          p_object_key: objectKey,
          p_provider: PROVIDER,
        })
        if (error) {
          const reason = /files:(\w+)/.exec(error.message)?.[1]
          if (reason === 'quota') return refuse('quota', 409)
          if (reason === 'expired') return refuse('expired', 409)
          if (reason === 'not_found') return refuse('not_found', 404)
          throw new Error(error.message)
        }

        try {
          const uploadId = await storage.createUpload(objectKey, typeof contentType === 'string' && contentType
            ? contentType
            : 'application/octet-stream')
          await db.from('shoot_files').update({ upload_id: uploadId }).eq('id', fileId)
        } catch (e) {
          await db.from('shoot_files').delete().eq('id', fileId)
          throw e
        }
        const partSize = partSizeFor(size)
        return json({ fileId, partSize, partCount: partCountFor(size, partSize) })
      }

      case 'signParts': {
        const file = await ownUpload(userId, body.fileId)
        if (!file) return refuse('not_found', 404)
        const partCount = partCountFor(file.size_bytes, partSizeFor(file.size_bytes))
        const numbers: number[] = Array.isArray(body.partNumbers) ? body.partNumbers.map(Number) : []
        if (numbers.length === 0 || numbers.length > 100 ||
            numbers.some((n) => !Number.isInteger(n) || n < 1 || n > partCount)) {
          return refuse('bad_request', 400)
        }
        const urls: Record<number, string> = {}
        for (const n of numbers) {
          urls[n] = await storage.signPart(file.object_key, file.upload_id!, n, PART_URL_SECONDS)
        }
        return json({ urls })
      }

      case 'listParts': {
        const file = await ownUpload(userId, body.fileId)
        if (!file) return refuse('not_found', 404)
        const parts = await storage.listParts(file.object_key, file.upload_id!)
        return json({ parts: parts.map(({ partNumber, size }) => ({ partNumber, size })) })
      }

      case 'complete': {
        const file = await ownUpload(userId, body.fileId)
        if (!file) return refuse('not_found', 404)
        // The store's own list, not the browser's: the parts must be every part
        // of the declared size, no more — the quota was reserved for that size.
        const parts = await storage.listParts(file.object_key, file.upload_id!)
        const partCount = partCountFor(file.size_bytes, partSizeFor(file.size_bytes))
        const total = parts.reduce((sum, p) => sum + p.size, 0)
        if (parts.length !== partCount || total !== file.size_bytes) {
          if (total > file.size_bytes) {
            await storage.abortUpload(file.object_key, file.upload_id!).catch(() => {})
            await db.from('shoot_files').delete().eq('id', file.id)
            return refuse('bad_request', 400)
          }
          return refuse('incomplete', 409)
        }
        await storage.completeUpload(file.object_key, file.upload_id!, parts)
        const { data: filesDeleteAt, error } = await db.rpc('complete_shoot_file', { p_file: file.id })
        if (error) throw new Error(error.message)
        return json({ filesDeleteAt })
      }

      case 'abort': {
        const file = await ownUpload(userId, body.fileId)
        if (!file) return refuse('not_found', 404)
        await storage.abortUpload(file.object_key, file.upload_id!).catch(() => {})
        await db.from('shoot_files').delete().eq('id', file.id)
        return json({})
      }

      case 'check': {
        const file = await ownUpload(userId, body.fileId)
        if (!file) return refuse('not_found', 404)
        // The parts list proves the store still has the upload and answers.
        await storage.listParts(file.object_key, file.upload_id!)
        return json({})
      }

      default:
        return refuse('bad_request', 400)
    }
  } catch (e) {
    console.error(`files ${body.action}: ${e instanceof Error ? e.message : e}`)
    return refuse('store', 502)
  }
})
