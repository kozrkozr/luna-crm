# US-016 — View own profile

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **registered user**,
I want **to see my own profile — name, contact, role, and social-media field**,
so that **I can check what other people (crew, clients) see about me, and confirm my account
details are right**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`) — the prototype had no way to view your own
account after registering. Read-only in v1; editing is out of scope (see `EP-01.md`, Out of
scope). The social-media field was added in the second review round
(`03-design/reviews/r02-2026-08-23/notes.md`).

## Acceptance criteria

### AC-1 — Profile shows the registered info
- **Given** a logged-in registered user
- **When** they open their profile
- **Then** they see their name, contact (phone or email), professional role, and social-media
  field (if one was given), matching what was entered at registration (`US-001`)

### AC-2 — Profile is reachable and read-only *(required)*
- **Given** a logged-in user on their profile screen
- **When** they look for a way to change any field
- **Then** there is none — this story is view-only; attempting to edit is not a supported
  action in v1

## Out of scope
- Editing any profile field — not requested as part of this story; see `EP-01.md`, Out of
  scope.
- Viewing someone else's profile this way — that's `US-023`, scoped to crew members viewing
  each other from within a shared shoot, not a general profile-lookup feature.

## Dependencies
US-001 — a profile only exists once someone has registered.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
