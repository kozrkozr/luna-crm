# US-010 — Client views their shoot via a link

- **Parent epic:** [EP-04 — Client view](EP-04.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **client**,
I want **to open a link and view read-only info about my shoot**,
so that **I know what to expect without contacting the photographer directly**.

## Context
Read-only by design — the client cannot edit anything (`prd.md` R-11; `decisions/ADR-006-*.md`
scoped the client to viewing and reacting, not editing).

## Acceptance criteria

### AC-1 — Shoot info shown via a valid client link
- **Given** a valid client link
- **When** the client opens it
- **Then** they see the shoot's date, location, team (each person clickable through to their
  details minus notes, `US-026`), and references up to the display limit (with a link to see
  all, `US-021`, view-only — no reactions, see `US-011`), with no edit controls anywhere

### AC-2 — Invalid or expired link shows no shoot data *(required)*
- **Given** an invalid or expired client link
- **When** it's opened
- **Then** a clear "this link is no longer valid" state is shown, not shoot data

## Out of scope
- Confirming attendance — considered, not confirmed for v1 (`prd.md`, Users).
- Liking/disliking references — removed after trial (`US-011`, retired; `decisions/ADR-009-*.md`).
- Seeing a crew member's notes — that's `US-023`, crew-only.

## Dependencies
US-002 — a shoot must exist for a client link to point to.

## Open questions
None. Resolved: no time-based expiry — a client link only stops working if the shoot itself
is removed (owner's answer in chat, 2026-08-22).
