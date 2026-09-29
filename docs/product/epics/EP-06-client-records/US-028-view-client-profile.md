# US-028 — View a client's profile with contacts, notes, and shoot history

- **Parent epic:** [EP-06 — Client records](EP-06.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **one page per client showing their contacts, my notes about them, and every shoot they
have booked**,
so that **I walk into a repeat shoot already knowing how this person likes to work**.

## Context
New with the design system adopted in `ADR-017`; the screen is specified by its
`client-profile-screen` mockup. `ADR-018` records the schema decision behind it.

Every field on this page is owner-only or better. Contacts are tagged «Бачите лише ви» [only you
see this] and notes «Бачить лише команда» [only the team sees it] — but no mockup shows a crew
screen, so nothing here enters a link payload at all (`ADR-018`, Visibility;
`open-questions.md` item 15).

## Acceptance criteria

### AC-1 — Profile shows identity and totals
- **Given** a logged-in shoot creator viewing a client they have booked
- **When** the profile opens
- **Then** it shows the client's name, a «Клієнт» role chip, and three totals: how many shoots
  they have booked, the month and year of their first shoot, and how many of their shoots are
  finished

### AC-2 — Contacts are marked owner-only
- **Given** the profile is open
- **When** the creator reads the contacts section
- **Then** phone and Instagram are shown, carrying a visible «Бачите лише ви» tag

### AC-3 — Notes persist across shoots
- **Given** a client with notes saved during an earlier shoot
- **When** their profile is opened from a later shoot
- **Then** the same notes are shown, with a visible note that they are kept between shoots

### AC-4 — Shoot history, most recent first
- **Given** a client with more than one shoot
- **When** the creator reads the history section
- **Then** every one of that client's shoots is listed with its date, status and location,
  newest first, and each row opens that shoot

### AC-5 — Soft-deleted shoots are absent
- **Given** a client with a shoot that has been deleted (`US-019`)
- **When** their profile is opened
- **Then** the deleted shoot is absent from the history and is not counted in the totals of AC-1

### AC-6 — Start a shoot from the profile
- **Given** the profile is open
- **When** the creator taps «Нова зйомка з цим клієнтом»
- **Then** the creation form (`US-002`) opens with this client already attached, skipping the
  search in `US-029`

## Out of scope
- Editing the client from this page — the mockup has no edit affordance here; notes and contacts
  are written where they are today, on the shoot.
- Deleting or merging a client (`EP-06` Out of scope).
- Any crew- or client-facing view of this data (`open-questions.md` item 15).

## Dependencies
- `US-029` — a client row has to exist and be attached to a shoot before a profile can show one.
- `US-020` — AC-1's "finished" total reads the shoot status.
- `US-019` — AC-5 depends on the soft-delete filter (`ADR-014`).

## Open questions
None of its own. `ADR-018`'s open question 1 (deleting a client who has shoots) would add an
action to this screen if answered "allow it".
