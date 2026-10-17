# US-067 — Suggest addresses and places while the address is typed

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **the address field to suggest addresses and places as I type**,
so that **I fill the location in a few taps, spelled the way a map will find it**.

## Context
Owner, chat 2026-10-17. Suggestions come from Apple Maps on the iPhone (`ADR-026`). How well
Apple knows Ukrainian venues is not yet checked — open question 1.

The pattern is the one in Apple Calendar and Google Calendar: **one field searches both streets and
venues**. Autocomplete sits on «Адреса» only; «Назва» stays free text, because it often holds
something no map knows («у Олі вдома», «локація №2»).

## Acceptance criteria

### AC-1 — Suggestions appear
- **Given** the «Адреса» field of the shoot form, on iPhone
- **When** the creator types into it — from the first letter (owner, 2026-10-17)
- **Then** a list under the field shows Apple's suggestions, each with a title and a subtitle as
  Apple gives them («Хрещатик, 22» / «Київ, Україна»); streets and venues in one list
- The app does **not** ask for the phone's location: suggestions are ranked by Apple's region
  alone, and no permission prompt appears (owner, 2026-10-17)

### AC-2 — A street address is picked
- **When** the creator taps a suggestion that is an address
- **Then** «Адреса» is filled with its full address and the list closes; «Назва» is not touched

### AC-3 — A venue is picked
- **When** the creator taps a suggestion that is a place («Студія Світло»)
- **Then** «Адреса» is filled with the place's address
- **And** «Назва» is filled with the place's name **only if «Назва» is empty** — anything already
  typed there is kept

### AC-4 — Typing stays free *(required)*
- **Given** no suggestion fits, there is no connection, or Apple returns an error
- **Then** no list is shown, no message appears, and the field takes text exactly as it does today
- The creator never has to pick a suggestion; both fields stay editable after a pick, and the form
  saves and validates as it does today

### AC-5 — Where it is offered
- On every form that has «Адреса» — «Нова зйомка» and «Редагувати зйомку»
- Not in a browser (`EP-10`): the web app keeps the plain field

### AC-6 — Nothing new is stored
- Only the text of «Адреса» and «Назва» is saved; no coordinates, no place ID. `US-034`'s route is
  built from that text

## Out of scope
- Autocomplete in the web app (`EP-10`) — would need MapKit JS or Google, see `ADR-026`.
- Picking a place on a map, the device's current location, or ranking by it (AC-1).
- Suggestions on «Назва».
- Link views — readers there do not type an address.

## Dependencies
`US-018`, `ADR-026`.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | Does Apple find the owner's real venues? The owner checks on maps.apple.com before building | Whether to build this on Apple at all (`ADR-026` revisit) |
