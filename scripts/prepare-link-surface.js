#!/usr/bin/env node
/**
 * Rename the exported dynamic routes to bracket-free filenames.
 *
 * `expo export -p web` emits a dynamic route as a file literally named after
 * the parameter — `s/[token].html`. On Cloudflare Pages that is unservable:
 * Pages normalises `.html` to a clean URL and then normalises the bracket
 * characters, and the two rules chase each other. Measured on a real
 * deployment, 2026-08-27:
 *
 *     /s/anything      -> 308  /s/[token]
 *     /s/[token].html  -> 308  /s/[token]
 *     /s/[token]       -> 308  /s/[token]     <- redirects to itself, forever
 *
 * A reader gets ERR_TOO_MANY_REDIRECTS on a perfectly valid link. Spike S-2's
 * F-3 flagged the bracket characters as the most likely thing to need special
 * handling on a real host and left it unverified; this is that risk arriving.
 *
 * So the files are renamed to something Pages can serve, and `public/_redirects`
 * points at the new names. The rewrite still hands every `/s/<real-token>` URL
 * the same HTML, which reads the token from `location.pathname` exactly as
 * before — nothing about the app changes, only the name of the file on disk.
 *
 * Flat names, not nested: a directory called `[token]` has the same problem as
 * a file called `[token].html`.
 */
const fs = require('node:fs')
const path = require('node:path')

const DIST = path.resolve(process.argv[2] || 'dist')

/** Exported name → the name Cloudflare Pages can actually serve. */
const RENAMES = [
  ['s/[token].html', 's/link.html'],
  ['s/[token]/references.html', 's/link-references.html'],
  ['s/[token]/crew/[crewId].html', 's/link-crew.html'],
]

let renamed = 0
for (const [from, to] of RENAMES) {
  const source = path.join(DIST, from)
  if (!fs.existsSync(source)) {
    console.error(`  MISSING: ${from} — the export did not produce it; the route may have been renamed`)
    process.exitCode = 1
    continue
  }
  const target = path.join(DIST, to)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
  renamed += 1
  console.log(`  ${from}  ->  ${to}`)
}

// Remove the bracket originals. Leaving them costs nothing in bytes but leaves
// self-redirecting URLs live on the site, which is a confusing thing to find.
fs.rmSync(path.join(DIST, 's/[token]'), { recursive: true, force: true })
fs.rmSync(path.join(DIST, 's/[token].html'), { force: true })

console.log(`  ${renamed} link route(s) renamed`)
