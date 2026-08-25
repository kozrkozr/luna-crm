# US-018 — Edit a shoot's date and location

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to edit a shoot's date and location, with location as its own section (address plus
notes — directions, an image, or a video)**,
so that **I can fix or fill in details after creating the shoot, without having to enter
everything at once**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`): location was removed from creation (`US-002`)
specifically so it could be edited here, with more room for detail — the address plus free-form
notes that could be text (e.g. «як дібратись» [how to get there]), an image, or a video.

## Acceptance criteria

### AC-1 — Date and location can be changed after creation
- **Given** an existing shoot
- **When** the creator opens edit, changes the date and/or the location's address, and saves
- **Then** the shoot reflects the new date and location everywhere it's shown (creator's view,
  crew link view, client link view)

### AC-2 — Location notes accept more than plain text
- **Given** the location section of the edit form
- **When** the creator adds a note and optionally attaches one image or one video to it
- **Then** the note (and its attachment, if any) is saved and shown wherever the location is
  displayed

### AC-3 — Save blocked when the date is cleared *(required)*
- **Given** the edit form
- **When** the creator clears the date entirely and tries to save
- **Then** save is blocked — a shoot always needs a date, the same rule as creation (`US-002`)

## Out of scope
- Editing client contact info — not mentioned in the review; only date and location were
  named. If that's also needed, it's a new ask, not assumed here.
- More than one image or video per location note — not specified; one of each is the minimum
  that satisfies "directions text, or a video, or images."
- Any versioning/history of location changes — not requested.

## Dependencies
US-002 — a shoot must exist before it can be edited.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
