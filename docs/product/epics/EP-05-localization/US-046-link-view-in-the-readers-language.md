# US-046 — A link view opens in its reader's language, with a switcher

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **client or crew member who opened a shoot's link**,
I want **the page in a language I read**,
so that **a Ukrainian photographer abroad can share a shoot with a local client**.

## Context
`ADR-022` decision 4, owner 2026-10-06. **Amends `EP-05`**'s "link views stay Ukrainian-only".
The reader has no account, so the photographer's language is not used — a Ukrainian photographer
in Warsaw would otherwise send a Polish client a Ukrainian page.

## Acceptance criteria

### AC-1 — The browser decides
- **Given** a crew or client link opened for the first time in a browser
- **Then** the page is in the language of the browser's preferred language, by `US-045` AC-1's
  rule: Ukrainian or Russian → Ukrainian; anything else → English

### AC-2 — The switcher
- **Then** the page shows a **UA / EN** switcher; choosing the other language redraws the page in
  it at once
- **Design: not drawn yet** — its place and look are open (question 1).

### AC-3 — Remembered in the browser
- **Given** a reader who chose a language with the switcher
- **When** they open this or any other Luna link in the same browser
- **Then** it opens in the language they chose

### AC-4 — Every link page
- AC-1 – AC-3 apply to every page the link surface serves: the crew view, the client view, a
  person's profile opened from them, and the broken-link page.

### AC-5 — What is translated
- Every label, status, date and count on the page, and categories and roles (`US-044`).
- **Not** what the photographer typed — notes, names, addresses.

## Out of scope
- The language of anything the photographer writes.

## Dependencies
`US-044`, `US-010`, `US-023`, `US-026`.

## Open questions
1. Where the UA / EN switcher sits on the page, and how it looks — needs a design.
