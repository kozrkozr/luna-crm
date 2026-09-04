/**
 * Freeze the canvas into a static site anyone can open from a URL.
 *
 *     npm run theme:seed -- --hosted   # once, to put the demo scene in place
 *     npm run theme:freeze
 *     npx wrangler pages deploy theme-dist --project-name=luna-theme
 *
 * ## Why freeze rather than deploy the app
 *
 * Eleven of the twenty screens are behind auth, and a static host has nowhere
 * to get a session. Baking one in does not work either: `supabase/config.toml`
 * sets `enable_refresh_token_rotation = true` with a 10s reuse interval, so a
 * refresh token in a public file is consumed by the first visitor and rejected
 * for everyone after. A URL you hand to one person would break on the second.
 *
 * So each screen is loaded ONCE here — logged in, against the seeded local
 * stack — and its hydrated DOM is captured as plain HTML. The result needs no
 * Supabase, no session, no Edge Function and no secrets, and nothing in it
 * expires.
 *
 * ## Why the colours still work after freezing
 *
 * Because they were never in the DOM. NativeWind emits them as classes that
 * resolve to `hsl(var(--token) / <alpha>)`, so the frozen markup keeps the class
 * names and the palette stays in `:root` where the panel can still reach it.
 * Measured on the exported build: overriding `--background`, `--foreground` and
 * `--radius` repaints class-driven elements and moves a control's corner to
 * 32px.
 *
 * ## What is deliberately thrown away
 *
 * Every `<script>`. If the app's JS survived, React would hydrate the frozen
 * markup, find no session, and replace all eleven screens with the login form —
 * which is the exact failure this whole approach exists to avoid. Dropping the
 * JS is what makes the capture stable, and it is also why the screens are not
 * clickable: no sheets, no dropdowns, no press states. For a colour tool that is
 * the trade being made on purpose.
 *
 * Signed Storage URLs are downloaded and rewritten to local files, because they
 * expire in an hour and a deployed page full of dead image tiles is worse than
 * one with no images.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { openBrowser } from '../../tests/acceptance/cdp.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')
const DIST = path.join(REPO_ROOT, 'dist')
const OUT = path.join(REPO_ROOT, 'theme-dist')
const MANIFEST = path.join(REPO_ROOT, '.theme-playground.json')
const PORT = Number(process.env.FREEZE_PORT || 8096)
const BASE = `http://127.0.0.1:${PORT}`
const ALLOW_ANON = process.argv.includes('--allow-unauthenticated')

const die = (msg) => {
  console.error('\n' + msg + '\n')
  process.exit(1)
}
const step = (s) => console.log(`\n▸ ${s}`)
const ok = (s) => console.log(`  ✓ ${s}`)
const warn = (s) => console.log(`  ! ${s}`)

if (!fs.existsSync(DIST)) die('No dist/. Run:\n\n    npm run export:web')
if (!fs.existsSync(MANIFEST)) die('No .theme-playground.json. Run:\n\n    npm run theme:seed')
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * A filename for a captured screen — WITHOUT the ids in the URL.
 *
 * The obvious slug of the path leaks the real access tokens into filenames on a
 * public site: `/s/<token>` became `s-erw-yyu5hq5vd5xs-…`, which is the live
 * credential for that shoot's link view. Fake data on a throwaway project, but
 * there is no reason to publish a working token, and the names were unreadable
 * anyway.
 *
 * So id-shaped segments — UUIDs and long opaque tokens — are dropped, and the
 * group plus a running number keeps what is left unique. Two different shoots
 * both reduce to `shoot`, and the crew and client links both reduce to `s`;
 * without the number they would collide silently and one screen would overwrite
 * another.
 */
const isId = (seg) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || seg.length > 20

const fileFor = (screen, index) => {
  const parts = screen.url.split('/').filter(Boolean).filter((seg) => !isId(seg))
  const tail = parts.join('-').replace(/[^a-zA-Z0-9-]+/g, '').toLowerCase()
  const n = String(index + 1).padStart(2, '0')
  return `${screen.group}-${n}${tail ? `-${tail}` : '-home'}.html`
}

// ── serve dist/ ourselves, so this is one command ───────────────────────────

step('Сервер')
const server = spawn(process.execPath, [path.join(HERE, 'serve.mjs'), String(PORT)], {
  cwd: REPO_ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (d) => (serverLog += d))
server.stderr.on('data', (d) => (serverLog += d))

const stopServer = () => {
  if (!server.killed) server.kill()
}
process.on('exit', stopServer)

let up = false
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`${BASE}/__theme/canvas.js`)
    if (res.ok) {
      up = true
      break
    }
  } catch {
    /* not listening yet */
  }
  await sleep(250)
}
if (!up) die(`The server did not come up on ${PORT}. It said:\n\n${serverLog}`)
ok(`слухає ${BASE}`)

