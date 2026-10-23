#!/usr/bin/env node
/**
 * EP-07 — set up a B2 bucket for hosted files the same way every time, instead
 * of by hand in the Backblaze dashboard (`docs/spikes/S-6-large-upload-to-b2.md`).
 *
 *   node scripts/b2-bucket.mjs dev  supabase/functions/.env.local
 *   node scripts/b2-bucket.mjs prod <a file with the prod bucket's key>
 *
 * The env file holds B2_KEY_ID and B2_APPLICATION_KEY of a key restricted to
 * that one bucket, with the writeBuckets capability (the dashboard's "Read and
 * Write" key has it). Never pass the key on the command line.
 *
 * It makes sure the bucket is private and encrypted at rest (SSE-B2), sets the
 * CORS rules below, keeps lifecycle rules empty (deletion is ours, `ADR-020`
 * decision 3), and prints what the bucket ends up with. Safe to run again.
 *
 * CORS is needed only where a page calls B2 with XHR/fetch: the photographer's
 * upload (PUT, reading the part's ETag). A link view's download is a plain
 * navigation to a presigned URL and needs none; GET/HEAD are allowed for the
 * link surface anyway, so a preview fetched by script would work.
 */
import fs from 'node:fs'

const ORIGINS = {
  dev: { app: ['https://dev.lunashoots.com', 'http://localhost:8081'], links: ['https://dev.lunashoots.com'] },
  prod: { app: ['https://app.lunashoots.com'], links: ['https://lunashoots.com'] },
}

const [target, envFile] = process.argv.slice(2)
if (!ORIGINS[target] || !envFile) {
  console.error('usage: node scripts/b2-bucket.mjs dev|prod <env file with B2_KEY_ID, B2_APPLICATION_KEY>')
  process.exit(1)
}

const env = Object.fromEntries(
  fs.readFileSync(envFile, 'utf8').split('\n')
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
if (!env.B2_KEY_ID || !env.B2_APPLICATION_KEY) {
  console.error(`${envFile} has no B2_KEY_ID / B2_APPLICATION_KEY`)
  process.exit(1)
}

const basic = Buffer.from(`${env.B2_KEY_ID}:${env.B2_APPLICATION_KEY}`).toString('base64')
const auth = await (await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
  headers: { authorization: `Basic ${basic}` },
})).json()
const api = auth.apiInfo?.storageApi
if (!api?.bucketId) {
  console.error('the key must be restricted to one bucket — got', auth.code ?? 'an account-wide key')
  process.exit(1)
}

const { app, links } = ORIGINS[target]
const corsRules = [
  {
    corsRuleName: 'appUploads',
    allowedOrigins: app,
    allowedOperations: ['s3_put', 's3_get', 's3_head'],
    allowedHeaders: ['*'],
    exposeHeaders: ['ETag', 'x-amz-request-id'],
    maxAgeSeconds: 3600,
  },
  {
    corsRuleName: 'linkReads',
    allowedOrigins: links.filter((o) => !app.includes(o)),
    allowedOperations: ['s3_get', 's3_head'],
    allowedHeaders: ['*'],
    exposeHeaders: [],
    maxAgeSeconds: 3600,
  },
].filter((rule) => rule.allowedOrigins.length > 0)

const res = await fetch(`${api.apiUrl}/b2api/v3/b2_update_bucket`, {
  method: 'POST',
  headers: { authorization: auth.authorizationToken, 'content-type': 'application/json' },
  body: JSON.stringify({
    accountId: auth.accountId,
    bucketId: api.bucketId,
    bucketType: 'allPrivate',
    defaultServerSideEncryption: { mode: 'SSE-B2', algorithm: 'AES256' },
    lifecycleRules: [],
    corsRules,
  }),
})
const bucket = await res.json()
if (!res.ok) {
  console.error('b2_update_bucket failed:', bucket.code, bucket.message)
  process.exit(1)
}

console.log(`${target}: ${bucket.bucketName}`)
console.log(`  type        ${bucket.bucketType}`)
console.log(`  encryption  ${bucket.defaultServerSideEncryption?.value?.mode ?? 'none'}`)
console.log(`  lifecycle   ${bucket.lifecycleRules.length} rules`)
for (const rule of bucket.corsRules) {
  console.log(`  cors        ${rule.corsRuleName}: ${rule.allowedOrigins.join(', ')} — ${rule.allowedOperations.join(', ')}`)
}
