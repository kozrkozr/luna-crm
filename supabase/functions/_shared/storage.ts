/**
 * `S-6` / `ADR-020` decision 1 — hosted files (raw files, finished photos) on an
 * S3-compatible store. Backblaze B2 today; Cloudflare R2 later is a change of
 * these four settings, not of the code:
 *
 *   B2_ENDPOINT, B2_REGION, B2_BUCKET, B2_KEY_ID, B2_APPLICATION_KEY
 *
 * Nothing here streams file bytes through the Edge Function. A browser uploads
 * parts straight to the store with presigned URLs, and downloads the same way —
 * a 40 GB raw set cannot pass through a function (`ADR-021`).
 *
 * The small images of `US-003`, `US-005`, `US-018` stay on Supabase Storage.
 */
import { AwsClient } from 'npm:aws4fetch@1.0.20'

export type StorageConfig = {
  endpoint: string
  region: string
  bucket: string
  keyId: string
  secret: string
  /**
   * Where a browser reaches the store, when that differs from where this
   * function does. Local only: functions run in Docker and reach the local S3
   * at `host.docker.internal`, a browser or a suite at `127.0.0.1`. A presigned
   * URL is bound to its host, so it must be signed for the browser's.
   */
  publicEndpoint?: string
}

export type UploadedPart = { partNumber: number; etag: string; size: number }

export type StoredObject = { key: string; size: number; lastModified: string }

export function configFromEnv(): StorageConfig {
  const get = (name: string) => {
    const value = Deno.env.get(name)
    if (!value) throw new Error(`${name} is not set`)
    return value
  }
  return {
    endpoint: get('B2_ENDPOINT').replace(/\/+$/, ''),
    region: get('B2_REGION'),
    bucket: get('B2_BUCKET'),
    keyId: get('B2_KEY_ID'),
    secret: get('B2_APPLICATION_KEY'),
    publicEndpoint: Deno.env.get('B2_PUBLIC_ENDPOINT')?.replace(/\/+$/, '') || undefined,
  }
}

