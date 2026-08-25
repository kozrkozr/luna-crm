# ADR-007 — Single-form shoot creation, not a multi-step wizard

- **Date:** 2026-08-22
- **Status:** accepted (2026-08-25)
- **Phase:** 03-design
- **Deciders:** agent (proposed); owner confirmed 2026-08-25 — the prototype shipped a single
  form and was reviewed twice without objection; review round r01 removed a field from it,
  moving further toward simplicity, not away

## Context
`prd.md` R-02 / `US-002` specify the fields a new shoot needs (client contact info, date,
location) but not how they're collected. Two plausible UI patterns exist for this, and the
prototype (`03-design/prototype/index.html`) had to pick one to be buildable at all.

## Options considered
### Option A — Single form, all fields on one screen
- **Pros:** matches the small field count (4 fields); one save action; fastest for someone who
  already has all the info in front of them, which is the Solo Shoot Owner's own description
  of her workflow (`01-discovery/personas.md`)
- **Cons:** doesn't scale gracefully if more fields get added later (e.g., if file delivery,
  currently deferred, brings its own setup step)

### Option B — Multi-step wizard (client info → date/location → done)
- **Pros:** easier to extend with more steps later; can validate each step in isolation
- **Cons:** more taps for a 4-field form; no evidence this is needed at the current scope

## Decision
Option A — single form. The field count doesn't justify a wizard, and the target user
(someone re-entering info she already has from a client conversation) benefits more from speed
than from step-by-step guidance.

## Consequences
- **Accepted cost:** if this epic grows more fields later (e.g. file-delivery setup, once
  undeferred), the form may need revisiting as a wizard then.
- **Now easier:** the prototype and eventually the real form stay simple to build and test.
- **Now harder:** nothing structural — a single form is easier to later split into steps than
  the reverse.
- **Revisit when:** `US-002`'s field count grows enough that one screen feels cluttered.

## Open questions
None.
