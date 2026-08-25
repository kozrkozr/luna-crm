# ADR-006 — Client reacts to references; does not propose them

- **Date:** 2026-08-22
- **Status:** accepted — the "reacts to references" half is **superseded by `ADR-009-*.md`**
  (2026-08-23), which removes client reactions entirely after a second prototype review. The
  "does not propose them" half still stands, though it's now largely moot since the client
  doesn't interact with references at all beyond viewing.
- **Phase:** 02-product
- **Deciders:** owner

## Context
Client v1 access was already settled as read-only viewing of shoot info (`02-product/prd.md`
R-11). The owner then asked whether to extend it: should the client be able to like/dislike
references the shoot creator proposed, or go further and let the client propose their own
references too?

## Options considered
### Option A — Client can like/dislike proposed references only
- **Pros:** one new action on an existing read-only view; references still come from a single
  source (the shoot creator), so there's no new "who approves a client-submitted reference"
  workflow to design
- **Cons:** does not give the client a way to introduce a reference the photographer hasn't
  already thought of

### Option B — Client can also propose their own references
- **Pros:** closer to a two-way conversation about the shoot's look, which is closer to how
  reference-gathering actually happens today informally
- **Cons:** adds a second reference-submission path, a notification/review step for the shoot
  creator, and a decision about whether client-submitted references need approval before crew
  see them — meaningfully more scope for a v1 that is supposed to stay small
  (`01-discovery/challenge.md` already flags scope creep risk)

### Option C — Keep references read-only for the client, no reaction at all
- **Pros:** simplest; matches the original, narrower "view info" answer
- **Cons:** the owner explicitly asked for reactions to be added — this option contradicts
  that request rather than scoping it

## Decision
Option A — the client can like/dislike references the shoot creator proposed
(`02-product/prd.md` R-12). The client does not propose their own references in v1.

## Consequences
- **Accepted cost:** a client who wants to suggest a look the photographer hasn't proposed
  still has to do that outside the app, as today.
- **Now easier:** the reference model stays single-source (shoot creator only), so no
  approval/review workflow has to be designed before v1 ships.
- **Now harder:** nothing structural — a reaction (like/dislike) is additive to the existing
  reference list and doesn't require a data-model change if client-submitted references are
  added later.
- **Revisit when:** client feedback on the like/dislike flow suggests they want to contribute
  references directly, not just react to what's proposed.

## Open questions
None — this is the owner's own stated decision.
