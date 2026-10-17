# US-060 — Mark a shoot as paid

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to mark a shoot as paid in one tap, and see on the calendar which shoots are paid**,
so that **I know who still owes me without opening every shoot**.

## Context
`02-product/feedback-log.md` #12 (a photographer, 2026-10-16): after a shoot the money had come
in, yet nothing said so — «було б прикольно … кнопочка, що оплата пройшла».

The model already knows the answer: `prepayment` is **how much has been paid so far**, so a shoot
whose prepayment equals its price is paid, and «Статистика» already counts it as income and not
as «Очікує оплати». What is missing is a quick way to record it (today: edit the shoot and type
the price into «Передоплата») and anywhere outside the shoot that shows it. The «Оплачено» chip
on the «Оплата» card was removed on 2026-09-06.

**No new column.** "Paid" is derived: a price is set and nothing is outstanding.

Owner decisions, chat 2026-10-16: the button on the «Оплата» card only; for any shoot, past or
future, with a price and something outstanding; paid shown on the card and on the calendar, as
`Calendar.dc.html` draws it (`paidView` = «Іконка оплати з галочкою»).

## Acceptance criteria

### AC-1 — The button
- **Given** a shoot with a price and a balance above zero — before or after its date, with or
  without a prepayment
- **Then** the «Оплата» card on the shoot screen ends with «Оплату отримано», shaped like
  «Позначити як передано клієнту» at the foot of the deadline card (`US-042`)

### AC-2 — Marking it paid
- **When** the creator taps it
- **Then** the prepayment becomes the price, and the shoot is paid everywhere at once: the card
  (AC-4), the calendar (AC-5) and «Статистика», which counts it as income and no longer as owed
- **And** a toast says so, with «Скасувати», which puts the prepayment back to what it was

### AC-2a — Banknotes across the screen *(owner, 2026-10-17)*
- **When** the shoot has been marked paid
- **Then** about two dozen 💵 are thrown up from the button across the whole screen, spinning, and
  fall back and fade within about two seconds
- **And** they do not block a tap — the toast's «Скасувати» works underneath them
- **Given** the phone asks for reduced motion
- **Then** there are no banknotes; the haptic and the toast still say it
- A rain of notes from the top edge was tried beside this on a device and not kept.

### AC-3 — Becoming unpaid again *(edge)*
- **Given** a paid shoot
- **When** its price is raised or its prepayment lowered on the edit form
- **Then** it is not paid any more, and the button and the warning come back — "paid" is never
  stored on its own

### AC-4 — The card says it is paid
- **Given** a paid shoot
- **Then** the «Залишок» figure on the «Оплата» card reads «Оплачено» with a check, in green,
  instead of «0 ₴», and there is no button

### AC-5 — The calendar says it
- **Given** a shoot with a price, in the calendar's list
- **Then** a banknote icon sits right after the client's name:
  - **paid** — in colour, with a green check badge; labelled «Оплачено»
  - **not paid** (nothing or only part of it received, past or future) — translucent, with an
    amber «!» badge; labelled «Не оплачено»
- The banknote is the 💵 emoji, as the mockup draws it, in both states. The mockup also greys the
  unpaid one; React Native cannot grey an emoji, so it is only translucent (owner, 2026-10-17 —
  a drawn vector icon was tried first and looked unlike the mockup)

### AC-6 — No price, nothing to say *(edge)*
- **Given** a shoot without a price
- **Then** there is no button, no icon on the calendar, and the card is as today

### AC-7 — Who sees it *(required)*
- Creator only. Nothing here reaches a link payload — the crew's or the client's (`ADR-013`).
- Without access the account is in view mode (`US-052`): the icon and «Оплачено» show, the
  button does not act, like every other edit.

## Copy *(owner, 2026-10-16)*
| Where | Українська | English |
|---|---|---|
| Button | Оплату отримано | Payment received |
| Toast | Позначено як оплачено | Marked as paid |
| «Залишок» when paid | Оплачено | Paid |
| Calendar icon, paid | Оплачено | Paid |
| Calendar icon, not paid | Не оплачено | Not paid |

## Out of scope
- Marking it paid anywhere but the shoot's «Оплата» card — the calendar shows, it does not act.
- A list of unpaid shoots, or reaching them from «Статистика».
- Recording when, how or in what currency the money came (`feedback-log.md` #14).
- The «Оплачено» chip removed on 2026-09-06 — not brought back.

## Dependencies
`US-002` (price and prepayment on the form), `US-042` (the button's shape), `US-052`.

## Open questions
None — the icon and the copy were confirmed by the owner, 2026-10-16.
