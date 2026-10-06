# US-047 — An account has a currency

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **photographer working outside Ukraine**,
I want **my prices in the currency I am paid in**,
so that **a shoot's price, prepayment and my income read as what they are**.

## Context
`ADR-022` decision 6, owner 2026-10-06. Money is whole hryvnia today, and ₴ is drawn on the shoot
form, the shoot's «Оплата» card and «Статистика».

## Acceptance criteria

### AC-1 — The list
- An account's currency is one of **UAH, USD, EUR, PLN, CZK**.

### AC-2 — A new account
- **When** someone registers
- **Then** the currency is set from the phone's region: Poland → PLN; Czechia → CZK; the US → USD;
  any other EU country → EUR; Ukraine and everywhere else → UAH

### AC-3 — Existing accounts
- **Given** an account registered before this story
- **Then** its currency is UAH

### AC-4 — Changing it
- **Given** the profile's «Налаштування» section
- **Then** a «Валюта» row sits right under «Мова застосунку», showing the current currency on the
  right («₴ UAH») and a chevron, drawn like the «Сповіщення» row
- **When** the creator taps it
- **Then** a separate «Валюта» screen opens (as «Сповіщення» does): the five currencies as rows —
  symbol, name, code — the current one ticked, and under the list «Суми не перераховуються —
  змінюється лише символ.»
- **When** they tap another currency
- **Then** it is saved at once and ticked; there is no save button (owner, 2026-10-06)
- **When** they change it
- **Then** every amount already entered keeps its number and takes the new symbol — no conversion
  (12 000 ₴ becomes 12 000 zł)

### AC-5 — Where it shows
- Every amount the app displays or takes: the price and prepayment fields, the «Оплата» card,
  every figure in «Статистика». Amounts stay whole numbers.
- Link views show no money (unchanged).

### AC-5a — Copy (owner, 2026-10-06)
| Where | UK | EN |
|---|---|---|
| Profile row and screen title | Валюта | Currency |
| UAH | Гривня | Ukrainian hryvnia |
| USD | Долар США | US dollar |
| EUR | Євро | Euro |
| PLN | Польський злотий | Polish złoty |
| CZK | Чеська крона | Czech koruna |
| Under the list | Суми не перераховуються — змінюється лише символ. | Amounts are not converted — only the symbol changes. |

### AC-6 — How an amount is written
| Currency | Written |
|---|---|
| UAH | 12 000 ₴ |
| PLN | 12 000 zł |
| CZK | 12 000 Kč |
| EUR | 12 000 € |
| USD | $12,000 — symbol first, comma between thousands |

(owner, 2026-10-06)

## Out of scope
- A currency per shoot; converting between currencies.

## Dependencies
`US-016`, `US-045`.

## Open questions
None — the screen and its copy were confirmed by the owner, chat 2026-10-06.