// ── a session, or an explicit decision to go without one ────────────────────

step('Сесія')
let session = null
try {
  const res = await fetch(`${BASE}/__theme/session`)
  const body = await res.json()
  if (body.key) {
    session = body
    ok('отримано')
  } else {
    throw new Error(body.error || 'no key in response')
  }
} catch (e) {
  const msg = String(e.message ?? e)
  if (!ALLOW_ANON) {
    stopServer()
    die(
      [
        `Не зміг отримати сесію: ${msg}`,
        '',
        'Без неї одинадцять екранів застосунку замерзнуть як форма входу,',
        'і ви задеплоїли б двадцять сторінок логіну, не помітивши цього.',
        '',
        'Найімовірніше не запущений локальний стек:',
        '',
        '    npm run theme:seed -- --hosted',
        '',
        'Якщо ви СПРАВДІ хочете зняти лише анонімні екрани, додайте',
        '--allow-unauthenticated.',
      ].join('\n')
    )
  }
  warn(`немає (${msg}) — знімаю без неї, бо задано --allow-unauthenticated`)
}

// ── capture ─────────────────────────────────────────────────────────────────

const B = await openBrowser({ port: 9880, width: 390, height: 1400 })
const { ev, navigate } = B

const captures = []
const media = new Map() // absolute URL -> local filename

try {
  if (session) {
    // Any page on the origin will do; /login is the cheapest.
    await navigate(`${BASE}/login`)
    await ev(`localStorage.setItem(${JSON.stringify(session.key)}, ${JSON.stringify(session.value)})`)
    ok('записано в localStorage')
  }

  step(`Знімаю ${manifest.screens.length} екранів`)
  for (const screen of manifest.screens) {
    try {
      await navigate(`${BASE}${screen.url}`)

      /*
       * `navigate` settles on the page text going quiet, and that is not enough
       * here. Measured: the all-references screen froze holding 13 characters —
       * its title and nothing else — because the header renders before the list
       * arrives, so the text was briefly stable while the screen was still
       * empty. Live, the same screen showed its reference links.
       *
       * So settle again on the NODE COUNT as well as the text. A list arriving
       * changes the node count even when it adds no text of its own (an image
       * grid), which is exactly the case the text-only check cannot see.
       */
      await ev(`(async()=>{
        const snap = () => document.querySelectorAll('*').length + ':' + document.body.innerText.length;
        let last = null, stable = 0;
        const started = Date.now();
        while (Date.now() - started < 15000) {
          const now = snap();
          if (now === last) { if (++stable >= 4) break; } else { stable = 0; last = now; }
          await new Promise(r => setTimeout(r, 200));
        }
        // Images resolve after the payload and carry no text at all, so they get
        // their own wait rather than being trusted to the settle above.
        const imgs = [...document.querySelectorAll('img')];
        await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 5000) })));
        return snap();
      })()`)

      const landed = await ev('location.pathname')
      const html = await ev('document.documentElement.outerHTML')
      const words = (await ev('document.body.innerText')).replace(/\s+/g, ' ').trim()

      const stranded = screen.group === 'app' && /^\/(login|register)/.test(landed)
      // A screen that froze holding almost nothing is the signature of a
      // capture that outran its data. Reported per screen so it cannot pass
      // unnoticed; 20 is well below any real screen here and above the empty
      // ones that are genuinely empty by design.
      const thin = words.length < 20
      captures.push({ ...screen, html, landed, stranded, thin, chars: words.length, preview: words.slice(0, 70) })
      const flag = stranded ? '!' : thin ? '?' : '✓'
      const why = stranded ? '  (замерз як форма входу)' : thin ? `  (лише ${words.length} символів — схоже, дані не встигли)` : ''
      console.log(`  ${flag} ${screen.title}${why}`)
    } catch (e) {
      warn(`${screen.title}: ${String(e.message ?? e).split('\n')[0]}`)
      captures.push({ ...screen, html: null })
    }
  }
} finally {
  await B.close?.()
  stopServer()
}

const thin = captures.filter((c) => c.thin)
if (thin.length) {
  warn(`${thin.length} екран(и) майже порожні: ${thin.map((c) => c.title).join(', ')}`)
  warn('Якщо вони не порожні за задумом — перезапустіть; дані не встигли прийти.')
}
const failed = captures.filter((c) => !c.html)
const stranded = captures.filter((c) => c.stranded)
if (failed.length) warn(`${failed.length} екран(и) не знялися — їх не буде в результаті`)
if (stranded.length && !ALLOW_ANON) {
  die(
    [
      `${stranded.length} екран(ів) застосунку замерзли як форма входу:`,
      ...stranded.map((s) => `  - ${s.title}`),
      '',
      'Сесія була, але не подіяла — найімовірніше dist/ зібраний проти іншої',
      'Supabase, ніж та, яку засіяли. Пересоберіть і повторіть:',
      '',
      '    npm run export:web',
      '',
      'Нічого не записано.',
    ].join('\n')
  )
}

