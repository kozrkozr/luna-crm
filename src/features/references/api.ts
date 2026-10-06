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
  /**
   * The group this reference belongs to — «Світло», «Пози», «Стиль» on the Figma
   * shoot-detail frame, which draws the section as separate named groups.
   *
   * `null` for every row written before the column existed, and for anything
   * added without choosing. Those render in an untitled group rather than under
   * an invented «Без категорії» heading (CLAUDE.md rule 1).
   *
   * Free text, not a union: the fixed list the picker offers is a UI decision
   * (`REFERENCE_CATEGORIES` in the dictionary), and typing it here would make
   * adding a group a schema change. See the migration for the full reasoning.
   */
  category: string | null
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

function toReference(row: {
  id: string
  kind: string
  url_or_path: string
  category: string | null
}): Reference {
  return {
    id: row.id,
    kind: row.kind as ReferenceKind,
    urlOrPath: row.url_or_path,
    category: row.category,
  }
}

/** The one column list, so the three queries below cannot drift apart. */
const REFERENCE_COLUMNS = 'id, kind, url_or_path, category'

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
    .select(REFERENCE_COLUMNS)
    .eq('shoot_id', shootId)
    .order('created_at', { ascending: true })

  if (error || !data) return null
  return data.map(toReference)
}

/** `US-003` AC-1, the pasted-link half. */
export async function addLinkReference(
  shootId: string,
  link: string,
  /** The group to file it under, or null to leave it ungrouped. */
  category: string | null = null
): Promise<AddReferenceResult> {
  // AC-2 — validated before the insert, so a rejected link never reaches the
  // table and the existing list is provably unchanged.
  if (!isValidReferenceLink(link)) return { ok: false, reason: 'invalidLink' }

  const { data, error } = await supabase
    .from('shoot_references')
    .insert({ shoot_id: shootId, kind: 'link', url_or_path: link.trim(), category })
    .select(REFERENCE_COLUMNS)
    .single()

  if (error || !data) return { ok: false, reason: 'failed' }
  return { ok: true, reference: toReference(data) }
}

/**
 * `US-003` AC-2's unsupported-file-type check on its own, for a caller that
 * holds an image before it can upload it — the new-shoot form (`US-043`).
 * Null when the image is acceptable.
 */
export function imageAssetProblem(asset: ImagePicker.ImagePickerAsset): AddReferenceFailure | null {
  return SUPPORTED_IMAGE_TYPES.includes(asset.mimeType?.toLowerCase() ?? '') ? null : 'unsupportedType'
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
  asset: ImagePicker.ImagePickerAsset,
  /** The group to file it under, or null to leave it ungrouped. */
  category: string | null = null
): Promise<AddReferenceResult> {
  const mimeType = asset.mimeType?.toLowerCase() ?? ''

  // AC-2 — the unsupported-file-type half, checked before anything is uploaded.
  const problem = imageAssetProblem(asset)
  if (problem) return { ok: false, reason: problem }

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
    .insert({ shoot_id: shootId, kind: 'image', url_or_path: path, category })
    .select(REFERENCE_COLUMNS)
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

/**
 * Take a reference off a shoot.
 *
 * **No story covers this** — `US-003` adds, `US-021` lists. Built at the owner's
 * request (2026-08-30); see docs/redesign-log.md.
 *
 * Goes through a SECURITY DEFINER function rather than an UPDATE, for the third
 * time in this codebase and for the same reason each time: the SELECT policy's
 * `removed_at is null` is applied to the NEW row, so a plain soft delete makes
 * the row fail its own read policy. The reasoning is in the migration; the
 * summary is that the policy is right and the write has to happen outside it.
 *
 * The function does its own authorisation, so this is not a bare escape hatch:
 * it removes only a reference on a shoot the caller created. `false` means it
 * did none of that, and deliberately does not say which.
 *
 * The stored image stays in the bucket — nothing points at it, no story asks
 * for deletion, and no DELETE is granted anywhere.
 */
export async function removeReference(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('soft_remove_reference', { reference_id: id })
  return !error && data === true
}
