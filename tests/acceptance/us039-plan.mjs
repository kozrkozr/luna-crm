/**
 * US-039 — runs `us039-plan.deno.ts` (the plan is app TypeScript) and passes
 * its PASS/FAIL lines through for `run-all.sh`. Needs Deno only.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const run = spawnSync('deno', ['run', '--node-modules-dir=none', '--sloppy-imports', path.join(here, 'us039-plan.deno.ts')], {
  encoding: 'utf8',
  env: { ...process.env, TZ: 'Europe/Kyiv' },
})
process.stdout.write(run.stdout ?? '')
if (run.status !== 0 || run.error) {
  console.log(`FAIL  deno exited ${run.status}${run.error ? ` — ${run.error.message}` : ''}`)
  process.stderr.write(run.stderr ?? '')
}
