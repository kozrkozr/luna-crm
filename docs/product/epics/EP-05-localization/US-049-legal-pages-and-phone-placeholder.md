# US-049 — Privacy policy and terms in English; a phone field that does not assume Ukraine

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **photographer outside Ukraine**,
I want **the privacy policy and terms in English, and a phone field that takes my number**,
so that **I know what I agree to, and the form does not tell me it is not for me**.

## Context
`ADR-022` decisions 7 and 9, owner 2026-10-06. The privacy policy and the terms are Ukrainian-only
static pages; every phone field shows the placeholder `+380 __ ___ ____`.

## Acceptance criteria

### AC-1 — English pages
- **Given** the app in English
- **Then** the privacy-policy and terms links open the English versions; in Ukrainian otherwise

### AC-2 — The text
- The English texts are supplied by the owner — after the GDPR review `ADR-022` asks for. Nothing
  is translated or written by the build.

### AC-3 — The phone placeholder
- **Given** any phone field in the app
- **Then** its placeholder no longer shows the Ukrainian `+380` mask
- **And** it shows an example number of the phone's region — the region set on the phone, not the
  app's language: a Ukrainian-language app on a phone set to Poland shows a Polish number
  (owner, 2026-10-07)
- **And** when the region is unknown or has no example number, the Ukrainian example is shown
- **And** the "phone or email" field of a crew member shows the same example, followed by "or
  email" in the app's language

## Out of scope
- Matching crew by an international number (`ADR-022`, deferred).

## Dependencies
`US-045`.

## Open questions
1. ~~The new phone placeholder, in both languages.~~ Answered 2026-10-07 — an example number of
   the phone's region, see AC-3.
2. The English privacy policy and terms (owner, with a lawyer).
