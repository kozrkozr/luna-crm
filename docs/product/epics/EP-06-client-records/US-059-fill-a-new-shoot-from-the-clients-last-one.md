# US-059 — Fill a new shoot from the client's last one

- **Parent epic:** [EP-06 — Client records](EP-06.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator** booking a client I have shot before,
I want **to fill the new shoot from that client's last one**,
so that **a repeat shoot only needs its date and anything that changed**.

## Context
`02-product/feedback-log.md` #15 (a photographer, 2026-10-16): «ця зйомка повторюється, і ти
просто добавляєш той же самий текст … але змінюєш тільки саме час і дату, і оплату». The owner
placed it on the client field (2026-10-16): once `US-029` has linked a client, the form offers
their last shoot. Fields, name and placement are the owner's, chat 2026-10-16.

## Acceptance criteria

### AC-1 — Offered once a client is linked
- **Given** the **new** shoot form, with a client linked — picked from the search (`US-029`
  AC-3) or accepted from the phone match (`US-029` AC-6)
- **When** that client has at least one shoot that is not deleted
- **Then** a card «Заповнити з останньої зйомки» sits under the client, with a line naming that
  shoot: its date, its time, and its location name when it has one
- **And** «Глянути профіль» moves under the card

### AC-2 — Which shoot is the last one
- The client's shoot with the **latest date** — past or future — among those not deleted
  (`ADR-014`). Of two on the same date, the one that starts later.

### AC-3 — Not offered *(edge)*
- **Given** no client is linked, the linked client has no shoot that is not deleted, or the form
  is **editing** a shoot
- **Then** there is no card

### AC-4 — What it fills
- **When** the creator taps the card
- **Then** these are taken from the last shoot: **start and end time**, **location name**,
  **address**, **location details**, **price**
- **And** these are **never** taken: the date, the prepayment, both notes (the creator's and
  the client's), the crew, references, materials, the location image or video, the delivery date

### AC-5 — Only empty fields *(required)*
- **Given** some of AC-4's fields already hold something
- **When** the creator taps the card
- **Then** only the empty ones are filled; nothing typed is overwritten
- Start and end count as one field: filled only when neither is set.

### AC-6 — After filling
- **Then** the card disappears and a toast says which shoot was used (Copy)
- **And** the date is still to be chosen — save is blocked without it, as before (`US-002` AC-2)

### AC-7 — Unlinking afterwards
- **Given** the form was filled from the last shoot
- **When** the creator unlinks the client (×)
- **Then** the client's contacts are cleared, as today; the filled shoot fields stay as they are —
  they belong to the new shoot once filled (owner, 2026-10-16)

## Copy *(owner, 2026-10-16)*
| Where | Українська | English |
|---|---|---|
| Card | Заповнити з останньої зйомки | Fill from the last shoot |
| Line under it | {date} · {start}–{end} · {location name} | {date} · {start}–{end} · {location name} |
| Toast | Заповнено із зйомки {date} | Filled from the shoot on {date} |

`{date}` is written as the shoot list writes it.

## Out of scope
- Copying the crew or references — the owner, 2026-10-16: not on the new shoot form, and no sense
  in carrying them over.
- Choosing a shoot other than the last one.
- Duplicating a shoot from its own screen.

## Dependencies
`US-029` (the linked client), `US-002`.

## Open questions
None — the toast and AC-7 were confirmed by the owner, 2026-10-16.
