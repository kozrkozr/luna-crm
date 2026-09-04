/**
 * Serve the static export as one pannable canvas of every screen, with the
 * theme's colour tokens editable live.
 *
 *     npm run theme:seed          # once, and again whenever the data goes stale
 *     npm run export:web
 *     npm run theme               # http://localhost:8097/__theme/
 *
 * Why this can exist at all: NativeWind compiles every colour in the app to
 * `hsl(var(--token) / <alpha>)` and leaves the tokens themselves in `:root`, so
 * overriding a custom property in the browser recolours the whole app with no
 * rebuild and no reload. The canvas is therefore not a mockup of the screens —
 * it is the screens, running, with a stylesheet being edited underneath them.
 *
 * Three things this serves beyond `dist/`:
 *
 *   /__theme/               the canvas
 *   /__theme/manifest.json  the seeded screen list, plus a FRESH session
 *   /__theme/session        a fresh session on demand
 *
 * The session matters more than it looks. Eleven of the twenty screens are
 * behind auth, and a static export has no server to log in against. So the
 * canvas writes a real session into localStorage on this origin before it
 * creates any iframe, and every same-origin iframe picks it up. Supabase
 * sessions expire in an hour, which is shorter than a design session, so the
 * value is minted per request here rather than baked into the manifest.
 *
 * This server resolves NO environment of its own. `seed.mjs` writes the API URL
 * and the anon key into the manifest, and this reads them from there. Going
 * through `tests/acceptance/env.mjs` looked tidier and was wrong: that module
 * refuses to load without the SERVICE-ROLE key, which it finds by shelling out
 * to `supabase status`. This server never needs that key — signing in as one
 * seeded account is an anon-key operation — so the reuse made a read-only
 * static server refuse to start whenever Docker was down. Measured: it did
 * exactly that. The seeder no longer goes through it either.
 *
 * Route resolution is NOT the same as `serve-link-surface.js`, and deliberately.
 * That script emulates Cloudflare Pages, because the link surface is what ships
 * there and the emulation is the point. This one has to serve the CREATOR's
 * routes too — `/shoot/<uuid>/edit` — which have no rule in `public/_redirects`
 * and should not get one: that file is production config for the anonymous link
 * surface, and adding app routes to it would ship rules for pages Pages never
 * serves. So `_redirects` is still honoured first, and anything it does not
 * match falls through to a generic walk that matches a path segment against a
 * `[param]` file or directory. Local tooling only.
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')
const ROOT = path.join(REPO_ROOT, 'dist')
const MANIFEST = path.join(REPO_ROOT, '.theme-playground.json')
const PORT = Number(process.env.PORT || process.argv[2] || 8097)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const die = (message) => {
  console.error('\n' + message + '\n')
  process.exit(1)
}

if (!fs.existsSync(ROOT)) die('No dist/. Run:\n\n    npm run export:web')
if (!fs.existsSync(MANIFEST)) die('No .theme-playground.json. Run:\n\n    npm run theme:seed')

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

if (!manifest.supabaseUrl || !manifest.anonKey) {
  die('The manifest predates the anon key being stored in it. Reseed:\n\n    npm run theme:seed')
}

/**
 * Does `dist/` actually talk to the Supabase that was seeded?
 *
 * This is the one failure mode that costs an afternoon. `EXPO_PUBLIC_*` values
 * are INLINED into the bundle when it is exported, not read at runtime
 * (docs/deploy-dev.md says so, and src/lib/supabase/client.ts explains why the
 * values are read from process.env directly). So an export made while `.env`
 * pointed at the hosted dev project keeps talking to the hosted project
 * forever, while `theme:seed` — which refuses to touch anything but a local
 * stack — seeds localhost. The session the canvas writes is then stored under a
 * key derived from the wrong URL, the app finds no session, and all eleven
 * authenticated screens render the login form. Nothing errors. Nothing explains
 * it.
 *
 * The check is a substring search rather than anything clever, because the URL
 * really is a string literal in the bundle: measured, three occurrences.
 */
const envCheck = (() => {
  const dir = path.join(ROOT, '_expo/static/js/web')
  if (!fs.existsSync(dir)) return { checked: false }
  let src = ''
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    src += fs.readFileSync(path.join(dir, f), 'utf8')
  }
  const baked = [
    ...new Set(
      [...src.matchAll(/https?:\/\/[A-Za-z0-9.-]+\.supabase\.co|https?:\/\/[A-Za-z0-9.-]+:5432\d/g)].map((m) => m[0])
    ),
  ]
  return { checked: true, matches: src.includes(manifest.supabaseUrl), seeded: manifest.supabaseUrl, baked }
})()

const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory()
const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile()

/** `foo` -> `foo`, `foo.html`, `foo/index.html`. */
const asPage = (p) => (isFile(p) ? p : isFile(`${p}.html`) ? `${p}.html` : isFile(path.join(p, 'index.html')) ? path.join(p, 'index.html') : null)

// ── Cloudflare Pages rewrites, for the link surface ─────────────────────────

