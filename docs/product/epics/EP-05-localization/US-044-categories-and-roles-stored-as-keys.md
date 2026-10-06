# US-044 — Reference categories and crew roles are stored as keys

- **Parent epic:** [EP-05 — Localization](EP-05.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator working in two languages, and the people I share a shoot with**,
I want **a reference's category and a person's role to read in whatever language each of us
uses**,
so that **switching the language never hides a reference or shows a label in the other
language**.

## Context
`ADR-022`, owner 2026-10-06. Both are stored today as the text the UI showed when they were
picked — «Світло», «Фотограф» in Ukrainian, «Light», «Photographer» in English. A reference filed
under «Світло» is missing from the «Light» filter; a link view (`US-046`) in English would show
«Фотограф» from the database. This story comes first: `US-045` and `US-046` both rely on it.

## Acceptance criteria

### AC-1 — Categories as keys
- **Given** a reference added under any category, in either language
- **Then** what is stored is the category's key — one of three: «Світло» / Light, «Пози» / Poses,
  «Стиль» / Style (`US-032`)
- **And** it is shown in the language of the surface that displays it, and filtered by its key —
  a reference filed in Ukrainian is under «Light» in English

### AC-2 — Roles as keys
- **Given** a role picked from the list — the nine of the glossary, «Фотограф» … «Продюсер» —
  for a crew member, a saved contact or the account's own profile
- **Then** its key is stored, and it is shown in the surface's language, with its emoji as today
- **Given** «Інша роль» and a role typed by hand
- **Then** the typed text is stored and shown **as typed**, in every language

### AC-3 — Existing rows
- **Given** categories and roles already stored as Ukrainian or English text
- **Then** a migration rewrites every one that matches a label in either language to its key;
  anything else is left as typed text (AC-2)

### AC-4 — Search
- **Given** the search over saved contacts («Імʼя або роль»)
- **Then** a role is found by its name in the language the app is in

## Out of scope
- Translating text a person typed — a custom role, a note, a name.

## Dependencies
`US-003`, `US-005`, `US-032`, `US-001`.

## Open questions
None.
