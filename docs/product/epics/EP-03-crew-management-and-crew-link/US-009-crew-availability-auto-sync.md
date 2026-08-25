# US-009 — Self-registered crew member's availability syncs across shoots

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **crew member who has self-registered**,
I want **my availability to sync automatically across every shoot I'm added to**,
so that **I have one view of my own commitments, even across different photographers**.

## Context
This is a "should," not a "must" (`prd.md` R-08) — it's the groundwork for the deferred crew
directory (`decisions/ADR-003-*.md`) without building the directory itself.

## Acceptance criteria

### AC-1 — Two shoots from different creators appear together
- **Given** a self-registered crew member added to two different shoots by two different shoot
  creators
- **When** they open their own schedule
- **Then** both shoots appear together in one view

### AC-2 — Unregistered crew member has no personal schedule *(required)*
- **Given** a crew member who was only added manually and never self-registered
- **When** checking whether they have a personal schedule view
- **Then** no such view exists for them — only the individual shoot pages a shoot creator
  shares with them (US-007)

## Out of scope
- Any UI for browsing or searching other photographers' availability — that's the deferred
  crew directory, not this story.
- Editing availability directly (e.g., marking oneself unavailable on a date) — not requested;
  this story only syncs what shoots already exist.

## Dependencies
US-001 (self-registration) and US-005 (having been added to more than one shoot).

## Open questions
None. Matching is resolved (email or phone, `02-product/open-questions.md` item 8), and
`US-005` (this folder) now requires phone or email so this resolves cleanly.
