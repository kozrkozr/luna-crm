# ADR-009 — Remove client reactions to references

- **Date:** 2026-08-23
- **Status:** accepted — supersedes the "react" half of `ADR-006-*.md`
- **Phase:** 02-product (amendment, from a second 03-design prototype review)
- **Deciders:** owner

## Context
`decisions/ADR-006-*.md` gave the client a like/dislike reaction on each reference (`R-12`,
`US-011`), explicitly instead of letting the client propose their own. That was built into the
prototype and shown to Ilona twice. In the second round, the feedback was direct: remove the
like/dislike capability from the client page entirely
(`03-design/reviews/r02-2026-08-23/notes.md`) — no replacement requested, no reason given
beyond «видалити» [delete].

## Options considered
### Option A — Keep reactions as ADR-006 decided
- **Pros:** no rework; matches what was already built and reviewed once already
- **Cons:** contradicts the owner's direct, unambiguous instruction in the second review round

### Option B — Remove the reaction capability; client view becomes view-only again
- **Pros:** matches the feedback exactly; simplifies the client view back toward its original
  `US-010`-only shape
- **Cons:** loses whatever signal a like/dislike would have given the photographer about which
  references the client actually preferred — a capability that existed for one review round and
  is now gone, not deferred

### Option C — Replace reactions with something else (e.g. a comment field)
- **Pros:** could preserve *some* client feedback mechanism
- **Cons:** not requested; inventing a replacement the owner didn't ask for is exactly what
  the root `CLAUDE.md` rule 1 warns against

## Decision
Option B. `US-011` is retired. The client's reference view (`US-010`) goes back to purely
read-only — no reaction of any kind.

## Consequences
- **Accepted cost:** the photographer loses the one piece of passive client feedback the
  product briefly had (which references landed well).
- **Now easier:** the client view is simpler — one fewer interactive control, one fewer thing
  to explain to a first-time client.
- **Now harder:** nothing structural — reactions were additive to the reference list and their
  removal doesn't require a data-model change, only removing the UI and the story.
- **Revisit when:** the owner asks for client feedback on references again, in whatever form.

## Open questions
None — this is the owner's own stated decision.
