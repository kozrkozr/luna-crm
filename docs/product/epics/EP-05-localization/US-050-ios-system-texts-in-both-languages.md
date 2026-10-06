# US-050 — iOS system texts in both languages

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **photographer whose phone is not in Ukrainian**,
I want **the iOS prompts the app triggers in my language**,
so that **I understand what I am allowing**.

## Context
`ADR-022`, owner 2026-10-06; split from `US-045`, which covers the app's own text only. These texts
are not in the app's dictionary: iOS reads them from the build, one file per language, and picks
the language itself. Today there is one — the photo-library prompt, «Luna потребує доступу до
фото, щоб додати референс до зйомки.» (`US-003`) — and it is Ukrainian only. The notification
prompt (`US-041`) is iOS's own text and already follows the phone.

## Acceptance criteria

### AC-1 — The photo-library prompt
- **Given** a phone in English (by `US-045` AC-1's rule)
- **When** the app first asks for the photo library
- **Then** the prompt reads «Luna Shoots needs access to your photos to add a reference to a
  shoot.»
- In Ukrainian otherwise: «Luna Shoots потребує доступу до фото, щоб додати референс до зйомки.»
  — the current text, with the app's full name (owner, 2026-10-06: «Luna Shoots, а не Luna»).

### AC-2 — It follows iOS, not the account
- The prompt's language is chosen **by iOS, from the phone's language** — not from the language
  chosen in the profile (`US-015`). A photographer with an English phone who switched the app to
  Ukrainian still sees the prompt in English. iOS gives the app no way to change that; it is
  accepted (owner, 2026-10-06).

### AC-3 — The app declares both languages
- The build declares Ukrainian and English as its languages, so that iOS Settings offers a
  per-app language for Luna, and the App Store lists both.

### AC-4 — Every such text
- Any iOS system text the app adds later is given in both languages the same way.

## Out of scope
- Texts iOS writes itself (the notification prompt, system buttons).

## Dependencies
`US-045`, `US-003`.

## Open questions
None — the prompt's text was confirmed by the owner, chat 2026-10-06.
