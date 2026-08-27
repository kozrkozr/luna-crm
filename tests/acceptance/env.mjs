/**
 * Environment bootstrap for the acceptance suites.
 *
 * Every suite in this folder talks to a real Supabase and, for most of them, to
 * two real dev servers. Rather than a hand-written env file that goes stale the
 * moment the LAN address changes, the values are resolved here, in this order:
 *
 *   1. anything already exported in the shell wins, always;
 *   2. `<repo>/.env` — the same URL and anon key the app itself is built with,
 *      so a suite can never test a different backend than the app;
 *   3. `supabase status -o env` for the service-role key, which is deliberately
 *      absent from `.env` because `EXPO_PUBLIC_*` values are shipped in the
 *      bundle. If the CLI route fails, the key is read out of the running edge
 *      runtime container instead.
 *
 * Nothing is resolved from a hosted project, and `assertLocal` below refuses to
 * run at all against one: these suites sign up hundreds of accounts and upload
 * media on every run.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(HERE, '../..')

/** The Expo web dev server — `npx expo start --web --port 8098`. */
export const APP_URL = (process.env.APP_URL || 'http://localhost:8098').replace(/\/+$/, '')
/** The exported static link surface — `npm run serve:link`. */
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:8099').replace(/\/+$/, '')

/** Parse a dotenv-shaped file. Deliberately minimal: `KEY=value`, `#` comments. */
const readDotEnv = (file) => {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!m || line.trimStart().startsWith('#')) continue
    out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

const dotEnv = readDotEnv(path.join(REPO_ROOT, '.env'))

/**
 * `supabase status -o env`, parsed. Cached, because it costs about a second and
 * three suites would otherwise pay for it. Returns `{}` if the CLI is missing
 * or the stack is not running — the caller decides whether that is fatal.
 */
let statusCache = null
const supabaseStatus = () => {
  if (statusCache) return statusCache
  statusCache = {}
  const local = path.join(REPO_ROOT, 'node_modules/.bin/supabase')
  const bin = fs.existsSync(local) ? local : 'supabase'
  try {
    const out = execFileSync(bin, ['status', '-o', 'env'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    // The command also prints notices ("Stopped services", a version nag), so
    // only strict KEY="value" lines are taken.
    for (const line of out.split('\n')) {
      const m = /^([A-Z0-9_]+)="(.*)"$/.exec(line.trim())
      if (m) statusCache[m[1]] = m[2]
    }
  } catch {
    /* falls through to the container read */
  }
  return statusCache
}

/** Last resort for the service-role key: ask the edge runtime container. */
const serviceRoleFromContainer = () => {
  try {
    return execFileSync(
      'docker',
      ['exec', 'supabase_edge_runtime_luna-crm', 'printenv', 'SUPABASE_SERVICE_ROLE_KEY'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim()
  } catch {
    return ''
  }
}

const die = (message) => {
  console.error('\n' + message + '\n')
  process.exit(1)
}

const SB_URL = (process.env.SB_URL || dotEnv.EXPO_PUBLIC_SUPABASE_URL || supabaseStatus().API_URL || '')
  .replace(/\/+$/, '')
const SB_ANON = process.env.SB_ANON || dotEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || supabaseStatus().ANON_KEY || ''
const SB_KEY =
  process.env.SB_KEY || supabaseStatus().SERVICE_ROLE_KEY || serviceRoleFromContainer() || ''

const missing = [
  !SB_URL && 'SB_URL          (the Supabase API URL)',
  !SB_ANON && 'SB_ANON         (the anon key)',
  !SB_KEY && 'SB_KEY          (the service-role key)',
].filter(Boolean)

if (missing.length) {
  die(
    [
      'The acceptance suites cannot find a local Supabase. Missing:',
      ...missing.map((m) => '  - ' + m),
      '',
      'Start the local stack and try again:',
      '',
      '    npx supabase start',
      '',
      'The URL and anon key are read from ' + path.join(REPO_ROOT, '.env') + ' —',
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. The service-role',
      'key comes from `supabase status -o env`. Any of the three can be overridden',
      'by exporting SB_URL / SB_ANON / SB_KEY.',
    ].join('\n')
  )
}

/**
 * Refuse to run against anything but a local or LAN Supabase.
 *
 * `.env` deliberately holds this Mac's LAN address rather than 127.0.0.1, so a
 * build on the phone reaches the right host — which means "is it localhost?" is
 * not a strict enough test on its own, and a bare hostname check would let a
 * hosted project through. Private ranges are allowed; everything else is not.
 */
const isLocalHost = (host) => {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === 'localhost' || h === '::1' || h.endsWith('.local') || h === 'host.docker.internal') return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
}

let host = ''
try {
  host = new URL(SB_URL).hostname
} catch {
  die(`SB_URL is not a URL: ${JSON.stringify(SB_URL)}`)
}

if (!isLocalHost(host)) {
  die(
    [
      `Refusing to run: SB_URL points at ${SB_URL}`,
      '',
      `"${host}" is neither localhost nor a private LAN address, so this looks like`,
      'a hosted Supabase project. These suites sign up hundreds of accounts, create',
      'shoots and upload media, and they never clean up — pointing them at a real',
      'project would fill it with test data.',
      '',
      'Run them against `npx supabase start` only.',
    ].join('\n')
  )
}

// The suites read these off `process.env`, and so does anything they spawn.
process.env.SB_URL = SB_URL
process.env.SB_ANON = SB_ANON
process.env.SB_KEY = SB_KEY
process.env.APP_URL = APP_URL
process.env.SITE_URL = SITE_URL

export { SB_URL, SB_ANON, SB_KEY }
