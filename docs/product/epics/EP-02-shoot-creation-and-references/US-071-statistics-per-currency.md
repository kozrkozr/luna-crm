# US-071 — «Статистика» per currency

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator paid in more than one currency**,
I want **«Статистика» to show my money in each currency apart**,
so that **no figure adds hryvnia to dollars**.

## Context
`ADR-027` decisions 5–6; `Statistics Currency Variants.dc.html` (Claude Design, 2026-10-18) — the
screen with one to five currencies. Amends `US-061` AC-3, AC-5, AC-6, `US-062` AC-3 and
`US-063` AC-1b, AC-2b. What each figure counts is unchanged; only how money is split and drawn.

## Acceptance criteria

### AC-1 — Which currencies, in what order
- A money figure lists **only the currencies that have something in it** for the period.
- **The account's currency first**, then the rest in `US-047` AC-1's order (owner, 2026-10-18).

### AC-2 — «Дохід» *(amends `US-061` AC-3)*
- **Given** one currency has income in the period
- **Then** the card is as today: one large figure
- **Given** no currency has
- **Then** «0» in the account's currency, as today (owner, 2026-10-18)
- **Given** two or more have
- **Then** one row per currency: the sum and its symbol, and on the right «{n} зйомка / зйомки /
  зйомок» — the shoots of that currency in the period **with a prepayment above zero**, i.e. the
  ones whose money is in the sum (owner, 2026-10-18)

### AC-3 — «Очікує оплати» *(amends `US-061` AC-6, `US-063` AC-1b, AC-2b)*
- Its own card between «Дохід» and «Проведено» / «Заплановано», as the mockup draws it.
- On the right of the label, **the number of unpaid shoots over all currencies**, amber while above
  zero, and a chevron.
- Under the label:
  - one currency owed — the sum in amber
  - two or more — one row per currency: the sum, and on the right that currency's unpaid shoots
    «{n} зйомка / зйомки / зйомок» (owner, 2026-10-18: «як у макеті»)
  - nothing owed — «Усі зйомки оплачені», green, as today; no new text for an empty period
    (owner, 2026-10-18)
- A tap opens «Без оплати» (`US-062`), as today.

### AC-4 — «Середній чек» is gone *(supersedes `US-061` AC-5)*
- The last card holds «Годин на зйомках» alone.

### AC-5 — Counts stay single
- «Проведено», «Заплановано», the hours, «В обробці», «Передано», «Прострочено» count the shoots of
  every currency together, unchanged.

### AC-6 — «Без оплати» *(amends `US-062` AC-3)*
- The line under the title gives the sum owed **per currency**, in AC-1's order, joined by « · »:
  «Жовтень 2026 · 9 000 ₴ · $400» (owner, 2026-10-18).

### AC-7 — Who sees it *(required)*
- Creator only, as `US-061` AC-8.

## Copy
No new strings: the row counts reuse «зйомка / зйомки / зйомок» (`US-061`).

## Out of scope
- A total converted into one currency (`ADR-027`).
- Filtering «Статистика» by currency — drawn in the mockup's file but not part of this (owner,
  2026-10-18).

## Dependencies
`US-070`, `US-061`, `US-062`, `US-063`.

## Open questions
None — answered by the owner, 2026-10-18.
