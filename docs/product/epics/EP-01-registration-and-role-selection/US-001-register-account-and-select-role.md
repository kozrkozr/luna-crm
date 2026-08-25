# US-001 — Register an account and select a professional role

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **new user**,
I want **to register an account, select my professional role (photographer, stylist, gaffer,
shoot manager, etc.), and optionally add a social-media/contact field**,
so that **the app and other users know how I participate in a shoot, and how to reach me
beyond the app**.
Logging back in afterward is a separate story (`US-013`).

## Context
This is the entry point for every other epic — a shoot creator, a crew member who
self-registers, and any future account all pass through this same registration
(`prd.md` R-01; `decisions/ADR-001-*.md`, `ADR-002-*.md`). The social-media field was added
from Ilona's second review round (`03-design/reviews/r02-2026-08-23/notes.md`).

## Acceptance criteria

### AC-1 — Successful registration with a role
- **Given** a new user on the registration screen
- **When** they submit valid registration info, select a role from the list, and optionally
  fill in a social-media/contact field
- **Then** their account is created with that role (and social field, if given), and they land
  on their (empty) shoot list

### AC-2 — Registration blocked without a role *(required)*
- **Given** a new user on the registration screen
- **When** they try to submit without selecting a role
- **Then** submission is blocked, an inline message asks them to pick a role, and no account
  is created

## Out of scope
- The list of available roles beyond what's already named (photographer, stylist, gaffer,
  makeup artist, shoot manager) — not enumerated in `prd.md`; use the glossary's confirmed
  roles as the starting list.
- Logging back in after registration — separate story (`US-013`).
- Password reset, social login, or other auth mechanics — not specified; 04-tech territory.

## Dependencies
None.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
