# US-070 — A shoot has its own currency

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator paid in more than one currency**,
I want **each shoot's price in the currency it is paid in**,
so that **a € shoot and a ₴ shoot both read as what they are**.

## Context
`ADR-027`, from `feedback-log.md` #14 (owner, 2026-10-18). Until now a shoot's amounts took the
account's currency (`US-047`). Mockup: `New Shoot.dc.html`, variant «У полі ціни» (Claude Design,
2026-10-18).

## Acceptance criteria

### AC-1 — The list
- A shoot's currency is one of the five in `US-047` AC-1.

### AC-2 — A new shoot
- **When** the creator opens «Нова зйомка»
- **Then** its currency is the account's currency

### AC-3 — Choosing it
- In «Оплата», on a new shoot and when editing one: the «Ціна» field ends in a button with the
  currency's code and a chevron («UAH ▾»), set off by a divider. «Передплата» shows the symbol only.
- **When** the creator taps the button
- **Then** a sheet opens from the bottom: «Валюта», under it «Для ціни, передплати й залишку», ✕ top
  right; the five currencies as rows — symbol in a circle, name, code, a radio — the current one
  selected; under the list, where the profile's currency comes from (Copy)
- **When** they tap a currency
- **Then** it is chosen and the sheet closes; both fields and «Залишок після зйомки» take its symbol
- The choice is **not remembered** for the next shoot — that one starts in the account's currency
  (AC-2). The mockup's «Запамʼятаємо вибір для наступних зйомок.» is replaced by the line in Copy
  — plain text, not a link (owner, 2026-10-18).

### AC-4 — Changing it on a shoot
- **When** the creator changes the currency of a shoot that has amounts
- **Then** the numbers stay and take the new symbol — no conversion (owner, 2026-10-18)

### AC-5 — Shoots that already exist
- **Given** a shoot created before this story
- **Then** its currency is its account's currency on the day this ships

### AC-6 — Changing the account's currency *(amends `US-047` AC-4)*
- **When** the creator changes the currency in «Валюта»
- **Then** only new shoots start in it; existing shoots keep theirs

### AC-7 — Where it shows
- Every amount of the shoot, written as `US-047` AC-6: the form, the «Оплата» card on the shoot.
  «Статистика» and its lists: `US-071`.
- No mark of the currency on the calendar or home cards — they show no amount (owner, 2026-10-18).

### AC-8 — Who sees it *(required)*
- Creator only; link views show no money (unchanged, `ADR-013`).

## Copy *(owner, 2026-10-18)*
| Where | Українська | English |
|---|---|---|
| Price field button (accessibility) | Змінити валюту | Change currency |
| Sheet title | Валюта | Currency |
| Under it | Для ціни, передплати й залишку | For the price, prepayment and balance |
| Sheet, currency names | as `US-047` AC-5a | as `US-047` AC-5a |
| Sheet, under the list | Нові зйомки створюються у валюті з профілю. Змінити її можна в профілі → «Валюта». | New shoots start in your profile's currency. You can change it in Profile → Currency. |
| «Валюта» screen, under the list *(replaces `US-047` AC-5a)* | Нові зйомки створюються в цій валюті — у кожній її можна змінити в «Оплаті». Створені раніше зйомки зберігають свою. | New shoots start in this currency — you can change it on each shoot under “Payment”. Earlier shoots keep theirs. |

## Out of scope
- Converting between currencies; a total in one currency.
- Currencies beyond the five (owner, 2026-10-18: «поки так»).

## Dependencies
`US-047`, `US-002`, `US-018`, `US-060`.

## Open questions
None — answered by the owner, 2026-10-18.
