# US-039 — Get a push warning 3 days before the files are deleted

- **Parent epic:** [EP-07 — File hosting](EP-07.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **a push notification 3 days before a shoot's files are deleted**,
so that **I can download what I still need**.

## Context
`decisions/ADR-020-*.md`, decision 4. The app has no push notifications today; this story is
what introduces them (APNs, device tokens). Copy chosen by the owner, chat 2026-10-03.

## Acceptance criteria

### AC-1 — The warning arrives 3 days before
- **Given** a shoot with hosted files whose deletion date is 3 days away
- **When** the warning is due
- **Then** the creator gets a push notification:
  «Файли зйомки «{назва}» буде видалено {дата}. Завантажте їх, якщо вони ще потрібні.»

### AC-2 — No warning once the files are gone
- **Given** a shoot whose files the creator already deleted (`US-038`)
- **When** the warning would have been due
- **Then** no notification is sent

## Dependencies
US-036, US-037.

## Open questions
1. When does the app ask for push permission, and what happens if the creator refuses — is
   there another warning, or none?
2. Where does tapping the notification lead — the shoot?
3. «{назва}» — the shoot has no title field; which value stands in (client name, date)?
