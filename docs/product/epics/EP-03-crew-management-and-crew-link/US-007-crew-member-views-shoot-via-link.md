# US-007 — Crew member views their shoot via their link

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **crew member**,
I want **to open my link and see the shoot's date, location, all of its references, and who
else is on the crew**,
so that **I have one consistent source instead of asking the photographer directly, including
mid-shoot**.

## Context
Answers the exact pain quoted in `01-discovery/personas.md`: a crew member messaging the
photographer mid-shoot asking how to find the studio (`prd.md` R-06).

## Acceptance criteria

### AC-1 — Shoot info shown via a valid link
- **Given** a valid crew link
- **When** the crew member opens it
- **Then** they see the shoot's date, location, references on the shoot up to the display
  limit (with a link to see all, `US-021`), and the rest of the crew list — each crew member
  now clickable through to their own details (`US-023`)

### AC-2 — Invalid or expired link shows no shoot data *(required)*
- **Given** an invalid or expired link
- **When** someone opens it
- **Then** a clear "this link is no longer valid" state is shown, not shoot data or a generic
  error

## Out of scope
- Confirming or declining the booking — separate story (US-008).
- Editing anything — this view is read-only by definition.
- Viewing another crew member's full details inline here — that's its own screen, `US-023`.

## Dependencies
US-006 — a link must exist before it can be opened.

## Open questions
None.