// ── rewrite and write out ───────────────────────────────────────────────────

step('Складаю theme-dist/')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'media'), { recursive: true })

/** Download one remote asset into media/ and return its relative path. */
const localise = async (url) => {
  if (media.has(url)) return media.get(url)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const type = res.headers.get('content-type') || ''
    const ext =
      (type.match(/image\/(png|jpeg|webp|gif)/)?.[1] ?? 'bin').replace('jpeg', 'jpg')
    const name = `${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}.${ext}`
    fs.writeFileSync(path.join(OUT, 'media', name), buf)
    const rel = `../media/${name}`
    media.set(url, rel)
    return rel
  } catch (e) {
    warn(`медіа не завантажилось (${String(e.message ?? e)}): ${url.slice(0, 70)}…`)
    media.set(url, null)
    return null
  }
}

let cssHref = null
const written = []

for (const cap of captures) {
  if (!cap.html) continue
  let html = cap.html

  // 1. The scripts have to go. See the header.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<script\b[^>]*\/>/gi, '')
  html = html.replace(/<link\b[^>]*rel=["']?(?:preload|modulepreload|prefetch)["']?[^>]*>/gi, '')

  // 2. Remember which stylesheet the app uses; the panel parses :root from it.
  const found = html.match(/href="([^"]*\/_expo\/static\/css\/[^"]+\.css)"/)
  if (found) cssHref = found[1].startsWith('/') ? found[1] : `/${found[1]}`

  // 3. Signed Storage URLs expire in an hour. Pull them local.
  const remote = new Set()
  for (const m of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) remote.add(m[1])
  for (const m of html.matchAll(/url\((?:&quot;|["'])?(https?:\/\/[^)"']+)/g)) remote.add(m[1])
  for (const url of remote) {
    if (!url.includes('/storage/v1/')) continue
    const rel = await localise(url)
    if (rel) html = html.split(url).join(rel)
  }

  const name = fileFor(cap, captures.indexOf(cap))
  fs.writeFileSync(path.join(OUT, 'screens', name), `<!doctype html>\n${html}`)
  // No `source` field: it carried the raw URL, which is how both access tokens
  // and the shoots' UUIDs ended up in a file served to the public. The frozen
  // HTML itself contains neither — measured — and nothing in the panel needs
  // them.
  written.push({ group: cap.group, title: cap.title, url: `./screens/${name}` })
}

if (!written.length) die('Нічого не знялося.')
if (!cssHref) die('Не знайшов посилання на стиль застосунку в жодному знімку.')

// 4. The stylesheet, at the same absolute path the frozen pages reference.
const cssFrom = path.join(DIST, cssHref.replace(/^\//, ''))
const cssTo = path.join(OUT, cssHref.replace(/^\//, ''))
fs.mkdirSync(path.dirname(cssTo), { recursive: true })
fs.copyFileSync(cssFrom, cssTo)
ok(`стиль: ${cssHref}`)

// 5. Static assets the shell references (icons, favicon).
if (fs.existsSync(path.join(DIST, 'assets'))) {
  fs.cpSync(path.join(DIST, 'assets'), path.join(OUT, 'assets'), { recursive: true })
}
for (const f of ['favicon.ico']) {
  if (fs.existsSync(path.join(DIST, f))) fs.copyFileSync(path.join(DIST, f), path.join(OUT, f))
}

// 6. The panel, unchanged — it detects a static build from the absence of
//    /__theme/manifest.json and reads screens.json instead.
fs.copyFileSync(path.join(HERE, 'canvas.html'), path.join(OUT, 'index.html'))
fs.copyFileSync(path.join(HERE, 'canvas.js'), path.join(OUT, 'canvas.js'))
fs.writeFileSync(
  path.join(OUT, 'index.html'),
  fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').replace('/__theme/canvas.js', './canvas.js')
)
fs.writeFileSync(
  path.join(OUT, 'screens.json'),
  JSON.stringify({ static: true, frozenAt: new Date().toISOString(), cssHref, screens: written }, null, 2) + '\n'
)

const bytes = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = path.join(dir, e.name)
    return sum + (e.isDirectory() ? bytes(p) : fs.statSync(p).size)
  }, 0)

console.log('')
ok(`${written.length} екранів, ${media.size} медіафайлів, ${(bytes(OUT) / 1048576).toFixed(1)} МБ`)
console.log('')
console.log('  Подивитися локально:')
console.log(`    node scripts/serve-link-surface.js theme-dist 8095   →  http://localhost:8095/`)
console.log('')
console.log('  Задеплоїти (НОВИЙ проєкт, не luna-crm-107):')
console.log('    npx wrangler pages deploy theme-dist --project-name=luna-theme')
console.log('')
