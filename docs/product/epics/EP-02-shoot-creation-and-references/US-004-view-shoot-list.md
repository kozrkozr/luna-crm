# US-004 — View all shoots in a list and calendar

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to see all my shoots in a list, with a calendar below the "new shoot" action**,
so that **I don't have to search across chats to find an upcoming shoot**.

## Context
This is the shoot creator's home view — the single record replacing the scattered-tools
workflow described in `01-discovery/personas.md` (`prd.md` R-09). Ilona's review of the
phase-03 prototype confirmed a calendar is needed, not just a list
(`03-design/reviews/r01-2026-08-23/notes.md`) — the prototype had only a list.

## Acceptance criteria

### AC-1 — Shoots listed by date, with a calendar showing shoot dates
- **Given** a shoot creator with several shoots
- **When** they open their shoot list
- **Then** all their shoots are shown ordered by date, and a calendar below the "new shoot"
  button marks the dates that have a shoot

### AC-2 — Empty state, not an error *(required)*
- **Given** a shoot creator with no shoots yet
- **When** they open their shoot list
- **Then** an empty state is shown for the list, and the calendar shows no marked dates —
  neither is an error or a blank screen

## Out of scope
- Filtering or searching the list — not requested in `prd.md`.
- Exactly what happens when a calendar date is tapped (e.g. jump to that day's shoot, or
  nothing) — not specified in the review; see `02-product/open-questions.md`.
- Month navigation, multi-month view, or any calendar behavior beyond marking shoot dates on
  the current view — not specified; keep it simple until asked for more.

## Dependencies
US-002 — shoots must exist to be listed.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
