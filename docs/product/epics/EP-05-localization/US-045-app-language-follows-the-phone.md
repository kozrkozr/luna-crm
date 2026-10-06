# US-045 — The app's language follows the phone

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **photographer anywhere — in Ukraine, the EU or the US**,
I want **the app in my phone's language from the first screen**,
so that **I am not met by a language I cannot read, and I need not look for a setting first**.

## Context
`ADR-022` decision 3, owner 2026-10-06. **Amends `US-014`**: its AC-1 (Ukrainian by default) and
AC-2 (the device locale does not override it) stop applying to new installs and new accounts.

## Acceptance criteria

### AC-1 — The rule
- The phone's preferred language decides: **Ukrainian or Russian → Ukrainian; anything else →
  English**. Russian is never offered (`EP-05`).

### AC-2 — Signed out
- **Given** the app opened with nobody signed in
- **Then** every screen — sign-in, registration, password recovery — is in the AC-1 language
- There is **no language switcher** on these screens.

### AC-3 — A new account
- **When** someone registers
- **Then** the account's language is set to the AC-1 language at that moment

### AC-4 — The account's choice wins
- **Given** an account whose language was set — at registration (AC-3) or in the profile (`US-015`)
- **Then** the app is in that language once signed in, whatever the phone says

### AC-5 — Existing accounts
- **Given** an account registered before this story
- **Then** its language stays as it was — Ukrainian unless it was switched (`US-015`)

## Out of scope
- Any language besides Ukrainian and English (`ADR-022` decision 2).

## Dependencies
`US-014`, `US-015`, `US-044`.

## Open questions
None.
