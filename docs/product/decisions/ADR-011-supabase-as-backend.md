# ADR-011 — Supabase as the backend

- **Date:** 2026-08-25
- **Status:** accepted (phase-04 gate, 2026-08-25)
- **Phase:** 04-tech
- **Deciders:** agent (proposed); owner accepted at the phase-04 gate, 2026-08-25

## Context
v1 needs auth, a relational store, media storage, and one piece of server-side logic (the link
gateway, `ADR-013`). The builder is one person part-time (`prd.md`, Constraints), the price point
is $5/month, and `ADR-010` already fixed the client as React Native. The owner has stated no
backend, hosting, or database preference — nothing in the sources constrains this choice.

## Options considered
### Option A — Supabase (chosen)
- **Pros:** Postgres (the data model is plainly relational — see `data-model.md`); auth,
  storage, row-level security and Edge Functions in one $25/mo bill; RLS on `Shoot.creator_id`
  is close to a one-line expression of the app's whole permission rule; SQL means no lock-in on
  the data itself
- **Cons:** $25/mo from day one, since the Free tier pauses idle projects and cannot serve a
  link opened weeks later (`architecture.md`); RLS is easy to get subtly wrong; one vendor for
  four concerns

### Option B — Firebase
- **Pros:** most mature mobile BaaS; generous free tier that does not sleep
- **Cons:** document store against a model with five clearly-related entities and audience-
  scoped field visibility; security rules are harder to reason about than SQL + RLS for exactly
  the crew/client field split `US-023`/`US-026` needs; egress-priced and historically the source
  of surprise bills

### Option C — Custom backend (Node/Postgres on a VPS)
- **Pros:** total control; cheapest at scale
- **Cons:** the one-person builder now also owns auth, migrations, backups, TLS, and uptime for
  a product whose whole value is a link working on the day of a shoot. Wrong trade at this size

### Option D — Defer the choice
- **Pros:** no premature commitment
- **Cons:** it blocks the schema, the gateway, and every effort estimate. Deferring is what the
  spikes are for, not the platform

## Decision
Option A — Supabase. The deciding reason: the app's entire permission model is "a creator sees
their own shoots, everyone else arrives by token," and Postgres RLS plus one Edge Function
expresses that directly, in SQL the owner can read.

## Consequences
- **Accepted cost:** $25/mo before the first subscriber, and Free is genuinely unusable here —
  not a tier to fall back on.
- **Now easier:** auth, storage, and signed URLs arrive with the database; `US-009`'s
  cross-shoot schedule is one query (`data-model.md`).
- **Now harder:** moving off means re-homing auth and storage, not just the data. The Postgres
  schema itself would port cleanly; the surrounding services would not. **Reversal cost: weeks,
  not days** — but only auth/storage, since SQL data is portable.
- **Revisit when:** egress overage stops being trivial (`risks.md` R-4), or if SMS auth (R-6)
  forces a second provider anyway.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | Who pays the $34.35/mo floor before subscriber #7? | Whether the build starts before any revenue exists — `04-tech/open-questions.md` #2 |
