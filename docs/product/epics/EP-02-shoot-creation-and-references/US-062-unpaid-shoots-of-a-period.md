# US-062 — See the unpaid shoots of a period

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to open the list of shoots that are not paid yet, from «Статистика»**,
so that **I can see who owes me and settle each one without searching the calendar**.

## Context
`US-061` AC-6 puts «{n} зйомок без оплати» under «Очікує оплати». The owner asked to reach those
shoots from it (2026-10-17) and chose **a separate screen** over a filter in «Календар» (which
already has month / week, a selected day and «Показати минулі») and over a bottom sheet (awkward
for a long list and for coming back from a shoot). No mockup — the screen reuses the calendar's
cards.

## Acceptance criteria

### AC-1 — The way in
- **Given** «Статистика» shows «{n} зйомок без оплати» (`US-061` AC-6)
- **When** the creator taps that row
- **Then** «Без оплати» opens for the same period — the month, the year or all time on screen
- **Given** the row says «Усі зйомки оплачені», or nothing
- **Then** it does not respond to a tap
- *Superseded by `US-063` AC-2 (owner, 2026-10-17): the row always opens the list; with nothing
  unpaid it shows AC-5's «Усі зйомки оплачені».*

### AC-2 — Which shoots
- Exactly the ones counted in `US-061` AC-6: shoots **in the period** with a **price** and a
  **balance above zero** — finished or planned. Deleted shoots never (`ADR-014`).

### AC-3 — The screen
- A pushed screen with a back chevron; the title «Без оплати», and under it the period as
  «Статистика» names it, with the sum still owed: «Жовтень 2026 · 9 000 ₴» (owner, 2026-10-17).
- The shoots grouped by date under date headings, **as «Календар» draws them** — the same card:
  time, client, the paid icon (`US-060` AC-5), status, location, crew, delivery deadline.
  **No amount on the cards** — the paid icon already says it (owner, 2026-10-17).
- **Chronological — earliest date first**, so the longest-owed shoot leads (owner, 2026-10-17).

### AC-4 — Opening a shoot and coming back
- **When** the creator taps a card
- **Then** the shoot opens, as from «Календар»
- **When** they come back
- **Then** the list is read again: a shoot marked paid meanwhile (`US-060`) is gone from it

### AC-5 — Nothing left *(edge)*
- **Given** every shoot on the list has been paid
- **Then** the screen says «Усі зйомки оплачені» in place of the list

### AC-6 — Who sees it *(required)*
- Creator only; nothing here reaches a link payload (`ADR-013`). Shoots where the creator is
  crew (`US-009`) are not theirs to be paid for and never appear — «Статистика» does not count
  them either.

## Copy *(owner, 2026-10-17)*
| Where | Українська | English |
|---|---|---|
| Screen title | Без оплати | Unpaid |
| Under it | {period} · {sum} | {period} · {sum} |
| Empty | Усі зйомки оплачені *(as `US-061`)* | All shoots paid |

## Out of scope
- Marking a shoot paid from the list — it is done on the shoot (`US-060`), one tap away.
- Sorting or filtering the list; a list of the paid ones.
- Swipe-to-delete on these cards — «Календар» has it; this list is for settling, not tidying.

## Dependencies
`US-060`, `US-061`, `US-004` (the calendar's cards).

## Open questions
None — answered by the owner, 2026-10-17.
