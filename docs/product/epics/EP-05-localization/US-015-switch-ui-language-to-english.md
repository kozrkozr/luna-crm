# US-015 — Switch UI language to English

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to switch the UI language to English**,
so that **I can use the product in English if I prefer it, with the choice remembered**.

## Context
Split from the retired `US-012` on 2026-08-22: this is an active user action, distinct from
the passive default covered by `US-014`. Scoped to registered accounts (`prd.md` R-10).

## Acceptance criteria

### AC-1 — Switching changes and persists the language
- **Given** a logged-in user viewing the app in Ukrainian (the default, `US-014`)
- **When** they switch the language setting to English
- **Then** all UI text changes to English, and the choice persists the next time they log in

### AC-2 — Switching back and forth doesn't lose data *(required)*
- **Given** a user who switches to English and later back to Ukrainian
- **When** they view any shoot they created or were added to
- **Then** the shoot's own content (client info, references, names) is unchanged — only the
  interface language changed, not the data

## Out of scope
- Any language beyond Ukrainian and English.
- Russian — deliberate exclusion (`00-intake/s02-2026-08-22/transcript.md`, lines 412–416).
- Crew/client link-view localization — resolved as out (`EP-05.md`, Out of scope).

## Dependencies
US-014 — a default must exist before there's something to switch away from.

## Open questions
None.
