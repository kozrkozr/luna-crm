# US-061 — Statistics for any period, with the planned shoots

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** L

## Story
As a **shoot creator**,
I want **to see the statistics of any month or year, planned shoots included**,
so that **I know what I earned, what I am still owed and what is coming — not only for this month**.

## Context
«Статистика» was built on 2026-09-07 from `Statistics.dc.html` with no story of its own, on three
owner answers: «Дохід» is money received; **only finished shoots count**; **only the current
month or year**. This story is the first to specify the screen, and it **reverses the last two**
(owner, 2026-10-17), from the updated `Statistics.dc.html` (Claude Design, 2026-10-17) and
`feedback-log.md` #12.

**The split it rests on** (owner, 2026-10-17): money is counted over **every shoot in the period
that has a price**, finished or planned — money received is income whenever the shoot is, and
«Дохід» and «Очікує оплати» divide the same shoots between them. Work — «Проведено» and the
hours — is counted over **finished** shoots only.

A shoot is **finished** once it has ended and **planned** until then — today's shoot in progress
is planned (`US-020`, derived status). Deleted shoots never count (`ADR-014`). A shoot's period is
its date.

## Acceptance criteria

### AC-1 — Choosing the period
- «Місяць · Рік · Весь час», as today.
- **Given** «Місяць» or «Рік»
- **Then** under it: ‹ the period «Жовтень 2026» / «2026 рік» ▾ ›. The arrows step one month or
  one year, **with no limit either way** — an empty period simply shows zeros (owner, 2026-10-17)
- **And** the screen's header line names the same period
- **Given** «Весь час»
- **Then** there is no stepper, and the line reads «З {month} {year}», the month of the earliest
  shoot counted

### AC-2 — Picking a period directly
- **When** the creator taps the period's name
- **Then** a sheet opens from the bottom:
  - **«Місяць»** — «Оберіть місяць», a year with ‹ › to change it, and the twelve months as a
    3 × 4 grid
  - **«Рік»** — «Оберіть рік», twelve years as a 3 × 4 grid, with ‹ › to the previous or next
    twelve
  - the chosen one filled, the current one outlined; «Поточний місяць» / «Поточний рік» under the
    grid; «Закрити» top right
- **When** they tap a month or a year
- **Then** it is chosen and the sheet closes

### AC-3 — «Дохід»
- Full width, as today: the prepayments of **every shoot in the period** — finished and planned.

### AC-4 — «Проведено» and «Заплановано», side by side
- **«Проведено»** — the number of **finished** shoots in the period, its noun beside it
  («зйомка / зйомки / зйомок»), and under it their hours («54 години»).
- **«Заплановано»** — the number of **planned** shoots in the period, its noun beside it, and under
  it «Найближча {date}», the earliest of them, or «Немає запланованих». A past period has none.
- *Superseded by `US-063` AC-3 (owner, 2026-10-17): the tap now opens the planned shoots' list.*
- **When** the creator taps «Заплановано»
- **Then** «Календар» opens:
  - for «Місяць» — on that month, no day selected
  - for «Рік» and «Весь час» — with the day of the earliest planned shoot selected
- **Given** nothing is planned in the period
- **Then** «Заплановано» does not respond to a tap

### AC-5 — «Середній чек»
- The average **price** of every shoot in the period that has one, finished or planned. Shoots
  without a price are left out. «—» when there are none.

### AC-6 — «Очікує оплати»
- The balance — price less prepayment — summed over every shoot in the period that has a price,
  finished or planned.
- Under the label:
  - «{n} {зйомка / зйомки / зйомок} без оплати», amber — the shoots with a price and a balance
    above zero; the sum is amber too
  - «Усі зйомки оплачені», green — when there are shoots with a price and none owes; the sum in
    the ordinary colour
  - nothing — when no shoot in the period has a price

### AC-7 — «Годин на зйомках»
- Unchanged: the hours of the **finished** shoots — the same figure as under «Проведено», kept in
  both places (owner, 2026-10-17).

### AC-8 — Who sees it *(required)*
- Creator only, as today; nothing here reaches a link payload (`ADR-013`).

## Copy *(owner, 2026-10-17)*
| Where | Українська | English |
|---|---|---|
| Card | Проведено *(was «Проведено зйомок»)* | Done |
| Hours under it | {n} година / години / годин | {n} hour / hours |
| Card | Заплановано | Planned |
| Under it | Найближча {date} | Next on {date} |
| Under it, none | Немає запланованих | Nothing planned |
| Under «Очікує оплати» | {n} зйомка / зйомки / зйомок без оплати | {n} unpaid shoot / shoots |
| Under «Очікує оплати», all paid | Усі зйомки оплачені | All shoots paid |
| Stepper arrows (accessibility) | Попередній період · Наступний період | Previous period · Next period |
| Period name (accessibility) | Обрати період | Choose a period |
| Sheet title | Оберіть місяць · Оберіть рік | Choose a month · Choose a year |
| Sheet | Закрити | Close |
| Sheet button | Поточний місяць · Поточний рік | This month · This year |

## Out of scope
- A sum of what the planned shoots will bring — «Заплановано» counts shoots, not money (owner,
  2026-10-17).
- A custom range of dates; comparing periods; charts.
- A range selection in «Календар» — it opens on a month or on one day.

## Dependencies
`US-020` (finished / planned), `US-030` (hours), `US-047` (currency), `US-060` (the prepayment a
paid shoot carries), `US-041` AC-11 (the calendar opening on a day).

## Open questions
None — the copy was confirmed by the owner, 2026-10-17.
