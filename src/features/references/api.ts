import * as Crypto from 'expo-crypto'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase/client'

const BUCKET = 'shoot-media'

/**
 * How long a signed URL for a reference image stays valid on the creator's own
 * screen. architecture.md specifies "short TTL" only for the anonymous link
 * gateway; nothing specifies this surface, where the caller is authenticated
 * and RLS already gates the object. An hour is long enough that scrolling a
 * shoot never re-signs, short enough that a leaked URL dies quickly.
 */
const SIGNED_URL_TTL_SECONDS = 3600

export type ReferenceKind = 'link' | 'image'

export type Reference = {
  id: string
  kind: ReferenceKind
  /** External URL for `link`; a Storage object path for `image`. */
  urlOrPath: string
}

/**
 * Why an add was rejected. `US-003` AC-2 requires a clear message for an
 * unsupported file type or an invalid link; the copy for each lives in the
 * i18n dictionary, not here, so this stays a cause rather than a string.
 */
export type AddReferenceFailure = 'invalidLink' | 'unsupportedType' | 'failed'

export type AddReferenceResult = { ok: true; reference: Reference } | { ok: false; reason: AddReferenceFailure }

/**
 * Image types accepted for a gallery reference.
 *
 * NOT from the specification — `US-003` AC-2 says "an unsupported file type" is
 * rejected but never says which are supported. This is the set iOS actually
 * hands back from the photo library, so it rejects nothing a user could
 * normally pick. See docs/open-questions.md.
 */
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
}

/**
 * `US-003` AC-2 — "an invalid link". The story does not define one, so this
 * checks the only thing that is unambiguously required for a reference to be
 * openable later by a crew member: it parses as a URL, and it is http(s).
 *
 * Deliberately no allow-list of hosts. The placeholder names Pinterest as an
 * example, not a restriction, and `prd.md` R-03 makes references whatever the
 * photographer already has.
 */
export function isValidReferenceLink(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

function toReference(row: { id: string; kind: string; url_or_path: string }): Reference {
  return { id: row.id, kind: row.kind as ReferenceKind, urlOrPath: row.url_or_path }
}

/**
 * References on a shoot, oldest first.
 *
 * No `deleted_at is null` filter is written here and none can be forgotten: the
 * policy joins through `shoots` and carries it (CLAUDE.md rule 3). A reference
 * on a soft-deleted shoot is simply not selectable.
 */
export async function listReferences(shootId: string): Promise<Reference[] | null> {
  const { data, error } = await supabase
    .from('shoot_references')
    .select('id, kind, url_or_path')
    .eq('shoot_id', shootId)
    .order('created_at', { ascending: true })

  if (error || !data) return null
  return data.map(toReference)
}

/** `US-003` AC-1, the pasted-link half. */
export async function addLinkReference(shootId: string, link: string): Promise<AddReferenceResult> {
  // AC-2 — validated before the insert, so a rejected link never reaches the
  // table and the existing list is provably unchanged.
  if (!isValidReferenceLink(link)) return { ok: false, reason: 'invalidLink' }

  const { data, error } = await supabase
    .from('shoot_references')
    .insert({ shoot_id: shootId, kind: 'link', url_or_path: link.trim() })
    .select('id, kind, url_or_path')
    .single()

  if (error || !data) return { ok: false, reason: 'failed' }
  return { ok: true, reference: toReference(data) }
}

/**
 * `US-003` AC-1, the gallery half: upload the picked image to the private
 * bucket, then record its path.
 *
 * The row is written only after the upload succeeds, so a reference never
 * points at an object that is not there. The reverse — an uploaded object with
 * no row — is possible if the insert fails, and is harmless: it is unreachable
 * and counts only against the storage cap.
 */
export async function addImageReference(
  shootId: string,
  asset: ImagePicker.ImagePickerAsset
): Promise<AddReferenceResult> {
  const mimeType = asset.mimeType?.toLowerCase() ?? ''

  // AC-2 — the unsupported-file-type half, checked before anything is uploaded.
  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) return { ok: false, reason: 'unsupportedType' }

  let body: ArrayBuffer
  try {
    // fetch() on a local file:// URI is how a picked asset is read into bytes;
    // Supabase's JS client cannot take a React Native URI directly.
    const response = await fetch(asset.uri)
    body = await response.arrayBuffer()
  } catch {
    return { ok: false, reason: 'failed' }
  }

  // The bucket policy derives ownership from the first path segment being the
  // shoot id — see the bucket migration. Changing this shape breaks the policy.
  //
  // expo-crypto, not the global `crypto`. Expo's winter runtime polyfills URL,
  // FormData and TextDecoder on native but NOT crypto, so `crypto.randomUUID()`
  // is undefined on a device while working fine in a browser — the same
  // web-passes/native-fails shape the README warns about.
  const path = `${shootId}/references/${Crypto.randomUUID()}.${EXTENSION_BY_TYPE[mimeType]}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: mimeType })

  if (uploadError) return { ok: false, reason: 'failed' }

  const { data, error } = await supabase
    .from('shoot_references')
    .insert({ shoot_id: shootId, kind: 'image', url_or_path: path })
    .select('id, kind, url_or_path')
    .single()

  if (error || !data) return { ok: false, reason: 'failed' }
  return { ok: true, reference: toReference(data) }
}

/**
 * A displayable URL for an image reference. The bucket is private, so every
 * view goes through a signed URL — there is no public URL to fall back on.
 */
export async function signedReferenceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data) return null
  return data.signedUrl
}
