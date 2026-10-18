# ADR-027 — A currency on each shoot, never summed across currencies

- **Date:** 2026-10-18
- **Status:** accepted
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-18), agent (recommendation)

## Context
`US-047` gives the account one currency (UAH, USD, EUR, PLN, CZK) and every amount takes its
symbol; a currency per shoot and conversion were out of scope. Two users have since asked to enter
a price in the currency it was paid in (`feedback-log.md` #14; owner, 2026-10-18: «два відгуки»
[two pieces of feedback]) — a shoot in the EU paid in €, one in Ukraine in ₴. Once shoots differ,
«Статистика» can no longer add their money into one figure.

## Options considered
### Option A — a currency on each shoot, statistics per currency, no conversion
- **Pros:** no exchange-rate source, no rate history, no cost; every figure is a sum the
  photographer actually received
- **Cons:** «Статистика» shows up to five sums instead of one; no single total

### Option B — a currency on each shoot, converted into the account's currency
- **Pros:** one «Дохід», one «Очікує оплати»
- **Cons:** needs a rate service and the rate on the day each payment was received, which the app
  does not record; a converted total is an estimate, not money received

### Option C — keep one currency per account
- **Pros:** nothing to build
- **Cons:** the feedback stays unanswered

## Decision
Option A (owner, 2026-10-18):
1. A shoot has its own currency, one of the five in `US-047` AC-1.
2. A new shoot starts in the account's currency; the last shoot's choice is not remembered (owner,
   2026-10-18, over the mockup's «Запамʼятаємо вибір»).
3. Every shoot that exists when this ships takes its account's currency at that moment. From then
   on, changing the account's currency changes only what new shoots start in — it **reverses
   `US-047` AC-4**, where every amount took the new symbol.
4. Changing a shoot's currency keeps its numbers; nothing is converted.
5. «Статистика» never adds amounts of different currencies: money figures are shown per currency;
   counts of shoots and hours are summed over all of them (`US-071`).
6. «Середній чек» is removed from «Статистика» (owner, 2026-10-18).

## Consequences
- **Accepted cost:** no total across currencies anywhere.
- **Now easier:** a price reads as what was paid; the account's currency becomes only a default.
- **Now harder:** the «Валюта» screen's note «Суми не перераховуються — змінюється лише символ.»
  (`US-047` AC-5a) is no longer true; it is replaced by `US-070`'s copy (owner, 2026-10-18).
- **Revisit when:** users ask for a converted total, or for a currency beyond the five.

## Open questions
None — the form (`New Shoot.dc.html`, «У полі ціни») and the copy were settled by the owner, 2026-10-18.
