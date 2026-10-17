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

### AC-1c — «Передано» *(owner, 2026-10-17)*
- A row **right under «В обробці»**: «Передано», with the number of shoots on the right, in the
  ordinary colour.
- It counts the shoots in the period **marked delivered** — exactly the shoots whose calendar
  card lights «Передано» in its «Знято · Обробка · Передано» steps (`US-042` AC-5, AC-6).
- No line under the label.

### AC-1a — «Прострочено» *(owner, 2026-10-17)*
- A row **right under «Передано»**: «Прострочено», with the number of shoots on the right —
  **red** while above zero, the ordinary colour at zero.
- It counts the shoots in the period that are **finished, have a delivery deadline that has
  passed and are not marked delivered** — exactly the shoots whose calendar card shows
  «Прострочено» (`US-042` AC-4). Every one of them is also «В обробці».
- No line under the label.

### AC-1b — «Очікує оплати» shows a count, and the sum under it *(owner, 2026-10-17)*
- On the right, **the number of unpaid shoots** instead of the sum — amber while above zero.
- Under the label, **«На суму {sum}»**, amber, instead of «{n} зйомок без оплати».
- When every shoot with a price is paid: «0» on the right and «Усі зйомки оплачені», green,
  under the label — as before. With no priced shoot in the period: «0», nothing under it.
- Amends `US-061` AC-6. The list's title line keeps the sum (`US-062` AC-3).

### AC-2 — Which counts open a list
| Tapped | The list | Under the title |
|---|---|---|
| «Проведено» | finished shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |
| «Заплановано» | planned shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |
| «Очікує оплати» (`US-062`) | unpaid shoots in the period | {period} · {sum} — unchanged |
| «В обробці» | AC-1's shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |
| «Передано» | AC-1c's shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |
| «Прострочено» | AC-1a's shoots in the period | {period} · {n} {зйомка / зйомки / зйомок} |

- Each is the same list as `US-062`'s: the calendar's cards under date headings,
  **chronological, earliest first**, read again on coming back.
- **Every one of them opens its list, zero included** — a zero opens an empty list, which says
  so (AC-4) (owner, 2026-10-17; it was «a zero does not respond»).

### AC-2a — They look tappable *(owner, 2026-10-17)*
- Each of the seven carries a **chevron ›**, always: on the «Очікує оплати», «В обробці»,
  «Передано» and «Прострочено» rows after the number; on the «Проведено» and «Заплановано» cards top right,
  level with the label. The same chevron as the profile's «Сповіщення» and «Валюта» rows —
  size and muted colour.

### AC-2b — Two cards under «Проведено» and «Заплановано» *(owner, 2026-10-17)*
- First, the rows that open a list: «Очікує оплати», «В обробці», «Передано», «Прострочено».
- Under it, a second card with the plain figures: «Середній чек», «Годин на зйомках».

### AC-3 — «Заплановано» no longer opens «Календар»
- Replaces `US-061` AC-4's tap. «Календар» is not opened from «Статистика» any more.

### AC-4 — An empty list *(edge)* — `Statistics Empty States.dc.html` (owner, 2026-10-17)
- **Given** a list with nothing in it — opened from a zero, or emptied while it was open (a
  shoot paid, delivered, deleted or rescheduled, or its delivery undone)
- **Then** in place of the cards, one card: a large outline icon, a title, a line under it, and
  for two of them a «+ Нова зйомка» button that opens the new shoot form (view mode: the
  paywall, `US-052`):

| List | Icon | Title | Line | Button |
|---|---|---|---|---|
| Проведено | camera | Тут з’являться відзняті зйомки | Щойно зйомка відбудеться, вона потрапить сюди разом із годинами й доходом. | Нова зйомка |
| Заплановано | calendar with + | Поки нічого не заплановано | Додайте зйомку, і вона з’явиться тут і в календарі. | Нова зйомка |
| Без оплати | payment card | Усі розрахувалися | Кожна зйомка оплачена. Нікому не треба нагадувати. | — |
| В обробці | frame with ✓ | Черга обробки порожня | Усі фото вже в клієнтів. Можна видихнути або взятися за нову зйомку. | — |
| Передано | paper plane | Ще нічого не передано | Коли надішлете клієнту готові файли, зйомка з’явиться тут. | — |
| Прострочено | clock | Жодного зірваного дедлайну | Усі файли клієнти отримали вчасно. Так тримати. | — |

- The same words for a period with no shoots at all, though they then claim more than is true
  (owner, 2026-10-17: kept simple).
- No date is filled into the new shoot form.

### AC-5 — Who sees it *(required)*
- As `US-062` AC-6: creator only, their own shoots, never a link payload.

## Copy *(owner, 2026-10-17)*
| Where | Українська | English |
|---|---|---|
| Row, and its list's title | В обробці | Editing |
| List title | Проведено | Done |
| List title | Заплановано | Planned |
| Under a title | {period} · {n} зйомка / зйомки / зйомок | {period} · {n} shoot / shoots |
| Empty, done | Тут з’являться відзняті зйомки · Щойно зйомка відбудеться, вона потрапить сюди разом із годинами й доходом. | Your finished shoots will appear here · Once a shoot has happened, it lands here with its hours and income. |
| Empty, planned | Поки нічого не заплановано · Додайте зйомку, і вона з’явиться тут і в календарі. | Nothing planned yet · Add a shoot and it will appear here and in the calendar. |
| Empty, unpaid | Усі розрахувалися · Кожна зйомка оплачена. Нікому не треба нагадувати. | Everyone has paid · Every shoot is paid. No one needs a reminder. |
| Empty, editing | Черга обробки порожня · Усі фото вже в клієнтів. Можна видихнути або взятися за нову зйомку. | Nothing left to edit · All photos are with your clients. Take a breath, or start a new shoot. |
| Row, and its list's title | Передано *(as `US-042`)* | Delivered *(as `US-042`)* |
| Empty, delivered | Ще нічого не передано · Коли надішлете клієнту готові файли, зйомка з’явиться тут. | Nothing delivered yet · Once you send a client their finished files, the shoot will appear here. |
| Row, and its list's title | Прострочено *(as `US-042`)* | Overdue *(as `US-042`)* |
| Empty, overdue | Жодного зірваного дедлайну · Усі файли клієнти отримали вчасно. Так тримати. | No missed deadlines · Every client got their files on time. Keep it up. |
| Empty-state button | Нова зйомка *(as the calendar)* | New shoot |
| Under «Очікує оплати» | На суму {sum} | Totalling {sum} |

## Out of scope
- A line under «В обробці», «Передано» or «Прострочено».
- Marking a shoot delivered from the list — it is done on the shoot (`US-042`).
- «Дохід», «Середній чек» and «Годин на зйомках» opening anything.

## Dependencies
`US-042`, `US-061`, `US-062`.

## Open questions
None — the copy was confirmed by the owner, 2026-10-17.
