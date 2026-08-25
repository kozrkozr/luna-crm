# US-022 — Shoot creator removes a crew member

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to remove a crew member from a shoot**,
so that **I can correct a mistaken add, or take someone off a shoot that changed**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`). This closes a gap: `US-006` AC-2 already
described what happens to a removed person's link, but no story ever let the creator actually
remove someone.

## Acceptance criteria

### AC-1 — Removing takes the person off the shoot and kills their link
- **Given** a crew member on a shoot
- **When** the shoot creator removes them
- **Then** they no longer appear in the shoot's crew list, and their link stops working
  (`US-006` AC-2)

### AC-2 — Removal requires confirmation *(required)*
- **Given** the creator taps remove on a crew member
- **When** they have not yet confirmed
- **Then** nothing is removed — same rationale as deleting a shoot (`US-019`): an accidental
  tap must not silently cut someone out

## Out of scope
- Notifying the removed person that they were taken off the shoot — not requested; they simply
  find their link no longer works if they try it.
- Re-adding the same person — that's just `US-005` again, no special "undo" flow.

## Dependencies
US-005 — someone must be on the shoot before they can be removed.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