const REDIRECTS = (() => {
  const file = path.join(ROOT, '_redirects')
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.split(/\s+/)
      return { from, to, status: Number(status || 302) }
    })
})()

/** Pages-style matching: literal segments, `:param`, trailing `*`. First rule wins. */
const matches = (pattern, segments) => {
  const p = pattern.split('/').filter(Boolean)
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') return true
    if (segments[i] === undefined) return false
    if (p[i].startsWith(':')) continue
    if (p[i] !== segments[i]) return false
  }
  return segments.length === p.length
}

/**
 * Walk `dist/` matching each segment literally, and falling back to a single
 * `[param]` entry when there is no literal.
 *
 * This is what turns `/shoot/<uuid>/edit` into `dist/shoot/[id]/edit.html`.
 * `expo export` writes the parameter name into the filename, so the walk cannot
 * know it in advance — but there is only ever one bracketed entry per level, so
 * "the bracketed one" is unambiguous.
 */
const walk = (segments) => {
  let dir = ROOT
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const last = i === segments.length - 1
    if (!isDir(dir)) return null
    const entries = fs.readdirSync(dir)

    if (last) {
      const literal = asPage(path.join(dir, seg))
      if (literal) return literal
      const bracketFile = entries.find((e) => /^\[.+\]\.html$/.test(e))
      if (bracketFile) return path.join(dir, bracketFile)
      const bracketDir = entries.find((e) => /^\[[^\]]+\]$/.test(e) && isDir(path.join(dir, e)))
      if (bracketDir) return asPage(path.join(dir, bracketDir))
      return null
    }

    if (isDir(path.join(dir, seg))) {
      dir = path.join(dir, seg)
      continue
    }
    const bracketDir = entries.find((e) => /^\[[^\]]+\]$/.test(e) && isDir(path.join(dir, e)))
    if (!bracketDir) return null
    dir = path.join(dir, bracketDir)
  }
  return null
}

const resolve = (urlPath) => {
  const segments = urlPath.split('/').filter(Boolean)
  if (!segments.length) return asPage(path.join(ROOT, 'index'))

  const direct = asPage(path.join(ROOT, urlPath))
  if (direct) return direct

  const rule = REDIRECTS.find((r) => matches(r.from, segments))
  if (rule && rule.status === 200) {
    const target = asPage(path.join(ROOT, rule.to))
    if (target) return target
  }

  return walk(segments)
}

// ── a fresh session, minted per request ─────────────────────────────────────
//
// A throwaway client with a recording storage adapter, exactly as the seed
// script does it: the key and the serialised shape come from supabase-js rather
// than from an assumption about how it names things.

const mintSession = async () => {
  let captured = null
  const probe = createClient(manifest.supabaseUrl, manifest.anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: false,
      storage: {
        getItem: () => null,
        setItem: (key, value) => {
          captured = { key, value }
        },
        removeItem: () => {},
      },
    },
  })
  const { error } = await probe.auth.signInWithPassword(manifest.account)
  if (error) throw new Error(error.message)
  if (!captured) throw new Error('supabase-js wrote no session')
  return captured
}

const send = (res, status, type, body) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(body)
}

http
  .createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])

    if (urlPath === '/__theme' || urlPath === '/__theme/') {
      return send(res, 200, TYPES['.html'], fs.readFileSync(path.join(HERE, 'canvas.html')))
    }
    if (urlPath === '/__theme/canvas.js') {
      return send(res, 200, TYPES['.js'], fs.readFileSync(path.join(HERE, 'canvas.js')))
    }
    if (urlPath === '/__theme/manifest.json' || urlPath === '/__theme/session') {
      try {
        const session = await mintSession()
        const body = urlPath === '/__theme/session' ? session : { ...manifest, session, envCheck }
        return send(res, 200, TYPES['.json'], JSON.stringify(body))
      } catch (e) {
        return send(res, 503, TYPES['.json'], JSON.stringify({ error: String(e.message ?? e) }))
      }
    }

    const file = resolve(urlPath)
    if (!file) return send(res, 404, 'text/plain; charset=utf-8', `not found: ${urlPath}`)

    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      // The whole point is editing and reloading; a cached bundle from an
      // earlier export is the least helpful thing this server could do.
      'cache-control': 'no-store',
    })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, () => {
    const age = Math.round((Date.now() - new Date(manifest.createdAt)) / 60000)
    console.log(`\n  theme playground:  http://localhost:${PORT}/__theme/`)
    console.log(`  ${manifest.screens.length} screens, seeded ${age} min ago`)
    console.log(`  reseed with:       npm run theme:seed`)
    if (envCheck.checked && !envCheck.matches) {
      console.log('')
      console.log('  ⚠  dist/ was NOT built against the Supabase that was seeded.')
      console.log(`     seeded: ${envCheck.seeded}`)
      console.log(`     baked into dist/: ${envCheck.baked.join(', ') || '(none found)'}`)
      console.log('     The app screens will all show the login form. Fix:')
      console.log('       npm run export:web   # EXPO_PUBLIC_* are inlined at build time,')
      console.log('                            # so dist/ must be rebuilt against the same .env')
    }
    console.log('')
  })
