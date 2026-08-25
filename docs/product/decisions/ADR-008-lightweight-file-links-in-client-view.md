# ADR-008 — Placeholder/link-only file sections in the Client view, not file hosting

- **Date:** 2026-08-23
- **Status:** accepted
- **Phase:** 02-product (amendment, from a 03-design prototype review)
- **Deciders:** owner

## Context
`decisions/ADR-005-*.md` deferred file delivery (raw files, finished photos) entirely, so v1
could ship the crew/call-sheet half first. Reviewing the phase-03 prototype, Ilona asked for
raw-files and finished-photos sections on the Client view anyway — but explicitly offered the
lightest possible version: a placeholder ("in development"), or the ability to paste in an
external link (e.g. to a file-sharing service she already uses), rather than building actual
file upload/storage in the app (`03-design/reviews/r01-2026-08-23/notes.md`).

## Options considered
### Option A — Leave file delivery fully deferred, as ADR-005 decided
- **Pros:** no scope creep on an already-deferred feature; simplest
- **Cons:** contradicts the owner's direct request during review; the Client view would show
  nothing where she wants something, even if only a placeholder

### Option B — Build real file hosting now (undo ADR-005 entirely)
- **Pros:** fully closes the gap between "one record" and the client's actual delivery need
- **Cons:** exactly the scope ADR-005 was written to avoid for v1; no upload/storage
  infrastructure has been designed; far more than what the owner actually asked for here

### Option C — Placeholder, or a pasted external link — no file hosting
- **Pros:** matches exactly what the owner asked for; a link field is no more work than a
  reference link (`US-003` already does this); keeps ADR-005's actual deferral (real hosting)
  intact
- **Cons:** the client's files still live on a third-party service, not in the product — the
  "one record instead of five tools" premise doesn't fully apply to file delivery yet

## Decision
Option C. `US-024` (raw files) and `US-025` (finished photos) add a Client-facing section that
is either an "in development" placeholder or a pasted external link — never actual file
upload, storage, or hosting. This **amends** `ADR-005` rather than reversing it: the
underlying decision (no file hosting in v1) still stands; only a lightweight, link-based
surface for it was added.

## Consequences
- **Accepted cost:** the client-facing "one record" story is still incomplete for files — she's
  told where to look, but the actual files live wherever the creator's external link points.
- **Now easier:** the Client view answers "where are my photos" instead of having no section at
  all, at effectively the cost of a text field.
- **Now harder:** nothing structural — a real upload/hosting feature later would replace the
  link field, not restructure around its absence.
- **Revisit when:** file hosting is undeferred for real (per `ADR-005`'s own "revisit when").

## Open questions
None — this is the owner's own stated request.
