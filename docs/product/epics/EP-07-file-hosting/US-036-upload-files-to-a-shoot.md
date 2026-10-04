# US-036 — Upload raw files and finished photos to a shoot

- **Parent epic:** [EP-07 — File hosting](EP-07.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** L

## Story
As a **shoot creator**,
I want **to upload raw files and finished photos to the shoot from the app in my computer's browser**,
so that **the client gets them from their shoot link instead of a file-sharing service**.

## Context
`decisions/ADR-020-*.md`. Files go to Backblaze B2, not Supabase Storage. Each uploaded file is
a `ShootFile` (glossary: файл зйомки) of kind raw files or finished photos. **Upload is from the
photographer's app in a desktop browser** (`ADR-021`, `US-040`); upload from the iOS app is
deferred.

The first upload to a shoot fixes the date its files are deleted: 30 days later (`ADR-020`,
decision 3). Files added later do not move it.

## Acceptance criteria

### AC-1 — Upload into either section
- **Given** a shoot the user created
- **When** they upload files to the raw-files section or the finished-photos section
- **Then** the files are stored and listed in that section, and the client sees them
  (`US-024`, `US-025`)

### AC-2 — The first upload fixes the deletion date
- **Given** a shoot with no hosted files yet
- **When** the first file is uploaded
- **Then** the shoot's files are scheduled for deletion 30 days after that moment, and a later
  upload does not change that date

### AC-3 — A full quota blocks the upload
- **Given** the account's files across all its shoots total 200 GB, or the new files would take
  it past that
- **When** the user tries to upload
- **Then** the upload does not start, and the app says:
  «Сховище заповнене (200 ГБ). Видаліть файли інших зйомок, щоб завантажити нові.»

### AC-4 — No per-file size limit
- **Given** a single file of any size that fits in the remaining quota
- **When** the user uploads it
- **Then** it is accepted

### AC-5 — The pasted link stays
- **Given** a shoot with a pasted file-sharing link for a section (`ADR-008`'s field)
- **When** files are uploaded to that section
- **Then** the link is kept, and both show — hosted files and the link (owner, chat 2026-10-03)

### AC-6 — *moved to the deferred iOS upload* (`ADR-021`)
On 2026-10-03 the owner chose both the photo library and the Files app as sources on iOS. That
stands for when iOS upload is undeferred; in the browser, files are chosen from the computer —
a file picker and drag-and-drop, both (owner, 2026-10-04; design to come).

### AC-7 — No upload once the deletion date has passed
- **Given** a shoot whose deletion date has passed
- **When** the creator tries to upload to it
- **Then** the upload is blocked — the date is not reset (owner, chat 2026-10-03; a rare case)

### AC-8 — Only the creator uploads
- **Given** any user other than the shoot's creator, or anyone through a crew or client link
- **When** they try to upload to the shoot
- **Then** it is refused

## Out of scope
- Upload from the iOS app — deferred (`ADR-021`).
- Payment for the quota (`ADR-020`, decision 6).

## Dependencies
US-002 — a shoot must exist. US-040 — the app in a desktop browser.

## Open questions
1. Which file types can be picked? Proposed in the build repo's plan (2026-10-03); awaiting the owner.
2. ~~After every file is deleted, does a new upload start a fresh 30 days?~~ **No** (owner, chat
   2026-10-03) — the date set by the first upload stands. After that date, uploads are blocked
   (AC-7). The copy for that block is not decided.
3. Does the creator see how much of the 200 GB is used, and where?
4. What happens to an upload interrupted by the network — resumed, or started again?
5. Can a whole folder be picked or dropped at once? (`ADR-021`)
