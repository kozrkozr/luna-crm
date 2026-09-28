#!/usr/bin/env node
/**
 * Switch, inspect and verify which backend this working copy is pointed at.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * `EXPO_PUBLIC_*` is inlined at BUILD time, so `.env` decides — for the life of
 * a build — which Supabase project the app talks to and which host its links
 * point at. Nothing checks it afterwards. Building the app against the dev
 * project and handing it to testers is a mistake with no symptom: every screen
 * works, against the wrong database.
 *
 * `supabase db push` has the same shape and worse consequences: it applies to
 * whichever project `supabase link` last chose, which is stored separately from
 * `.env` and drifts from it silently. Migrations are forward-only.
 *
 * So the two facts that must agree — the env file and the linked project — are
 * printed together, and `status` is what tells you they have diverged BEFORE a
 * push rather than after.
 *
 * Usage:
 *   node scripts/env.mjs use dev|prod   copy .env.<target> over .env
 *   node scripts/env.mjs status         what .env and the Supabase CLI point at
 *   node scripts/env.mjs verify         assert dist/ matches the current .env
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const ENV = join(ROOT, '.env')

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null)

const valueOf = (text, key) => text?.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? null

/** The project ref is the first label of the Supabase hostname. */
const refOf = (text) => valueOf(text, 'EXPO_PUBLIC_SUPABASE_URL')?.match(/\/\/([^.]+)\./)?.[1] ?? null

/** What `supabase link` last chose. Separate from `.env`, and able to disagree. */
const linkedRef = () => read(join(ROOT, 'supabase/.temp/project-ref'))?.trim() || null

/** Which `.env.<name>` the current `.env` is a copy of, if any. */
function currentTarget() {
  const now = read(ENV)
  if (!now) return null
  for (const name of ['dev', 'prod']) {
    if (read(join(ROOT, `.env.${name}`)) === now) return name
  }
  return null
}

function status() {
  const now = read(ENV)
  if (!now) {
    console.error('.env is missing. Run: npm run use:dev')
    process.exit(1)
  }

  const target = currentTarget()
  const ref = refOf(now)
  const linked = linkedRef()

  console.log(`.env             ${target ?? 'custom (matches no .env.dev/.env.prod)'}`)
  console.log(`  supabase       ${ref ?? '(unreadable)'}`)
  console.log(`  links          ${valueOf(now, 'EXPO_PUBLIC_LINK_BASE_URL') ?? '(unset)'}`)
  console.log(`supabase link    ${linked ?? '(not linked)'}`)

  if (linked && ref && linked !== ref) {
    console.log('')
    console.log('MISMATCH: `supabase db push` would apply migrations to a different')
    console.log('project than the app is built against. Relink before pushing:')
    console.log(`  npx supabase link --project-ref ${ref}`)
    process.exit(1)
  }
}

function use(target) {
  const source = join(ROOT, `.env.${target}`)
  if (!existsSync(source)) {
    console.error(`.env.${target} does not exist.`)
    process.exit(1)
  }
  copyFileSync(source, ENV)
  console.log(`.env now points at ${target} (${refOf(read(source))}).`)
  console.log('')
  console.log('Nothing is built yet: EXPO_PUBLIC_* is inlined at build time, so')
  console.log('both surfaces still carry the previous values until rebuilt —')
  console.log('  npm run export:web   (then deploy)')
  console.log('  npm run ios')

  const linked = linkedRef()
  const ref = refOf(read(source))
  if (linked && ref && linked !== ref) {
    console.log('')
    console.log(`Supabase CLI is still linked to ${linked}. To match:`)
    console.log(`  npx supabase link --project-ref ${ref}`)
  }
}

/**
 * Assert the built export carries the project `.env` names — the check that
 * would have caught a stale Metro cache, which `--clear` exists to prevent and
 * which fails silently when it is forgotten.
 */
function verify() {
  const dist = join(ROOT, 'dist')
  if (!existsSync(dist)) {
    console.error('dist/ does not exist. Run: npm run export:web')
    process.exit(1)
  }

  const expected = refOf(read(ENV))
  if (!expected) {
    console.error('Could not read EXPO_PUBLIC_SUPABASE_URL from .env')
    process.exit(1)
  }

  const others = ['dev', 'prod']
    .map((name) => refOf(read(join(ROOT, `.env.${name}`))))
    .filter((ref) => ref && ref !== expected)

  let found = false
  const stale = new Set()

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.(js|html|json|map)$/.test(entry)) continue
      const text = readFileSync(path, 'utf8')
      if (text.includes(expected)) found = true
      for (const ref of others) if (text.includes(ref)) stale.add(ref)
    }
  }
  walk(dist)

  if (!found) {
    console.error(`FAIL: dist/ does not mention ${expected}. Rebuild with npm run export:web.`)
    process.exit(1)
  }
  if (stale.size) {
    console.error(`FAIL: dist/ still carries ${[...stale].join(', ')} — a stale build.`)
    process.exit(1)
  }
  console.log(`ok: dist/ is built against ${expected} and carries no other project.`)
}

const [command, argument] = process.argv.slice(2)
if (command === 'use' && (argument === 'dev' || argument === 'prod')) use(argument)
else if (command === 'status') status()
else if (command === 'verify') verify()
else {
  console.error('usage: node scripts/env.mjs use dev|prod | status | verify')
  process.exit(1)
}
