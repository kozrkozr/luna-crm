# US-034 — Open a route to the location from its address

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**, and as a **crew member** or **client** opening a link,
I want **one tap from the shoot's address to a route in Google Maps**,
so that **nobody arrives late because they had to copy the address into a map app by hand**.

## Context
**Rewritten 2026-10-17** (owner, chat). The first version asked for a separate map link pasted by
the creator, shown as a «Google Maps» chip, and its AC-3 forbade turning the address itself into a
route. The owner reversed that: the route is built from the address, and there is no separate
field. Nothing of the first version was built — the schema has no map-link column — so no shoot
on production changes.

What exists today, and what this story restores:
- The link view (`US-007`, `US-010`) once had a working «Маршрут» that opened Google Maps on the
  address. The 2026-09-03 artboard dropped it, leaving one copy button beside the address.
- The creator's location card has no buttons since the v3 design; its «Маршрут» was a stub.
- Creators already paste map links into the address, and `linkify` makes them tappable
  (2026-09-06). AC-2 keeps those shoots working.

`ADR-013` is unaffected: the route uses only `location_address`, which both audiences already get.

## Acceptance criteria

### AC-1 — The route button
- **Given** a shoot whose address is not empty
- **Then** a «Маршрут» button is shown beside the address in three places: the creator's location
  card on the shoot screen, the crew link view and the client link view
- It is a 44pt icon button, the same shape as the link view's copy button, with «Маршрут» as its
  accessibility label (owner, 2026-10-17). In the link views it sits next to the copy button,
  which stays; on the creator's card it is the only button

### AC-2 — What it opens
- **When** the button is tapped
- **Then**, if the address contains a link, that link opens — the first one, if there are several
- **Otherwise** Google Maps opens a search for the address:
  `https://www.google.com/maps/search/?api=1&query=<address>`, on every device and in every browser
- It opens outside the app, or in a new tab in a browser; the Google Maps app takes it if it is
  installed

### AC-3 — No address *(required)*
- **Given** a shoot with no address, even if it has a name
- **Then** no «Маршрут» button is shown anywhere

### AC-4 — Language
| UK | EN |
|---|---|
| Маршрут | Directions |

Confirmed by the owner, 2026-10-17. Link views use the reader's language (`ADR-022`).

## Out of scope
- A separate map-link field, a «Google Maps» chip, a dropped pin or saved coordinates — all of the
  first version's ideas, dropped.
- Apple Maps, or a choice of map app.
- Embedded maps, turn-by-turn navigation, travel time.
- Using the venue name in the search.

## Dependencies
`US-018` (the address), `US-007`, `US-010`.

## Open questions
None — the button's look (AC-1) and the English (AC-4) were confirmed by the owner, chat
2026-10-17.
