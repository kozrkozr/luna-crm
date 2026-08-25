# ADR-012 — Cloudflare Pages for the public link surface

- **Date:** 2026-08-25
- **Status:** accepted (phase-04 gate, 2026-08-25)
- **Phase:** 04-tech
- **Deciders:** agent (proposed); owner accepted at the phase-04 gate, 2026-08-25

## Context
Two of three flows belong to people with no account and no install (`flows.md` Flow 2, Flow 3),
so the crew and client views must be plain URLs served to a mobile browser. That surface needs
static hosting. The product is a paid subscription at $5/month (`prd.md`, Constraints) — which
turns out to decide this, because the obvious default is not licensed for it.

## Options considered
### Option A — Cloudflare Pages (chosen)
- **Pros:** free tier **explicitly permits commercial use**; unlimited bandwidth; 500 builds/mo,
  far past what one person ships; custom domain included
- **Cons:** build minutes and Workers limits are the caps to watch; a different vendor from the
  backend (`ADR-011`), so two dashboards

### Option B — Vercel
- **Pros:** best-known DX for React; strong preview deployments
- **Cons:** **Hobby forbids commercial use** — a paid product violates the terms from the first
  subscriber, so the real price is Pro at $20/mo. That is a 58% increase on the $34.35/mo floor
  for no functional gain

### Option C — Serve the link views from Supabase itself
- **Pros:** one vendor
- **Cons:** Supabase is not a static host; it would mean rendering HTML from an Edge Function —
  more code, worse caching, and egress billed against the same 250 GB quota the media already
  draws on

## Decision
Option A — Cloudflare Pages. The deciding reason is licensing, not performance: it is the option
whose free tier a paid product may legally use. $0 versus $20/mo for identical function.

## Consequences
- **Accepted cost:** two vendors instead of one; Cloudflare's build pipeline is less familiar
  than Vercel's.
- **Now easier:** the link surface stays a genuine $0 line item at any traffic level, so growth
  in crew/client link opens — the volume the product is designed to create — never raises
  hosting cost.
- **Now harder:** nothing structural. Static hosting is the most portable component here;
  reversal is a DNS change and a build config. **Reversal cost: hours.**
- **Revisit when:** the link views stop being static — e.g. server-side rendering per token
  becomes necessary for performance.

## Open questions
None.
