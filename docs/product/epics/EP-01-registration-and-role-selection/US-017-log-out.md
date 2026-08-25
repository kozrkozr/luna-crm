# US-017 — Log out

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **registered user**,
I want **to log out of my account**,
so that **I can end my session — e.g. on a shared or borrowed device**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`) — the counterpart to `US-013` (log in), which the
prototype had, but with no way back out.

## Acceptance criteria

### AC-1 — Logging out ends the session
- **Given** a logged-in registered user
- **When** they choose "log out"
- **Then** their session ends and they land on the login screen (`US-013`)

### AC-2 — Logged-out state blocks account screens *(required)*
- **Given** a user who has just logged out
- **When** they try to reach a screen that requires an account (shoot list, profile)
- **Then** they're sent to the login screen instead, not shown stale account data

## Out of scope
- "Log out of all devices" or session management beyond the current one — not specified;
  04-tech territory if it comes up.

## Dependencies
US-013 — logging out only makes sense once logging in exists.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
