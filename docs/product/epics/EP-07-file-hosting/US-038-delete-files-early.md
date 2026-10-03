# US-038 — Delete a shoot's files before the period ends

- **Parent epic:** [EP-07 — File hosting](EP-07.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to delete a shoot's files before the 30 days are up**,
so that **I free space in my 200 GB for other shoots**.

## Context
`decisions/ADR-020-*.md`, decision 3: "the shoot creator may delete them earlier".

## Acceptance criteria

### AC-1 — Deleted files are gone everywhere
- **Given** a shoot with hosted files
- **When** the creator deletes them
- **Then** they are deleted from storage, the client no longer sees them, and they no longer
  count against the account's 200 GB

### AC-2 — One file, or all of them
- **Given** a shoot with hosted files
- **When** the creator deletes
- **Then** they can delete a single file, or every file of the shoot at once (owner, chat
  2026-10-03)

### AC-3 — Deleting does not reset the date
- **Given** the creator deleted every file of the shoot
- **When** they upload again before the shoot's deletion date
- **Then** the new files keep the original date — a new upload does not start a fresh 30 days
  (owner, chat 2026-10-03)

### AC-4 — Only the creator deletes
- **Given** any user other than the shoot's creator, or anyone through a crew or client link
- **When** they try to delete the shoot's files
- **Then** it is refused

## Dependencies
US-036.

## Open questions
1. Is there a confirmation before deleting, and with what copy? Deletion is final.
