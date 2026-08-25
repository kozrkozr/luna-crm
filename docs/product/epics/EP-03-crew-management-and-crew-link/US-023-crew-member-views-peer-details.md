# US-023 — Crew member views another crew member's details

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **crew member**,
I want **to click on another crew member from the shoot's crew list and see their details —
the same form the shoot creator used to add them**,
so that **I know who I'm working with without having to ask the photographer**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`). The field list was resolved in the second
review round (`03-design/reviews/r02-2026-08-23/notes.md`): every field, including notes.
The Client gets a related but narrower view — `US-026`, same fields minus notes — not this
story's exact screen.

## Acceptance criteria

### AC-1 — Clicking a crew member shows their complete details
- **Given** a crew member viewing a shoot via their link (`US-007`)
- **When** they click on another person in the crew list
- **Then** they see that person's details in the same layout the creator used to add them
  (`US-005`) — name, role, contact, Instagram, and notes, with nothing held back

### AC-2 — The Client's view of the same person differs *(required)*
- **Given** a client viewing the same shoot via their own link (`US-010`)
- **When** they view a crew member's details
- **Then** they see `US-026`'s narrower version (no notes) — not this story's full version;
  the two views are deliberately not the same

## Out of scope
- Editing another crew member's details from here — view-only, same as `US-016` for your own
  profile.

## Dependencies
US-007 — this is reached from the crew link view. US-005 — there must be more than one crew
member for this to apply.

## Open questions
None. Field list resolved: every field, including notes.
