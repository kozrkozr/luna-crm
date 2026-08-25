# ADR-002 — Narrow v1 to photographers, not the whole shoot/beauty industry

- **Date:** 2026-08-22
- **Status:** accepted
- **Phase:** 00-intake
- **Deciders:** owner

## Context
Everything described — a shoot record with client, references, team, and files — applies just
as well to a makeup artist or stylist who books their own work. The owner noticed this herself
mid-call: «чому я так виділила саме фотографів, якщо, в принципі, це ж так само можна і для
візажистів зробити» [why did I single out photographers, if in principle this could work for
makeup artists too] (`00-intake/s01-2026-08-20/transcript.md`, line 77). She also explicitly
excluded the broader beauty industry (e.g. manicure) as out of scope (`s01`, lines 163–165).

## Options considered
### Option A — Build for the whole shoot/beauty ecosystem from day one
- **Pros:** larger addressable market immediately; no rework to open up later
- **Cons:** no validated persona for any role except the owner's own (photographer); spreads
  a one-person validation effort across many unproven user types at once

### Option B — Narrow v1 to photographers who organize their own shoots
- **Pros:** matches the one validated persona that exists; «давайте поки що узько
  спеціалізуємося на фотографів» [let's specialise narrowly on photographers for now] (`s01`,
  line 78) is the owner's own call; other roles (stylist, gaffer) still participate as invited
  crew, so the data model doesn't have to be rebuilt to open the product to them later
- **Cons:** anyone whose primary need is "I am a makeup artist who wants to run my own
  bookings" is explicitly not served by v1

### Option C — Narrow further, to Ilona alone (bespoke tool)
- **Pros:** removes the unvalidated-market risk entirely
- **Cons:** contradicts the owner's explicit intent to sell subscriptions to other
  photographers (`00-intake/s02-2026-08-22/questions.md`, item 14)

## Decision
Option B — photographers who organize their own shoots are the v1 target user; other shoot
roles remain supported only as invited crew, not as account holders with their own bookings.

## Consequences
- **Accepted cost:** makeup artists, stylists, and gaffers who want the same tool for their own
  bookings are turned away in v1.
- **Now easier:** one clear persona to design and validate against (see `personas.md`).
- **Now harder:** expanding to other professions later needs new registration flows and
  possibly new pricing, though not a new data model — a shoot's crew already stores arbitrary
  roles (`s01`, lines 173–178).
- **Revisit when:** if the photographer survey (`00-intake/photographer-survey-uk.md`) or early
  usage shows demand for full accounts from crew roles.

## Open questions
None — this is the owner's own stated decision, not open.
