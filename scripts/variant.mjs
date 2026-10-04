#!/usr/bin/env node
/**
 * Run a command against one environment, without touching `.env`.
 *
 *   node scripts/variant.mjs <local|dev|prod> [--prebuild|--clean] [command ...]
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
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const FILES = { local: '.env.local', dev: '.env.dev', prod: '.env.prod' }

const [target, ...rest] = process.argv.slice(2)
if (!FILES[target]) {
  console.error('usage: node scripts/variant.mjs <local|dev|prod> [--prebuild|--clean] [command ...]')
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
const variant = target === 'prod' ? 'production' : 'development'
const env = { ...process.env, ...vars, APP_VARIANT: variant }

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

if (command.length) run(command[0], command.slice(1))
