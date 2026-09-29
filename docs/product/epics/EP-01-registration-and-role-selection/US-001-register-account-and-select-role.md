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

### AC-1 — Successful registration with a role *(amended 2026-09-29, `ADR-019`)*
- **Given** a new user on the registration screen
- **When** they submit valid registration info, select a role from the list, and optionally
  fill in a social-media/contact field
- **Then** their account is created with that role (and social field, if given), a
  confirmation email is sent to the address they gave, and they see a screen telling them to
  check their mail, naming that address, with a way to send the email again
- **And when** they open the link in that email
- **Then** their email is confirmed and they land on their (empty) shoot list

*Until 2026-09-29 this criterion ended at "they land on their (empty) shoot list", with no
confirmation step. `ADR-019` added the step so that an unconfirmed address cannot claim someone
else's crew rows.*

### AC-2 — Registration blocked without a role *(required)*
- **Given** a new user on the registration screen
- **When** they try to submit without selecting a role
- **Then** submission is blocked, an inline message asks them to pick a role, and no account
  is created

### AC-3 — Logging in before confirming *(added 2026-09-29, `ADR-019`)*
- **Given** a registered user who has not opened the confirmation link
- **When** they try to log in with the correct email and password
- **Then** they are not signed in; a message says the email is not confirmed yet, and offers to
  send the confirmation email again

### AC-4 — An invalid or expired confirmation link *(added 2026-09-29, `ADR-019`)*
- **Given** a confirmation link that is expired or has already been used
- **When** the user opens it
- **Then** they are told the link is invalid or expired and are sent to log in, from where
  AC-3 lets them request a new one

## Out of scope
- The list of available roles beyond what's already named (photographer, stylist, gaffer,
  makeup artist, shoot manager) — not enumerated in `prd.md`; use the glossary's confirmed
  roles as the starting list.
- Logging back in after registration — separate story (`US-013`).
- Password reset, social login, or other auth mechanics — not specified; 04-tech territory.
- The wording of the new screens — approved in chat, recorded in
  `02-product/reviews/r06-2026-09-29/notes.md` rather than in the criteria.

## Dependencies
None.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
