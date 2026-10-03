# US-037 — See when a shoot's files will be deleted

- **Parent epic:** [EP-07 — File hosting](EP-07.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to see the date a shoot's files will be deleted**,
so that **I am not surprised when they are gone**.

## Context
`decisions/ADR-020-*.md`, decision 3. The client sees the same date (`US-024`, `US-025`).
Copy chosen by the owner, chat 2026-10-03.

## Acceptance criteria

### AC-1 — The date is shown once files exist
- **Given** a shoot with hosted files
- **When** the creator opens the shoot
- **Then** the files sections show «Файли доступні до {дата}», where the date is 30 days after
  the first upload

### AC-2 — Nothing is shown without files
- **Given** a shoot with no hosted files
- **When** the creator opens the shoot
- **Then** no deletion date is shown

### AC-3 — The files are deleted on that date
- **Given** a shoot whose deletion date has passed
- **When** the scheduled deletion runs
- **Then** every hosted file of the shoot is deleted from storage, and no longer counts against
  the account's 200 GB

## Dependencies
US-036.

## Open questions
None.
