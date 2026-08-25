# ADR-003 — Manual crew entry first, not a searchable crew marketplace

- **Date:** 2026-08-22
- **Status:** accepted
- **Phase:** 00-intake
- **Deciders:** owner

## Context
A searchable directory of crew with visible availability was on the table (`crew directory`,
`00-intake/s02-2026-08-22/transcript.md`, line 345), but it is a two-sided marketplace with a
cold-start problem: at launch there are no registered gaffers, stylists, or makeup artists to
search. The owner named the fallback herself: «на початку у вас, типу, їх не буде, тому ви
будете їх просто вручну додавати» [at the start you won't have them, so you'll just add them
manually] (`00-intake/s01-2026-08-20/transcript.md`, line 172; reaffirmed `s02`, line 361).

## Options considered
### Option A — Build the searchable directory with availability at launch
- **Pros:** the "find a gaffer" workflow the owner originally envisioned (`s01`, lines
  150–161) works immediately
- **Cons:** empty at launch — a directory with nothing in it doesn't help anyone; validating a
  marketplace and a coordination tool at the same time doubles the unproven assumptions in v1

### Option B — Manual entry (name, Instagram/phone) with optional self-registration later
- **Pros:** works from day one with zero existing users; a crew member who is manually added
  to a shoot can later self-register and their availability starts auto-syncing across shoots
  without re-entering anything (`s02`, lines 361–385); matches how the owner already works
  today
- **Cons:** no "browse and discover new crew" workflow in v1 — a photographer still has to
  already know who they want to book

### Option C — Defer any crew-directory feature entirely, including manual entry
- **Pros:** simplest possible v1
- **Cons:** contradicts the client-facing requirement that a shoot lists its team with contact
  info (`00-intake/s02-2026-08-22/questions.md`, item 6) — some record of the crew has to exist

## Decision
Option B — manual entry is the v1 mechanism; the searchable/availability directory is deferred
until enough people have self-registered for it to return useful results.

## Consequences
- **Accepted cost:** no discovery of new crew through the app in v1 — only people the
  photographer already knows.
- **Now easier:** v1 has no cold-start problem to solve before it can ship.
- **Now harder:** nothing structural — manually-added crew records and self-registered
  accounts already need to reconcile into the same person (`s02`, lines 361–385), so the
  directory can be layered on later without a data migration.
- **Revisit when:** enough shoots have run that a meaningful fraction of crew are
  self-registered — see the market-validation open question in `open-questions.md`.

## Open questions
None — this is the owner's own stated decision, not open.
