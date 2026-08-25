# US-011 — Client likes or dislikes a reference

- **Parent epic:** [EP-04 — Client view](EP-04.md)
- **Subproject:** 001-luna-crm
- **Status:** retired — removed after trial in the prototype; the owner decided the client
  should not react to references at all, 2026-08-23 (`decisions/ADR-009-*.md`, which
  supersedes the "react" half of `ADR-006-*.md`). Kept on disk for history; not to be built.
- **Size:** S

## Story
As a **client**,
I want **to like or dislike each reference the shoot creator proposed**,
so that **I can react without a back-and-forth conversation**.

## Context
The client only reacts to references the shoot creator proposed — they do not add their own
(`decisions/ADR-006-*.md`; `prd.md` R-12).

## Acceptance criteria

### AC-1 — Reaction saved and visible to the creator
- **Given** a client viewing their shoot's references (US-010)
- **When** they like or dislike one
- **Then** that reaction is saved and visible to the shoot creator

### AC-2 — Action rejected on an invalid link *(required)*
- **Given** an invalid or expired client link
- **When** someone attempts to react to a reference through it
- **Then** the action is rejected and no reaction is recorded

## Out of scope
- Proposing a new reference as a client — considered and declined
  (`decisions/ADR-006-*.md`).
- Commenting or leaving text feedback beyond like/dislike — not requested.

## Dependencies
US-003 (references must exist) and US-010 (the client must be able to view the shoot).

## Open questions
None. Resolved: no time-based expiry — see `US-010-*.md` in this folder.
