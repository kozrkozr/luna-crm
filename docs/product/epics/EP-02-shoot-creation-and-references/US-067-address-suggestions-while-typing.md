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

### AC-1 — A search screen opens
- **Given** the «Адреса» field of the shoot form, on iPhone — a map-pin icon at its left and the
  placeholder **«Місце, адреса або будь-який текст»** (owner, 2026-10-17, from his screenshot of the
  location picker)
- **When** the creator taps it
- **Then** a search screen opens over the form, as in Apple Calendar's «Місце» (owner, 2026-10-17,
  after the inline list was hidden behind the keyboard at the bottom of the screen)
- Its header is the shoot form's own: **«Скасувати»** muted at the left, the title **«Адреса»**
  centred, **«Зберегти»** at the right
- Under the header, the search field holds the current address, with the keyboard open. Empty, it
  shows the map-pin icon and the same placeholder; while text is in it, a magnifier at the left
  and a clear button at the right
- **When** the creator types — from the first letter (owner, 2026-10-17)
- **Then** Apple's suggestions are listed under the field in one rounded card, each row with a
  map-pin icon, a title and a subtitle as Apple gives them («Хрещатик, 22» / «Київ, Україна»);
  streets and venues in one list; under the card **«Дані: Apple Maps»**
- The app does **not** ask for the phone's location: suggestions are ranked by Apple's region
  alone, and no permission prompt appears (owner, 2026-10-17)

### AC-1a — Your locations, while the field is empty
- **Given** the search field is empty
- **Then** under it is the hint **«Виберіть місце зі списку або просто напишіть текст — наприклад,
  «У клієнтки вдома» чи «Біля фонтану на Контрактовій».»**, and under that **«Ваші локації»**: the
  locations of the creator's own shoots, most recent first, without repeats, at most 6 — the
  same rule as the chips under «Назва» (owner, 2026-10-17)
- A location with an address shows a map-pin icon, its name, and the address under it
- A location with a name and no address shows a text icon, its name, and **«Без адреси»** under
  it — no «текст» tag (owner, 2026-10-17)
- Whether a location has an address is the only test: the shoot stores text, not where it came
  from, so free text saved into «Адреса» («Біля фонтану») shows as an address (owner, 2026-10-17,
  over saving a «picked from Apple Maps» flag)
- **When** the creator taps one
- **Then** the screen closes and **both** «Назва» and «Адреса» take that shoot's values — what was
  in them is replaced; a location without an address leaves «Адреса» empty
- With no past locations, «Ваші локації» is not shown

### AC-2 — A street address is picked
- **When** the creator taps a suggestion that is an address
- **Then** the screen closes and «Адреса» is filled with its full address; «Назва» is not touched

### AC-3 — A venue is picked
- **When** the creator taps a suggestion that is a place («Студія Світло»)
- **Then** the screen closes and «Адреса» is filled with the place's address
- **And** «Назва» is filled with the place's name **only if «Назва» is empty** — anything already
  typed there is kept

### AC-4 — Typing stays free *(required)*
- **When** the creator taps «Зберегти» or presses the keyboard's return key instead of picking a
  suggestion
- **Then** the screen closes and «Адреса» holds exactly the typed text
- **When** they tap «Скасувати»
- **Then** the screen closes and «Адреса» is unchanged
- **Given** no suggestion fits, there is no connection, or Apple returns an error
- **Then** no list is shown and no message appears; typing and the return key work as above
- The form saves and validates as it does today

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
- **A map card after a pick** — the screenshot's third state: a map snapshot of the place,
  «Змінити», and «Команда відкриє маршрут…». Deferred by the owner, 2026-10-17 («як буде час»).
  It needs coordinates saved with the shoot (a migration, and a change to AC-6 and `ADR-026`) and
  a snapshot from `MKMapSnapshotter` in the same native module; iOS only. A story of its own.
- Link views — readers there do not type an address.

## Dependencies
`US-018`, `ADR-026`.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | Does Apple find the owner's real venues? The owner checks on maps.apple.com before building | Whether to build this on Apple at all (`ADR-026` revisit) |
| 2 | The English for the new copy — proposed: «Place, address or any text», «Pick a place from the list or just type text — for example, “At the client's home” or “By the fountain on Kontraktova”.», «Your locations», «No address», «Data: Apple Maps» | The EN strings |
