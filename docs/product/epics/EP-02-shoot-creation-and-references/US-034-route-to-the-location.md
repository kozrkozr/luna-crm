# US-034 — A shoot carries directions to the location

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to attach a map link or a pin to the location**,
so that **nobody arrives late because a loft address on Хрещатик is ambiguous**.

## Context
`US-018` gives a shoot a `location_address` and a free-text `location_note`, and the note already
covers written access instructions («Заїзд через шлагбаум — код 4521»). What it has no field for
is a **link to the place on a map**. The mockups show one: the detail screen puts a «Маршрут»
[route] action under the address, and the edit screen has a field «Маршрут до локації» holding a
chip labelled «Google Maps».

**This story is held at draft — its shape is genuinely unclear in the mockups, and the ambiguity
is not cosmetic.** See Open questions. The AC below covers only what both mockups agree on.

## Acceptance criteria

### AC-1 — A map link can be attached
- **Given** a shoot creator editing a shoot (`US-018`)
- **When** they paste a link to the location on a map service
- **Then** it is saved on the shoot and shown as a labelled chip on the edit form

### AC-2 — Opening the route from the shoot
- **Given** a shoot with a map link
- **When** the creator taps «Маршрут» on the detail screen
- **Then** the link opens outside the app, in whatever handles it on the device

### AC-3 — Absent when not set
- **Given** a shoot with no map link
- **When** the shoot is viewed
- **Then** no route action is shown — the address alone is not turned into a link

### AC-4 — Crew and clients get the route
- **Given** a crew member or client opening their link
- **When** they view the shoot
- **Then** they can open the same route, if one is set

## Out of scope
- Generating a route from `location_address` without a saved link (AC-3 says the opposite).
- Turn-by-turn navigation, embedded maps, or travel-time estimates.
- Written access instructions — already `location_note` (`US-018`).

## Dependencies
`US-018` — the edit form and the location section it owns.

## Open questions
**1. Is this one collection or three fields?** The two mockups disagree in a way that changes the
schema. The edit screen shows a *single* strip labelled «Маршрут до локації» whose add-tile
popover offers three things — «Додати фото», «Додати посилання», «Додати геолокацію» [photo,
link, geolocation]. The detail screen shows those same contents *split*: photos under a separate
«Фото локації» heading, and the link as the «Маршрут» action. So either one mixed collection is
rendered in two places, or there are two collections that the edit screen happens to group under
one label. `US-033` assumes the second reading for photos; if the first is right, `US-033` and
this story are one story.

**2. What is «Додати геолокацію»?** A dropped pin, i.e. coordinates, is a third data type
alongside a file and a URL, and nothing specifies where it comes from — the device's current
position, a map picker, or pasted coordinates. Not built until answered.

**3. Where does the chip's label come from?** The mockup hardcodes «Google Maps». Derived from
the URL's host, typed by the creator, or a fixed string for every link — undecided.

**Both 1 and 2 are Ilona's call, and 1 blocks the schema.** This story should not be built before
`US-033`, and answering 1 may merge them.
