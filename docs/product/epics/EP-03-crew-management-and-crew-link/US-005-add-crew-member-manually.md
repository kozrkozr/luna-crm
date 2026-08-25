# US-005 — Add a crew member to a shoot manually

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to add a crew member to a shoot manually by name, role, a phone number or email, and
optional notes (which can include an image)**,
so that **I can include people who aren't registered in the app, the way I already work, and
give them any extra context (e.g. what they're working on) up front**.

## Context
This is the cold-start fallback that makes v1 usable with zero existing users
(`decisions/ADR-003-*.md`; `prd.md` R-04). A crew member added here is who US-006 generates a
link for. The notes field was added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`) — possibly via a rich text editor, but that's an
implementation choice for 04-tech, not decided here.

## Acceptance criteria

### AC-1 — Crew member added with a matchable contact method and optional notes
- **Given** an existing shoot
- **When** the creator adds a crew member with a name, a role, a phone number or email
  (Instagram handle optional, additional), and optionally a note with an image attached
- **Then** that person appears in the shoot's crew list with that contact info and note

### AC-2 — Save blocked without a phone number or email *(required)*
- **Given** the add-crew form
- **When** neither a phone number nor an email is provided (an Instagram handle alone is not
  enough)
- **Then** saving is blocked and the creator is asked for a phone number or email

## Out of scope
- Searching a directory of previously-added or self-registered crew to add them faster —
  that's the deferred crew directory (`decisions/ADR-003-*.md`).
- The actual matching logic that reconciles a manual entry with a later self-registered
  account — resolved to match on email or mobile phone (owner's answer in chat, 2026-08-22);
  implementation is 04-tech, not this story.
- More than one image in a note, or a video in a note — only images were named for notes; if
  video is needed here too (as it is for location notes, `US-018`), that's a new ask.
- Whether notes are visible to other crew members viewing this person's details (`US-023`) —
  see `02-product/open-questions.md`.

## Dependencies
US-002 — a shoot must exist to add crew to it.

## Open questions
None.
