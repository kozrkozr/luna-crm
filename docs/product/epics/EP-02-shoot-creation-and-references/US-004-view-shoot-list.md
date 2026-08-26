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

### AC-3 — Moving between months
*Added 2026-08-26 (review `r04`). Previously excluded; the owner asked for it after using the
built story.*

- **Given** the shoot list
- **When** the creator moves the calendar to the previous or next month
- **Then** that month is shown, marking the dates in it that have a shoot

Without this the calendar only ever showed the current month, so a shoot booked for any other
month marked nothing — which for someone booking weeks ahead is most shoots.

### AC-4 — Tapping a date filters the list
*Added 2026-08-26 (review `r04`). This answers `02-product/open-questions.md` #12.*

- **Given** the shoot list
- **When** the creator taps a date on the calendar
- **Then** the list below shows only the shoots on that date, and the date being filtered to is
  stated
- **And** a control is offered to return to the full list

- **Given** a date with no shoots
- **When** the creator taps it
- **Then** the list is empty for that date, and says so — this is a result, not the
  no-shoots-at-all empty state of AC-2, and not an error

Every date is tappable, including unmarked ones (owner's decision, 2026-08-26). The filter is
cleared by a visible control rather than only by tapping the date again, so that the way back is
never something the reader has to discover.

## Out of scope
- Searching the list, or filtering it by anything other than a calendar date — not requested
  in `prd.md`.
- Multi-month view — one month at a time; `AC-3` covers moving between them.

## Dependencies
US-002 — shoots must exist to be listed.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
