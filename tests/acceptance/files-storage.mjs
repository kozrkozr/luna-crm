/**
 * EP-07 foundation — runs `files-storage.deno.ts` (the storage module is Deno
 * code) and passes its PASS/FAIL lines through for `run-all.sh`.
 *
 * Needs Deno and the local S3: `bash scripts/local-s3.sh start`.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const endpoint = process.env.LOCAL_S3_ENDPOINT ?? 'http://127.0.0.1:8333'
const host = new URL(endpoint).host
const run = spawnSync('deno', [
  'run', '--node-modules-dir=none', '--allow-env',
  `--allow-net=${host},${host.replace('127.0.0.1', 'localhost')}`,
  path.join(here, 'files-storage.deno.ts'),
], { encoding: 'utf8', env: { ...process.env, LOCAL_S3_ENDPOINT: endpoint } })
process.stdout.write(run.stdout ?? '')
if (run.status !== 0 || run.error) {
  console.log(`FAIL  deno exited ${run.status}${run.error ? ` — ${run.error.message}` : ''}`)
  process.stderr.write(run.stderr ?? '')
}
