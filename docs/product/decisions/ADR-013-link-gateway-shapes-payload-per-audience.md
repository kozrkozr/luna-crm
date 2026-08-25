# ADR-013 — A link gateway shapes the payload per audience, rather than RLS alone

- **Date:** 2026-08-25
- **Status:** accepted (phase-04 gate, 2026-08-25)
- **Phase:** 04-tech
- **Deciders:** agent (proposed); owner accepted at the phase-04 gate, 2026-08-25

## Context
`US-023` and `US-026` describe the same crew record seen by two audiences: a crew member sees
**every** field, "with nothing held back" including notes; a client sees
**the same fields minus notes**, and `US-026` AC-1 requires the notes field to be absent
entirely, "not even an empty one". Both audiences are unauthenticated, arriving with a token
(`data-model.md`, AccessLink). So one anonymous request must return strictly less than another
anonymous request, differing by one column.

## Options considered
### Option A — Edge Function gateway resolves the token and builds the response (chosen)
- **Pros:** the client's response never contains a notes value at any point — the field split is
  enforced where it cannot be inspected or bypassed; one place to also enforce link validity
  (`data-model.md`, Link validity) and issue short-lived signed URLs for media
- **Cons:** a hand-written server component to maintain and test; every link view depends on it

### Option B — Table-level RLS with the token supplied as a request parameter
- **Pros:** no server code; Postgres enforces everything
- **Cons:** RLS grants access to *rows*, not columns. The client's query would return the crew
  row including `note`, leaving the omission to the UI. That ships a crew member's private notes
  to the client's browser and relies on nobody opening dev tools. `US-026` AC-1 is a data
  requirement, not a layout one

### Option C — Two Postgres views (crew view, client view) plus RLS
- **Pros:** column control in SQL, no server code
- **Cons:** genuinely viable, and the closest runner-up. Rejected because the gateway is needed
  anyway — for signed media URLs and for distinguishing "revoked" from "never existed"
  (`US-007` AC-2) — so views would add a second mechanism without removing the first

## Decision
Option A. The deciding reason: `US-026`'s "no notes field at all" is a statement about the
payload, and only server-side shaping makes it true of the payload rather than of the screen.

## Consequences
- **Accepted cost:** one bespoke server component in an otherwise BaaS-only architecture, and
  every anonymous read depends on it being correct.
- **Now easier:** link validity, audience shaping, and signed media URLs all live in one
  auditable place; adding a third audience later is a branch, not a new mechanism.
- **Now harder:** the gateway is on the critical path for both link flows — if it is down, crew
  and clients see nothing, while the app keeps working. **Reversal cost: low** (Option C remains
  available), but it would need re-solving signed URLs and the revoked/unknown distinction.
- **Revisit when:** the gateway's logic grows past shaping and validity into general business
  rules — at that point it is an API, and should be named one.

## Open questions
None. The field lists for both audiences were confirmed by the owner in review round r02
(`02-product/open-questions.md`, item 11).
