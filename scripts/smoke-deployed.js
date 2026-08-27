#!/usr/bin/env node
/**
 * Check a DEPLOYED environment, from the outside.
 *
 * The acceptance suites run against local Supabase, and there is a class of bug
 * they structurally cannot see. The local edge runtime answers CORS preflights
 * itself and never invokes the function's OPTIONS branch; the deployed one runs
 * it. So `json({}, 204)` — a 204 carrying a body, which HTTP forbids — passed
 * every local test, answered 500 in production, and made every valid link
 * render as «Це посилання більше не діє» in a browser while `curl` resolved the
 * same links perfectly, because curl sends no preflight.
 *
 * Anything that only breaks once the pieces are on real hosts belongs here.
 *
 *     node scripts/smoke-deployed.js https://<site>.pages.dev https://<ref>.supabase.co <publishable-key>
 *
 * Read-only: it creates nothing and needs no account.
 */
const [SITE, SUPABASE, KEY] = process.argv.slice(2)
if (!SITE || !SUPABASE || !KEY) {
  console.error('usage: node scripts/smoke-deployed.js <site-url> <supabase-url> <publishable-key>')
  process.exit(2)
}

let failed = 0
const ok = (label, condition, extra = '') => {
  if (!condition) failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)
}

const gateway = `${SUPABASE.replace(/\/+$/, '')}/functions/v1/link-gateway`

const main = async () => {
  // 1. The link routes must be REWRITTEN, not redirected. Cloudflare Pages
  //    cannot serve the bracket filenames the export produces, and the failure
  //    is a redirect loop rather than a 404 — see scripts/prepare-link-surface.js.
  for (const path of ['/s/smoke-token', '/s/smoke-token/references', '/s/smoke-token/crew/x']) {
    const res = await fetch(`${SITE}${path}`, { redirect: 'manual' })
    ok(`${path} is served, not redirected`, res.status === 200, `status ${res.status}${res.headers.get('location') ? ' -> ' + res.headers.get('location') : ''}`)
  }

  // 2. S-2 F-2 — the prerendered HTML must never accuse a link of being dead
  //    before the token has been resolved.
  const html = await (await fetch(`${SITE}/s/smoke-token`)).text()
  ok('the served HTML carries no dead-link copy', !html.includes('більше не діє'))

  // 3. The CORS preflight. A browser makes the real request only if this
  //    succeeds, so a broken preflight looks exactly like every link being dead.
  const pre = await fetch(gateway, {
    method: 'OPTIONS',
    headers: {
      origin: SITE,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'apikey,authorization',
    },
  })
  ok('the CORS preflight succeeds', pre.status >= 200 && pre.status < 300, `status ${pre.status}`)
  ok('the preflight sends no body', (await pre.text()) === '', 'a 204 with a body answers 500 here')
  ok('the preflight allows apikey', (pre.headers.get('access-control-allow-headers') ?? '').includes('apikey'))
  ok('the preflight allows this origin', ['*', SITE].includes(pre.headers.get('access-control-allow-origin')),
     pre.headers.get('access-control-allow-origin') ?? 'none')

  // 4. The gateway itself refuses an unknown token in its own shape.
  const denied = await fetch(`${gateway}?token=smoke-token`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  })
  ok('the gateway refuses an unknown token', denied.status === 404, `status ${denied.status}`)
  ok('and refuses it in its own shape', JSON.stringify(await denied.json()) === '{"ok":false}')

  // 5. anon must reach no table directly (ADR-013 — every read goes through the gateway).
  const direct = await fetch(`${SUPABASE.replace(/\/+$/, '')}/rest/v1/shoots?select=id&limit=1`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}` },
  })
  ok('anon cannot read shoots directly', direct.status >= 400, `status ${direct.status}`)

  console.log(failed ? `\n  ${failed} failing` : '\n  all checks passed')
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('smoke check could not run:', error.message)
  process.exit(1)
})
