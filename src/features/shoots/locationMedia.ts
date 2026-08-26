import * as Crypto from 'expo-crypto'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase/client'

const BUCKET = 'shoot-media'
const SIGNED_URL_TTL_SECONDS = 3600

/**
 * US-018 AC-2 — one image **or** one video attached to the location note.
 *
 * `Shoot.location_attachment` is a single text column with no companion "kind",
 * so which one it holds is read back off the file extension. That is the only
 * signal the data model gives; the alternative would be inventing a column the
 * spec does not have.
 */
export type AttachmentKind = 'image' | 'video'

const EXTENSION_BY_TYPE: Record<string, { ext: string; kind: AttachmentKind }> = {
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/png': { ext: 'png', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/heic': { ext: 'heic', kind: 'image' },
  'image/heif': { ext: 'heif', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  // .mov is what an iPhone camera produces, and is the common case here.
  'video/quicktime': { ext: 'mov', kind: 'video' },
  'video/mp4': { ext: 'mp4', kind: 'video' },
}

const VIDEO_EXTENSIONS = ['mov', 'mp4']

/** Which kind a stored attachment is, inferred from its path. */
export function attachmentKind(path: string): AttachmentKind {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.includes(ext) ? 'video' : 'image'
}

/**
 * Upload a picked asset and return its Storage path, or null if the type is one
 * we cannot name an extension for.
 *
 * The path's first segment is the shoot id, which is what the bucket policy
 * keys ownership off — see the bucket migration. `location/` is a sibling of
 * `references/` under the same shoot, so it inherits those policies untouched.
 */
export async function uploadLocationAttachment(
  shootId: string,
  asset: ImagePicker.ImagePickerAsset
): Promise<string | null> {
  const mimeType = asset.mimeType?.toLowerCase() ?? ''
  const mapping = EXTENSION_BY_TYPE[mimeType]
  if (!mapping) return null

  let body: ArrayBuffer
  try {
    const response = await fetch(asset.uri)
    body = await response.arrayBuffer()
  } catch {
    return null
  }

  const path = `${shootId}/location/${Crypto.randomUUID()}.${mapping.ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: mimeType })
  if (error) return null

  // The previous attachment is deliberately left in the bucket. There is one
  // column, so the row no longer points at it and nothing can reach it; no
  // story asks for deletion, and v1 grants no DELETE anywhere (grants
  // migration). It costs storage, not correctness.
  return path
}

/** The bucket is private, so display always goes through a signed URL. */
export async function signedLocationUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}
