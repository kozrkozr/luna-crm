# US-020 — Change a shoot's status (New / Finished)

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to mark a shoot as Finished once it's done, or back to New**,
so that **I can tell at a glance which shoots still need attention and which don't**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`). Every shoot defaults to "New" on creation
(`US-002`).

## Acceptance criteria

### AC-1 — Status can be changed
- **Given** an existing shoot with status "New"
- **When** the creator changes its status to "Finished"
- **Then** the shoot shows "Finished" wherever its status is displayed, and can be changed
  back to "New" the same way

### AC-2 — Only the two defined statuses are ever selectable *(required)*
- **Given** the status control on a shoot
- **When** the creator opens it
- **Then** New and Finished are the only two options — there is no way to reach any other
  status value, intentionally or by mistake

## Out of scope
- Any automatic behavior triggered by status (e.g. locking edits once "Finished", hiding
  finished shoots from the list) — not specified; the status is informational only in v1.
- More than two statuses — only New and Finished were named.

## Note
A new shoot defaults to "New" (see `US-002` AC-1) — that's this story's dependency, not its own
acceptance criterion.

## Dependencies
US-002 — a shoot must exist to have a status.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
