# US-024 — Client sees a raw-files section

- **Parent epic:** [EP-04 — Client view](EP-04.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **client**,
I want **to see a raw-files section on my shoot view**,
so that **I know that's where they'll show up, even before there's anything there**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`). This is **not** file hosting — actual file
delivery stays deferred (`decisions/ADR-005-*.md`, `ADR-008-*.md`). The section is a
placeholder until the shoot creator optionally pastes in an external link (e.g. to a
file-sharing service the creator already uses).

## Acceptance criteria

### AC-1 — Placeholder shown when no link is set
- **Given** a shoot where the creator hasn't added a raw-files link
- **When** the client views the shoot
- **Then** the raw-files section shows an "in development" placeholder, not an empty or
  missing section

### AC-2 — External link shown when the creator adds one
- **Given** a shoot where the creator has pasted an external link for raw files
- **When** the client views the shoot
- **Then** the raw-files section shows that link instead of the placeholder


### AC-3 — A link that does not work is not silently presented as one *(required)*
- **Given** the shoot creator has pasted a raw-files link that is malformed or unreachable
- **When** the client views the section
- **Then** it is rejected the same way a reference link is (`US-003` AC-2) — the client is not
  shown a dead link dressed up as a working one, and the section falls back to its placeholder

## Out of scope
- Uploading, storing, or previewing actual files in the app — deferred
  (`decisions/ADR-005-*.md`, `ADR-008-*.md`); this story is a placeholder/link only.
- Deep validation that the pasted link points at real files — only the same surface check a
  reference link gets (`US-003`), now stated as AC-3 rather than left implicit.

## Dependencies
US-002 — a shoot must exist to have this section.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
