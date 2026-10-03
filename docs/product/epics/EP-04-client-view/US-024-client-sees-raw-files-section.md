# US-024 — Client sees and downloads the raw files

- **Parent epic:** [EP-04 — Client view](EP-04.md)
- **Subproject:** 001-luna-crm
- **Status:** draft — **rewritten 2026-10-03** for hosted files (`decisions/ADR-020-*.md`)
- **Size:** M

## Story
As a **client**,
I want **to view and download the raw files of my shoot from my shoot link**,
so that **I get them where the rest of my shoot already is, without a separate service**.

## Context
Until 2026-10-03 this section was a placeholder or a pasted external link (`ADR-008`, now
superseded). `ADR-020` hosts the files: the creator uploads them (`US-036`) and they are deleted
30 days after the first upload to the shoot (`US-037`). The pasted link stays as an
alternative, and the section can show both (owner, chat 2026-10-03).

The client gets the files through the link gateway (`ADR-013`) — **only the client payload
carries them**; a crew member does not see them for now (owner, chat 2026-10-03). Media URLs are
signed and expire while the link does not (`CLAUDE.md`, build repo): a view left open re-requests
the payload on a media error.

Same story as `US-025`, for raw files (вихідники).

## Acceptance criteria

### AC-1 — Hosted files are listed, viewable and downloadable
- **Given** a shoot with hosted raw files
- **When** the client opens their shoot link
- **Then** the section lists the files, and the client can view each one and download each one

### AC-2 — Download all at once
- **Given** a shoot with hosted raw files
- **When** the client chooses to download all
- **Then** every file of the section is downloaded, without picking them one by one

### AC-3 — The deletion date is shown
- **Given** a shoot with hosted raw files
- **When** the client views the section
- **Then** it shows «Файли доступні до {дата}» (`US-037`)

### AC-4 — The pasted link shows alongside the files
- **Given** the creator has also pasted a file-sharing link for this section
- **When** the client views the section
- **Then** both show — the hosted files and the link

### AC-5 — After deletion, the link if there is one, otherwise a placeholder
- **Given** the shoot's hosted files have been deleted — on schedule or by the creator
- **When** the client views the section
- **Then** it shows the pasted link if the creator added one; otherwise it shows
  «Файли видалено. Зверніться до фотографа, якщо вони ще потрібні.»
  The shoot link itself keeps working — `ADR-014` is unchanged.

### AC-6 — A link that does not work is not presented as one *(carried from the 2026-08-23 AC-3)*
- **Given** the creator has pasted a link that is malformed or unreachable
- **When** the client views the section
- **Then** it is rejected the same way a reference link is (`US-003` AC-2)

### AC-7 — A crew member does not get the files
- **Given** a crew member's link to the same shoot
- **When** the gateway builds the crew payload
- **Then** it contains no hosted files and no file URLs

## Out of scope
- Crew seeing the files — later (owner, chat 2026-10-03).
- A ZIP archive — AC-2 asks for every file, not for one archive; at 30–40 GB a server-side
  archive is expensive (`ADR-020`).

## Dependencies
US-010 — the client link view. US-036 — files must be uploaded.

## Open questions
1. A shoot that never had hosted files and has no pasted link — what does the section show? The
   2026-08-23 «in development» placeholder no longer describes the product.
