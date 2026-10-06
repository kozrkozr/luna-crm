# US-014 — UI defaults to Ukrainian for registered accounts

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S
- **Amended by `US-045` (`ADR-022`, 2026-10-06):** a new install and a new account follow the
  phone's language; AC-1 and AC-2 below hold only for accounts registered before it.

## Story
As a **shoot creator**,
I want **the UI to be in Ukrainian by default**,
so that **I can use the product in the language I actually work in, without configuring
anything**.

## Context
Split from the retired `US-012` on 2026-08-22: the default behavior and the ability to switch
away from it (`US-015`) are two independently-testable capabilities. Scoped to registered
accounts (`prd.md` R-10; `00-intake/s02-2026-08-22/transcript.md`, lines 396–416).

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
- Switching to English — separate story (`US-015`).
- Russian — deliberate exclusion (`00-intake/s02-2026-08-22/transcript.md`, lines 412–416).
- Crew/client link-view localization — resolved as out (`EP-05.md`, Out of scope).

## Dependencies
US-001 — a language preference belongs to a registered account.

## Open questions
None.
