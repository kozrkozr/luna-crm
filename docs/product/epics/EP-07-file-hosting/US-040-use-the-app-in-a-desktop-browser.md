# US-040 — Use the photographer's app in a desktop browser

- **Parent epic:** [EP-07 — File hosting](EP-07.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** L

## Story
As a **shoot creator**,
I want **to use the app in the browser on my computer**,
so that **I can upload the files where they are — on the computer — and manage my shoots there
too**.

## Context
`decisions/ADR-021-*.md`. The whole photographer's app, not only uploading. It sits in `EP-07`
because file hosting is what makes it needed; it covers every creator story.

## Acceptance criteria

### AC-1 — Every creator story works in a desktop browser
- **Given** a modern desktop browser — Chrome, Safari, Firefox or Edge
- **When** a registered user signs in on the web
- **Then** every creator story behaves as its acceptance criteria say, as in the iOS app

### AC-2 — One account on both
- **Given** a user registered in the iOS app
- **When** they sign in on the web with the same email and password
- **Then** they see the same shoots, and a change on one shows on the other

### AC-3 — One email link, the right app
- **Given** a confirmation or recovery email (`US-001`, `ADR-019`)
- **When** the user follows its link
- **Then** on a phone it opens the iOS app, and on a computer the web app — the same link in
  both cases (owner, chat 2026-10-04)

### AC-4 — The phone layout, centred
- **Given** a desktop browser window wider than a phone
- **When** any creator screen is shown
- **Then** it is the phone layout, centred — no separate desktop layout (owner, chat 2026-10-04)

### AC-5 — At its own address, in the account's language
- **Given** the web app
- **When** a user opens it
- **Then** it is served at `app.lunashoots.com`, and its copy follows the account's language
  (uk/en, `US-014`, `US-015`) (owner, chat 2026-10-04)

## Out of scope
- Uploading files from the iOS app — deferred (`ADR-021`).

## Dependencies
Every creator story it covers. Comes before `US-036`.

## Open questions
None — `ADR-021`'s were answered 2026-10-04.
