# US-002 — Create a shoot with client info and date

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to create a shoot with the client's contact info and date**,
so that **I have one record instead of scattered chats to keep track of**.

## Context
This is the foundational record every other epic attaches to — references (US-003), crew
(US-005), and the client view (US-010) all belong to a shoot created here (`prd.md` R-02).
Location is no longer collected here — it moved to `US-018` (edit), per Ilona's review of the
phase-03 prototype (`03-design/reviews/r01-2026-08-23/notes.md`): the creation form should
stay minimal, and location gets its own richer section (address + notes) when editing.

## Acceptance criteria

### AC-1 — Shoot created with required info
- **Given** a logged-in shoot creator
- **When** they fill in client contact info and date, and save
- **Then** a new shoot appears in their shoot list with that info and a default status of
  "New" (`US-020`)

### AC-2 — Save blocked when a required field is missing *(required)*
- **Given** a shoot creator filling in the creation form
- **When** a required field (e.g., date) is left empty and they try to save
- **Then** save is blocked, the missing field is indicated, and no shoot is created

## Out of scope
- Location — moved to `US-018` (edit a shoot).
- Editing or deleting a shoot after creation — separate stories (`US-018`, `US-019`).
- Attaching references, crew, or files — separate stories (US-003, US-005).

## Dependencies
US-001 — the creator must be a registered user.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
