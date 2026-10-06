# US-048 — Auth emails arrive in the account's language

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **photographer who registered in English**,
I want **the emails from the app in English**,
so that **I can confirm my address and recover my password without guessing**.

## Context
`ADR-022` decision 8, owner 2026-10-06. Supabase holds one template per email for the whole
project; the template picks its text with a condition on the language stored in the user's auth
metadata. No send hook.

## Acceptance criteria

### AC-1 — Which emails
- Confirm sign-up (`ADR-019`), reset password, and change email.

### AC-2 — The language
- **Given** an account whose language is English
- **Then** each of these emails is in English; in Ukrainian otherwise
- **Given** an account registered before this story, with no language in its auth metadata
- **Then** Ukrainian

### AC-3 — It follows the account
- The language is written at registration (`US-045` AC-3) and again whenever it is changed in the
  profile (`US-015`), so the next email follows the change.

### AC-4 — The subject
- The subject is in the same language as the body, **if** the template's condition works in the
  subject line; otherwise the subject carries both languages. Verified on the dev project first.

### AC-5 — Both projects
- The templates are set on the dev and the prod Supabase projects.

## Out of scope
- Any email beyond AC-1's three.

## Dependencies
`US-045`, `US-015`, `ADR-019`.

## Open questions
1. The English text of the three emails.
