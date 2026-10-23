/**
 * EP-07 foundation — `supabase/functions/_shared/storage.ts` against a local S3
 * (SeaweedFS, `scripts/local-s3.sh`), never against B2: the store is whatever
 * `LOCAL_S3_ENDPOINT` says, and anything but localhost is refused.
 *
 * What a browser does in S-6, minus the browser: parts PUT to presigned URLs,
 * listed for a resume, completed, downloaded under a Cyrillic name, deleted.
 *
 * Run through `files-storage.mjs` (Deno, because the module is Deno's).
 */
import { createStorage, type StorageConfig } from '../../supabase/functions/_shared/storage.ts'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const endpoint = (Deno.env.get('LOCAL_S3_ENDPOINT') ?? 'http://127.0.0.1:8333').replace(/\/+$/, '')
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(endpoint)) {
  console.log(`FAIL  refusing to run against ${endpoint} — local S3 only`)
  Deno.exit(1)
}

const config: StorageConfig = {
  endpoint,
  region: 'us-east-1',
  bucket: 'luna-files-test',
  keyId: 'luna-local-key',
  secret: 'luna-local-secret',
}

function ok(name: string, pass: boolean, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

// The bucket — B2's is made by hand; here the suite makes its own.
const aws = new AwsClient({ accessKeyId: config.keyId, secretAccessKey: config.secret, service: 's3', region: config.region })
const made = await aws.fetch(`${endpoint}/${config.bucket}`, { method: 'PUT' })
await made.body?.cancel()

const storage = createStorage(config)
const MiB = 1024 * 1024
const key = `test/${crypto.randomUUID()}/Вихідники зйомки.bin`
const sizes = [5 * MiB, 5 * MiB, 1234]
const part = (n: number) => new Uint8Array(sizes[n - 1]).fill(n)

// ---------- start, sign, PUT ----------
const uploadId = await storage.createUpload(key, 'application/octet-stream')
ok('createUpload returns an upload id', typeof uploadId === 'string' && uploadId.length > 0, uploadId)

const etags: Record<number, string> = {}
for (const n of [1, 2]) {
  const url = await storage.signPart(key, uploadId, n, 600)
  const res = await fetch(url, { method: 'PUT', body: part(n) })
  await res.body?.cancel()
  etags[n] = res.headers.get('etag') ?? ''
}
ok('a part PUT to its presigned URL is taken, with an ETag', !!etags[1] && !!etags[2], JSON.stringify(etags))

// ---------- resume: the store says what it holds ----------
let parts = await storage.listParts(key, uploadId)
ok('listParts names the parts already held, with their sizes',
  parts.length === 2 && parts[0].partNumber === 1 && parts[1].size === 5 * MiB, JSON.stringify(parts))
ok('listParts gives back the same ETags the PUTs did (XML entities decoded)',
  parts[0]?.etag === etags[1] && parts[1]?.etag === etags[2], JSON.stringify(parts.map((p) => p.etag)))

const last = await fetch(await storage.signPart(key, uploadId, 3, 600), { method: 'PUT', body: part(3) })
await last.body?.cancel()
parts = await storage.listParts(key, uploadId)

// ---------- complete ----------
await storage.completeUpload(key, uploadId, parts.map(({ partNumber, etag }) => ({ partNumber, etag })))
let objects = await storage.listObjects('test/')
const stored = objects.find((o) => o.key === key)
ok('completeUpload joins the parts into one object of their total size',
  stored?.size === sizes.reduce((a, b) => a + b, 0), JSON.stringify(stored))

// ---------- download ----------
const download = await fetch(await storage.signDownload(key, 'Вихідники зйомки.bin', 600), { headers: { range: 'bytes=0-3' } })
const head = new Uint8Array(await download.arrayBuffer())
const disposition = download.headers.get('content-disposition') ?? ''
ok('a presigned GET downloads the bytes', download.status === 206 && head[0] === 1, `${download.status} ${head}`)
ok('the download saves under the Cyrillic name (RFC 6266)',
  disposition.startsWith('attachment') && decodeURIComponent(disposition.split("UTF-8''")[1] ?? '') === 'Вихідники зйомки.bin', disposition)

// ---------- a presigned URL lapses ----------
const short = await storage.signDownload(key, 'x.bin', 1)
await new Promise((r) => setTimeout(r, 2500))
const lapsed = await fetch(short)
await lapsed.body?.cancel()
ok('a presigned URL stops working when it lapses', lapsed.status === 403, String(lapsed.status))

// ---------- a URL signed for the browser's host ----------
const viaLocalhost = createStorage({ ...config, publicEndpoint: endpoint.replace('127.0.0.1', 'localhost') })
const publicUrl = await viaLocalhost.signDownload(key, 'x.bin', 600)
const viaPublic = await fetch(publicUrl, { headers: { range: 'bytes=0-0' } })
await viaPublic.body?.cancel()
ok('publicEndpoint signs URLs for the host a browser uses',
  new URL(publicUrl).hostname === 'localhost' && viaPublic.status === 206, `${new URL(publicUrl).host} ${viaPublic.status}`)

// ---------- abort ----------
const abandonedKey = `test/${crypto.randomUUID()}/abandoned.bin`
const abandonedId = await storage.createUpload(abandonedKey, 'application/octet-stream')
const put = await fetch(await storage.signPart(abandonedKey, abandonedId, 1, 600), { method: 'PUT', body: part(3) })
await put.body?.cancel()
await storage.abortUpload(abandonedKey, abandonedId)
let afterAbort: unknown
try {
  afterAbort = await storage.listParts(abandonedKey, abandonedId)
} catch (e) {
  afterAbort = String(e)
}
ok('abortUpload drops the upload and its parts', typeof afterAbort === 'string' || (afterAbort as unknown[]).length === 0, JSON.stringify(afterAbort))

// ---------- delete ----------
await storage.deleteObject(key)
objects = await storage.listObjects('test/')
ok('deleteObject removes the object for good', !objects.some((o) => o.key === key), JSON.stringify(objects.map((o) => o.key)))
