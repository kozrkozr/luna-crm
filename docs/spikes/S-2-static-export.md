# S-2 — Static export of a link view

- **Retires:** `risks.md` R-2 — "One codebase may not serve both the app and the link views"
- **Assumed effort:** 1–2 days (`risks.md`, Spikes)
- **Date:** 2026-08-25
- **Status:** **the codebase question is answered — yes. The host question needs one deploy.**

## What the spike was for
`architecture.md` assumes React Native Web exports the link views (Flow 2, Flow 3) as static web
from the same codebase. If that export fights Tamagui or Expo Router, the fallback is a second
small web app, duplicating the design system and every Ukrainian string — an assumed 2–3 weeks.

## What was built
The crew link view (`US-007`, `US-008`, `US-023`) at `app/s/[token].tsx`, reached at a plain
`/s/{token}` URL, Ukrainian-only with no language switcher (`EP-05`, Out of scope). Token
resolution is a local stand-in for the link gateway (`ADR-013`) — S-2 is about export and
hosting, not the gateway, which is S-3.

Verified in headless Chrome at an iPhone 390×844 viewport with an iOS Safari user agent, served
from static files through a server emulating Cloudflare Pages' routing.

## Findings

### F-1 — One codebase does serve both surfaces. R-2 does not materialise. *(the answer)*
`expo export -p web` produced a static site in which Tamagui **server-renders real markup** —
`dist/index.html` contains «Мої зйомки», «Вересень», the demo shoot rows, not an empty shell.
Both link-view states render correctly in a mobile browser from static files:

| URL | Result |
|---|---|
| `/s/demo-crew-token` | full crew view — date, location, "Ви: Ігор (демо)", 4 of 5 references with the "show all" link, crew list with response pills, confirm/decline buttons |
| `/s/nope-not-a-token` | «Це посилання більше не діє» — `US-007` AC-2's state, no shoot data |

No second web app is needed. **The 2–3 week fallback in R-2 is not being spent.**

### F-2 — A prerendered dynamic route flashed the invalid-link error on *valid* links *(found and fixed)*
This is the finding worth the spike's whole cost, and it would have shipped.

Static export prerenders `/s/[token]` **with no token**, so the first version of the screen —
which decided validity from a falsy token, the obvious way to write it — baked
«Це посилання більше не діє» into the HTML that the host then serves for *every* link. The
browser corrected itself on hydration, but the measured sequence at a valid token URL was:

```
@0ms    ⚠️ Це посилання більше не діє     <- prerendered, served to everyone
@100ms  full crew view                    <- after hydration
```

React also logged hydration mismatch #418. On a shoot morning on cellular, with ~490 KB of
gzipped JS to fetch first, that flash is not 100ms — it lasts as long as the download does, and
the crew member reads it as a dead link and messages the photographer. Which is the exact
behaviour the product exists to remove.

**Fixed** by making resolution a three-state machine — `resolving | invalid | ready` — that
never reports invalid until a resolution has actually been *attempted*, and renders a neutral
skeleton until then. After the fix:

```
@0ms    (chrome only, no error text)
@100ms  correct state for the token — content for valid, error for invalid
```

Hydration mismatch gone in both cases. The fix also matches production shape, where resolution
becomes an async gateway call rather than a local lookup.

**This is a rule for foundation, not just a patch:** on the link surface, an error state must be
driven by a resolution *result*, never by the absence of a param. Any route rendering a
soft-delete-derived "no longer valid" state (`ADR-014`) has this trap, which is `US-007` AC-2,
`US-010` AC-2, `US-026` AC-2, and `US-008` AC-2.

### F-3 — The token route needs host-level routing, and that part is not yet verified
Static export emits the dynamic route as a file literally named `s/[token].html`. A real token
URL is a 404 until the host rewrites to it. `generateStaticParams` cannot help — tokens are
unguessable and created at runtime, which is the point of them.

`public/_redirects` now carries `/s/* /s/[token].html 200` (a rewrite, keeping the URL so the
client router can read the token). It reproduced correctly against a local emulation of Pages'
behaviour, but **it has not been tested on a live Cloudflare Pages deployment**, and the bracket
characters in the target are the part most likely to need percent-encoding or a different form.

**A proven fallback exists if it resists.** `"output": "single"` (SPA) was exported and tested
the same way: one `index.html`, no rewrite config, Pages' automatic SPA fallback handles every
token path, and after hydration it renders identically. Its only cost is that nothing paints
until JS loads, where static paints the page chrome first. Both modes work; static is
recommended for the faster first paint, with `single` as the one-line escape hatch.

### F-4 — The export currently publishes the creator's app screens to the public web
`dist/` contains `index.html` (shoot list) and `shoot/[id].html` alongside the link views.
Cloudflare Pages is a public host with no auth, so the whole app's UI would be reachable there.
Not a data leak — real data sits behind Supabase Auth and RLS on `Shoot.creator_id` — but the
creator's app surface has no business being on the anonymous link host.

**Foundation must decide route-level export filtering:** the Pages build should emit the link
routes only. Worth settling early, because it shapes the route tree.

### F-5 — Payload baseline for a link view
| Asset | Raw | Gzipped |
|---|---|---|
| JS bundle | 1.92 MB | **0.49 MB** |
| Prerendered HTML | 164 KB | 22 KB |

Half a megabyte of JavaScript for a call-sheet page, before the Supabase client, the gateway
fetch, or a single image. Not alarming, but this is the number to watch: crew open these links on
cellular, and F-2 showed that slow JS has a *correctness* cost on this surface, not just a
patience cost. Record it as the baseline and re-measure at S-4.

## Recommendation
**Treat R-2 as retired for the codebase question** — one codebase serves both surfaces, proven
end-to-end in a mobile browser from static files.

**Keep one item open:** the first Cloudflare Pages deploy must confirm F-3's rewrite. That needs
a Cloudflare account, so it is the owner's step, not something this spike could finish. It is a
config detail with a tested fallback, not a risk to the architecture.

## What carries forward to foundation
- The three-state resolution rule (F-2). **This is the finding that matters.**
- `public/_redirects`, pending the F-3 verification.
- `app.json`'s web block (`bundler: metro`, `output: static`).
- A foundation task from F-4: restrict the web export to link routes.
- **Not** the screens or the fake token map — the real one is S-3's gateway.

## How to reproduce
```bash
cd spikes/s1-s2
npm install
npx expo export -p web        # -> dist/
npx serve dist                # any static server; /s/<token> needs the rewrite
```