export function createStorage(config: StorageConfig) {
  const aws = new AwsClient({
    accessKeyId: config.keyId,
    secretAccessKey: config.secret,
    service: 's3',
    region: config.region,
  })

  const path = (key: string) => `${config.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
  const objectUrl = (key: string) => `${config.endpoint}/${path(key)}`
  const publicObjectUrl = (key: string) => `${config.publicEndpoint ?? config.endpoint}/${path(key)}`

  async function call(url: string, init: RequestInit = {}): Promise<string> {
    const res = await aws.fetch(url, init)
    const body = await res.text()
    if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${res.status}: ${xmlValue(body, 'Message') ?? body}`)
    return body
  }

  async function presign(url: string, method: string, expiresSeconds: number): Promise<string> {
    const u = new URL(url)
    u.searchParams.set('X-Amz-Expires', String(expiresSeconds))
    const signed = await aws.sign(u.toString(), { method, aws: { signQuery: true } })
    return signed.url
  }

  return {
    /** Starts a multipart upload; the returned id names it in every later call. */
    async createUpload(key: string, contentType: string): Promise<string> {
      const body = await call(`${objectUrl(key)}?uploads`, {
        method: 'POST',
        headers: { 'content-type': contentType },
      })
      const uploadId = xmlValue(body, 'UploadId')
      if (!uploadId) throw new Error('no UploadId in the response')
      return uploadId
    },

    /** A URL the browser can PUT one part to, without our credentials. */
    signPart(key: string, uploadId: string, partNumber: number, expiresSeconds: number) {
      const u = new URL(publicObjectUrl(key))
      u.searchParams.set('partNumber', String(partNumber))
      u.searchParams.set('uploadId', uploadId)
      return presign(u.toString(), 'PUT', expiresSeconds)
    },

    /** Parts the store already holds — what a resumed upload can skip. */
    async listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
      const parts: UploadedPart[] = []
      let marker = ''
      for (;;) {
        const u = new URL(objectUrl(key))
        u.searchParams.set('uploadId', uploadId)
        u.searchParams.set('max-parts', '1000')
        if (marker) u.searchParams.set('part-number-marker', marker)
        const body = await call(u.toString())
        for (const part of xmlBlocks(body, 'Part')) {
          parts.push({
            partNumber: Number(xmlValue(part, 'PartNumber')),
            etag: xmlValue(part, 'ETag') ?? '',
            size: Number(xmlValue(part, 'Size')),
          })
        }
        if (xmlValue(body, 'IsTruncated') !== 'true') return parts
        marker = xmlValue(body, 'NextPartNumberMarker') ?? ''
      }
    },

    async completeUpload(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]) {
      const xml =
        '<CompleteMultipartUpload>' +
        [...parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`)
          .join('') +
        '</CompleteMultipartUpload>'
      const u = new URL(objectUrl(key))
      u.searchParams.set('uploadId', uploadId)
      await call(u.toString(), { method: 'POST', headers: { 'content-type': 'application/xml' }, body: xml })
    },

    async abortUpload(key: string, uploadId: string) {
      const u = new URL(objectUrl(key))
      u.searchParams.set('uploadId', uploadId)
      await call(u.toString(), { method: 'DELETE' })
    },

    /** A download URL that saves under `fileName` instead of opening in the tab. */
    signDownload(key: string, fileName: string, expiresSeconds: number) {
      const u = new URL(publicObjectUrl(key))
      u.searchParams.set('response-content-disposition', contentDisposition(fileName))
      return presign(u.toString(), 'GET', expiresSeconds)
    },

    async listObjects(prefix: string): Promise<StoredObject[]> {
      const objects: StoredObject[] = []
      let token = ''
      for (;;) {
        const u = new URL(`${config.endpoint}/${config.bucket}`)
        u.searchParams.set('list-type', '2')
        u.searchParams.set('prefix', prefix)
        if (token) u.searchParams.set('continuation-token', token)
        const body = await call(u.toString())
        for (const item of xmlBlocks(body, 'Contents')) {
          objects.push({
            key: xmlValue(item, 'Key') ?? '',
            size: Number(xmlValue(item, 'Size')),
            lastModified: xmlValue(item, 'LastModified') ?? '',
          })
        }
        if (xmlValue(body, 'IsTruncated') !== 'true') return objects
        token = xmlValue(body, 'NextContinuationToken') ?? ''
      }
    },

    /**
     * Deletes every version of `key`. On B2 a plain S3 DELETE only hides the
     * file — the bytes stay, and stay billed and counted — so the versions are
     * listed and removed one by one (`ADR-020` decision 3: deletion is final).
     */
    async deleteObject(key: string) {
      const u = new URL(`${config.endpoint}/${config.bucket}`)
      u.searchParams.set('versions', '')
      u.searchParams.set('prefix', key)
      const body = await call(u.toString())
      const versions = [...xmlBlocks(body, 'Version'), ...xmlBlocks(body, 'DeleteMarker')]
        .filter((v) => xmlValue(v, 'Key') === key)
        .map((v) => xmlValue(v, 'VersionId'))
        .filter((id): id is string => !!id)
      // A store that keeps no versions lists none; there a plain DELETE is final.
      if (versions.length === 0) {
        await call(objectUrl(key), { method: 'DELETE' })
        return
      }
      for (const versionId of versions) {
        const v = new URL(objectUrl(key))
        v.searchParams.set('versionId', versionId)
        await call(v.toString(), { method: 'DELETE' })
      }
    },
  }
}

export type Storage = ReturnType<typeof createStorage>

/** RFC 6266: an ASCII fallback plus the UTF-8 name, so Cyrillic names survive. */
function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

function xmlValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match ? unescapeXml(match[1]) : undefined
}

function xmlBlocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Named and numeric entities — B2 writes an ETag's quotes as `&quot;`, others as `&#34;`. */
function unescapeXml(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}
