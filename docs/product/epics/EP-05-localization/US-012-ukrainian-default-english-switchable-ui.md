# US-012 — Ukrainian-default, English-switchable UI for registered accounts

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** retired — split into [US-014](US-014-ukrainian-default-ui.md) (defaults to
  Ukrainian) and [US-015](US-015-switch-ui-language-to-english.md) (switch to English),
  2026-08-22. Kept on disk for history; not to be built as written below.
- **Size:** S

## Story
As a **shoot creator**,
I want **the UI in Ukrainian by default, with the option to switch to English**,
so that **I can use the product in the language I actually work in, with English available if
needed**.

## Context
Scoped to registered accounts (`prd.md` R-10; `00-intake/s02-2026-08-22/transcript.md`, lines
396–416). Whether the crew/client link views (no account) need their own switch is unresolved
— see Open questions.

## Acceptance criteria

### AC-1 — Ukrainian by default for a new account
- **Given** a new registered account with no saved language preference
- **When** the app loads
- **Then** all UI text is shown in Ukrainian

### AC-2 — Device locale does not override the default *(required)*
- **Given** a user who has never set a language preference and whose device locale is neither
  Ukrainian nor English
- **When** the app loads
- **Then** it still defaults to Ukrainian, not the device locale, and no text is left
  untranslated

## Out of scope
- Russian — deliberate exclusion (`00-intake/s02-2026-08-22/transcript.md`, lines 412–416).
- Any language beyond Ukrainian and English.
- Crew/client link-view localization — resolved as out: those views stay Ukrainian-only, with
  no switch (owner's answer in chat, 2026-08-22).

## Dependencies
US-001 — a language preference is stored on a registered account.

## Open questions
None.
