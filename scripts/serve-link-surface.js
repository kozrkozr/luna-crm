/**
 * Serve the static export the way Cloudflare Pages will (ADR-012).
 *
 *     npm run export:web && npm run serve:link
 *
 * Two of three user flows are anonymous link views served from `dist/`, and
 * they cannot be exercised with a plain static server: `expo export -p web`
 * emits dynamic routes as literal files named after the parameter, so
 * `/s/<token>` is a 404 until the host rewrites to `s/[token].html`. That
 * rewrite lives in `public/_redirects` and is the thing S-2 F-3 flagged as
 * never having run against a real Pages deployment.
 *
 * So this reads `_redirects` and applies the rules IN ORDER, honouring `:param`
 * segments and a trailing `*`. Order is not a detail: `/s/<token>/references`
 * matches both rules, and the wrong one serves the shoot view instead of the
 * all-references page — a silently wrong page rather than an error.
 *
 * It binds all interfaces, so a phone on the same Wi-Fi can open the links the
 * app produces. It is a development tool and makes no attempt to be a web
 * server: no compression, no caching, no range requests.
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(process.argv[2] || 'dist')
const PORT = Number(process.env.PORT || process.argv[3] || 8099)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

function parseRedirects() {
  const file = path.join(ROOT, '_redirects')
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/)
      return { from, to, status: Number(status || 302) }
    })
}

/** Pages-style matching: literal segments, `:param`, and a trailing `*`. */
function match(pattern, urlPath) {
  const p = pattern.split('/').filter(Boolean)
  const u = urlPath.split('/').filter(Boolean)
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') return true
    if (u[i] === undefined) return false
    if (p[i].startsWith(':')) continue
    if (p[i] !== u[i]) return false
  }
  return u.length === p.length
}

const REDIRECTS = parseRedirects()

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0])
    let file = path.join(ROOT, urlPath)

    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const asHtml = path.join(ROOT, `${urlPath}.html`)
      const asIndex = path.join(ROOT, urlPath, 'index.html')
      if (fs.existsSync(asHtml)) file = asHtml
      else if (fs.existsSync(asIndex)) file = asIndex
      else {
        // First matching rule wins, as Pages does.
        const rule = REDIRECTS.find((r) => match(r.from, urlPath))
        if (!rule) {
          res.writeHead(404)
          return res.end('not found')
        }
        if (rule.status !== 200) {
          res.writeHead(rule.status, { location: rule.to })
          return res.end()
        }
        file = path.join(ROOT, rule.to)
        if (!fs.existsSync(file)) {
          res.writeHead(404)
          return res.end(`rewrite target missing: ${rule.to}`)
        }
      }
    }

    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(PORT, () => {
    console.log(`link surface: http://localhost:${PORT}  (and on your LAN address)`)
    for (const r of REDIRECTS) console.log(`  rewrite  ${r.from}  ->  ${r.to}  [${r.status}]`)
  })
