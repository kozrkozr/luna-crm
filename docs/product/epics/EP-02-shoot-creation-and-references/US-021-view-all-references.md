# US-021 — View all references on a dedicated page

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator, crew member, or client**,
I want **to see a limited number of references on the shoot's own page, with a way to see all
of them on a dedicated page**,
so that **the shoot page doesn't get overloaded when there are many references**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`): keep the current references section on the
shoot page, but show only as many as fit by default, with a "show all / go to all" link to a
separate page. Applies wherever references are shown — the creator's shoot detail (`US-003`),
the crew link view (`US-007`), and the client link view (`US-010`).

## Acceptance criteria

### AC-1 — Overflow references are reachable via a dedicated page
- **Given** a shoot with more references than fit on its main page
- **When** anyone viewing that shoot (creator, crew, or client) opens the "show all
  references" link
- **Then** they see every reference on the shoot on its own page

### AC-2 — Fewer references than the limit shows no link *(required)*
- **Given** a shoot with fewer references than the display limit
- **When** anyone views that shoot's page
- **Then** all its references are already shown inline, and no "show all" link appears

## Out of scope
- The exact number that "fits by default" — not specified; a reasonable fixed number (e.g. 4)
  is assumed until told otherwise.
- Any reordering, filtering, or search within the all-references page — just a full list.

## Dependencies
US-003 — references must exist to overflow.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
