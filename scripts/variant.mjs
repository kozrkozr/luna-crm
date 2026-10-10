#!/usr/bin/env node
/**
 * Run a command against one environment, without touching `.env`.
 *
 *   node scripts/variant.mjs <local|dev|prod|store-sandbox|local-shots> [--prebuild|--clean] [command ...]
 *
 * Loads `.env.<target>` into the command's environment and sets APP_VARIANT —
 * `production` for prod, `development` otherwise (app.config.ts). Variables in
 * the environment win over the `.env` file, so the file on disk no longer
 * decides which backend a build talks to; the script name does.
 *
 *   --prebuild  regenerate ios/ first if it was prebuilt for another variant or
 *               backend (bundle id, scheme and baked env live in ios/)
 *   --clean     regenerate ios/ first, always — for an App Store archive
 *
 * With no command, it only prebuilds.
 *
 * `store-sandbox` (EP-09) — **Luna Shoots** against the **dev** backend, with the
 * App Store's RevenueCat key from `.env.prod`. Apple sells the real product only
 * to `com.lunashoots.ios`, which the prod target bakes against prod; this is
 * that app pointed at dev, for buying with a sandbox Apple ID without touching
 * the production database (`docs/spikes/S-7-revenuecat.md`, "Still owed").
 * Installing it replaces the TestFlight build on that phone — reinstall from
 * TestFlight afterwards.
 *
 * `local-shots` — **Luna Shoots** against the **local** backend, for the App
 * Store screenshots (`scripts/demo/README.md`): the app's name shows in a
 * notification and in Safari's back link, and it must say Luna Shoots, not
 * Luna Dev. Simulator only.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const FILES = {
  local: '.env.local',
  dev: '.env.dev',
  prod: '.env.prod',
  'store-sandbox': '.env.dev',
  'local-shots': '.env.local',
}

const [target, ...rest] = process.argv.slice(2)
if (!FILES[target]) {
  console.error('usage: node scripts/variant.mjs <local|dev|prod|store-sandbox|local-shots> [--prebuild|--clean] [command ...]')
  process.exit(1)
}
const prebuild = rest[0] === '--prebuild' || rest[0] === '--clean'
const force = rest[0] === '--clean'
const command = prebuild ? rest.slice(1) : rest

const envFile = join(ROOT, FILES[target])
if (!existsSync(envFile)) {
  console.error(`${FILES[target]} does not exist.`)
  process.exit(1)
}
const vars = {}
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
  if (m && !line.trimStart().startsWith('#')) vars[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
}
if (target === 'store-sandbox') {
  // The App Store key, not the Test Store one: the purchase has to reach Apple.
  const prod = readFileSync(join(ROOT, FILES.prod), 'utf8')
  const key = /^\s*EXPO_PUBLIC_REVENUECAT_IOS_KEY\s*=\s*(\S+)/m.exec(prod)?.[1]
  if (!key?.startsWith('appl_')) {
    console.error('store-sandbox needs EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_… in .env.prod')
    process.exit(1)
  }
  vars.EXPO_PUBLIC_REVENUECAT_IOS_KEY = key
}
const variant = ['prod', 'store-sandbox', 'local-shots'].includes(target) ? 'production' : 'development'
const env = { ...process.env, ...vars, APP_VARIANT: variant }
// app.config.ts refuses Luna Shoots against anything but prod unless told this
// is one of the two deliberate exceptions.
if (target === 'store-sandbox' || target === 'local-shots') env.LUNA_NONPROD_BACKEND = '1'

const ref = vars.EXPO_PUBLIC_SUPABASE_URL?.match(/\/\/([^.:/]+)/)?.[1] ?? '(unset)'
console.log(
  `▶ ${target} · ${variant === 'production' ? 'Luna Shoots (com.lunashoots.ios)' : 'Luna Dev (com.lunashoots.ios.dev)'} · supabase ${ref}`
)

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

if (prebuild) {
  // What the current ios/ was generated for — the plugin's exports in .xcode.env.
  const baked = existsSync(join(ROOT, 'ios/.xcode.env'))
    ? readFileSync(join(ROOT, 'ios/.xcode.env'), 'utf8')
    : ''
  const matches =
    baked.includes(`export APP_VARIANT='${variant}'`) &&
    baked.includes(`export EXPO_PUBLIC_SUPABASE_URL='${vars.EXPO_PUBLIC_SUPABASE_URL}'`)
  if (force || !matches) {
    console.log(force ? '  regenerating ios/ (--clean)' : '  ios/ was built for another variant — regenerating')
    run('npx', ['expo', 'prebuild', '-p', 'ios', '--clean'])
  }
}

/*
 * A workspace with no project beside it is left over from the other variant —
 * Xcode writes it back if it had it open when ios/ was regenerated. Expo CLI
 * would pick it and fail on a scheme it does not contain.
 */
const iosDir = join(ROOT, 'ios')
if (existsSync(iosDir)) {
  for (const entry of readdirSync(iosDir)) {
    if (!entry.endsWith('.xcworkspace')) continue
    const name = entry.slice(0, -'.xcworkspace'.length)
    if (!existsSync(join(iosDir, `${name}.xcodeproj`))) {
      console.log(`  removing stale ios/${entry} (no ${name}.xcodeproj)`)
      rmSync(join(iosDir, entry), { recursive: true, force: true })
    }
  }
}

if (command.length) run(command[0], command.slice(1))
