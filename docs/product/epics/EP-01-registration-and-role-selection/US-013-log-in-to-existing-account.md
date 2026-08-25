# US-013 — Log in to an existing account

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **registered user**,
I want **to log in to my existing account**,
so that **I can get back to my shoots, or my own schedule, without registering again**.

## Context
This was missing from the original backlog — `prd.md` R-01 covered registering but never
explicitly said how a returning user gets back in. Added as `R-13` when the backlog was split
into stories, since it's a genuinely separate capability from registration, not a detail of it
(`02-product/prd.md`, R-13).

## Acceptance criteria

### AC-1 — Correct credentials log the user in
- **Given** a registered user on the login screen
- **When** they enter their correct credentials
- **Then** they land on their shoot list (if a shoot creator) or their own schedule (if a
  self-registered crew member), already logged in

### AC-2 — Incorrect credentials are rejected *(required)*
- **Given** a user on the login screen
- **When** they enter incorrect credentials
- **Then** login is rejected with a clear message, and no account is entered

## Out of scope
- Password reset — not specified in `prd.md`; 04-tech territory.
- Social login or any login method beyond basic credentials — not requested.
- Staying logged in across sessions (session length, "remember me") — not specified; a
  technical detail for 04-tech, not invented here.

## Dependencies
US-001 — a user must have registered before they can log in.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
