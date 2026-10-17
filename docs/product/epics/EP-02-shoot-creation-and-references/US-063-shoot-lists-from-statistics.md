# US-063 — Open the shoots behind each figure in «Статистика»

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to open the shoots behind «Проведено», «Заплановано» and a new «В обробці»**,
so that **every count on «Статистика» leads to the shoots it counts**.

## Context
`US-062` gave «{n} зйомок без оплати» its own list. The owner asked for the same list behind the
other counts, and for a new count of the shoots still being edited (2026-10-17). It is the
`US-062` screen with a different selection; everything `US-062` says about it holds unless
changed here.

**This changes `US-061` AC-4:** «Заплановано» opened «Календар»; it now opens its list.

## Acceptance criteria

### AC-1 — «В обробці»
- A new row on «Статистика»'s second card, **right under «Очікує оплати»**: «В обробці», with
  the number of shoots on the right.
- It counts the shoots in the period that are **finished, have a delivery deadline and are not
  marked delivered** — exactly the shoots whose calendar card lights «Обробка» in its
  «Знято · Обробка · Передано» steps (`US-042` AC-5, AC-10) (owner, 2026-10-17).
- No line under the label.

### AC-2 — Which counts open a list
| Tapped | The list | Under the title |
|---|---|---|
| «Проведено» | finished shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |
| «Заплановано» | planned shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |
| «Очікує оплати» (`US-062`) | unpaid shoots in the period | {period} · {sum} — unchanged |
| «В обробці» | AC-1's shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |

- Each is the same list as `US-062`'s: the calendar's cards under date headings,
  **chronological, earliest first**, read again on coming back.
- **Given** a count is zero
- **Then** its card or row does not respond to a tap

### AC-3 — «Заплановано» no longer opens «Календар»
- Replaces `US-061` AC-4's tap. «Календар» is not opened from «Статистика» any more.

### AC-4 — An emptied list *(edge)*
- **Given** a list emptied while it was open — a shoot delivered, deleted or rescheduled
- **Then** it says, in place of the cards:
  - «Проведено» — «Немає проведених зйомок»
  - «Заплановано» — «Немає запланованих» (as `US-061`)
  - «В обробці» — «Усе передано клієнтам»

### AC-5 — Who sees it *(required)*
- As `US-062` AC-6: creator only, their own shoots, never a link payload.

## Copy *(owner, 2026-10-17)*
| Where | Українська | English |
|---|---|---|
| Row, and its list's title | В обробці | Editing |
| List title | Проведено | Done |
| List title | Заплановано | Planned |
| Under a title | {period} · {n} зйомка / зйомки / зйомок | {period} · {n} shoot / shoots |
| Empty, done | Немає проведених зйомок | No shoots done |
| Empty, editing | Усе передано клієнтам | Everything delivered |

## Out of scope
- An overdue count or any other line under «В обробці».
- Marking a shoot delivered from the list — it is done on the shoot (`US-042`).
- «Дохід», «Середній чек» and «Годин на зйомках» opening anything.

## Dependencies
`US-042`, `US-061`, `US-062`.

## Open questions
None — the copy was confirmed by the owner, 2026-10-17.
