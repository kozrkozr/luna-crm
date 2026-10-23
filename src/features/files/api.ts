import { supabase } from '../../lib/supabase/client'

/**
 * `US-036` — a shoot's hosted files (`ShootFile`), and the `files` Edge
 * Function that admits an upload. The bytes never pass through here or through
 * the function: they go from the browser straight to the store (`uploader.ts`).
 */

export type FileKind = 'raw' | 'finished'

export type ShootFile = {
  id: string
  kind: FileKind
  /** Shown and downloaded as — a folder's path joined with « · ». */
  name: string
  sizeBytes: number
  /** `uploading` until the store holds every part; an interrupted one stays so. */
  status: 'uploading' | 'complete'
  createdAt: string
}

/** Why the function refused, or `network` when it could not be asked at all. */
export type Refusal =
  | 'unauthorized'
  | 'not_found'
  | 'no_access'
  | 'expired'
  | 'quota'
  | 'not_a_photo'
  | 'bad_request'
  | 'incomplete'
  | 'store'
  | 'network'

/** Refusals that will not go away by asking again. */
export const PERMANENT: readonly Refusal[] = ['unauthorized', 'not_found', 'no_access', 'expired', 'quota', 'not_a_photo', 'bad_request']

/** Finished photos only (owner, 2026-10-23). The function checks it too. */
const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'tif', 'tiff', 'webp']
export const isPhoto = (name: string) => PHOTO_EXTENSIONS.includes(name.split('.').pop()?.toLowerCase() ?? '')

export async function listShootFiles(shootId: string): Promise<ShootFile[] | null> {
  const { data, error } = await supabase
    .from('shoot_files')
    .select('id, kind, name, size_bytes, status, created_at')
    .eq('shoot_id', shootId)
    .order('created_at')
  if (error || !data) return null
  return data.map((row) => ({
    id: row.id,
    kind: row.kind as FileKind,
    name: row.name,
    sizeBytes: Number(row.size_bytes),
    status: row.status as ShootFile['status'],
    createdAt: row.created_at,
  }))
}

/** The shoot's deletion date (`US-036` AC-2), null until its first upload. */
export async function getFilesDeleteAt(shootId: string): Promise<string | null> {
  const { data } = await supabase.from('shoots').select('files_delete_at').eq('id', shootId).maybeSingle()
  return (data?.files_delete_at as string | null | undefined) ?? null
}

/** Bytes the signed-in account holds, uploads in progress included. */
export async function filesUsage(): Promise<number | null> {
  const { data, error } = await supabase.rpc('my_files_usage')
  return error ? null : Number(data)
}

export type HostingLimits = { retentionDays: number; warningDays: number; quotaBytes: number }

export async function hostingLimits(): Promise<HostingLimits | null> {
  const { data, error } = await supabase.rpc('file_hosting_limits')
  const row = Array.isArray(data) ? data[0] : null
  if (error || !row) return null
  return { retentionDays: row.retention_days, warningDays: row.warning_days, quotaBytes: Number(row.quota_bytes) }
}

export type FilesResult<T> = { ok: true; data: T } | { ok: false; reason: Refusal }

/**
 * One call to the `files` function. Raw `fetch`, not `functions.invoke`: the
 * refusal's reason is in the body of a non-2xx answer, which invoke hides.
 */
export async function callFiles<T>(action: string, args: Record<string, unknown> = {}): Promise<FilesResult<T>> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  const { data } = await supabase.auth.getSession()
  const jwt = data.session?.access_token
  if (!url || !apikey || !jwt) return { ok: false, reason: 'unauthorized' }
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/files`, {
      method: 'POST',
      headers: { apikey, authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...args }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, data: body as T }
    return { ok: false, reason: (body.error as Refusal) ?? 'store' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}
