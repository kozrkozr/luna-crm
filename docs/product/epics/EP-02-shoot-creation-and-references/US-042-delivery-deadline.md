# US-042 — Set a delivery deadline for a shoot

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **an optional date by which I owe the client the finished files, and a mark once I've delivered them**,
so that **I can see at a glance which finished shoots are still waiting on me and which are late**.

## Context
Beta feedback — a tester asked for it, relayed by the owner in chat, 2026-10-06. Every decision
below is the owner's, same chat.

Design: the «Дедлайн здачі» section of the «Матеріали» tab in `Shoot Detail v3.dc.html` (Claude
Design, «Copy of Shoot Management Call Sheet»), with its `deadline` states «Не встановлено»,
«Встановлено», «Скоро», «Прострочено», «Передано». Only that section is in scope — nothing else
on the canvas.

"Finished" below is the status as the app derives it: a shoot is «Завершена» once its end time
has passed (`US-020`; owner, 2026-09-04 — `US-020` AC-1's manual control is retired in the build).

## Acceptance criteria

### AC-1 — Optional, and the creator's only
- **Given** a shoot
- **Then** it has no delivery deadline unless the creator sets one
- **And** only the shoot creator ever sees the deadline or the delivered mark — not a crew member
  or the client, in a link view or in the app

### AC-2 — No deadline yet
- **Given** a shoot without a deadline
- **When** the creator opens the «Матеріали» tab
- **Then** the «Файли» section starts with a dashed tile «Додати дедлайн здачі», captioned
  «Необов'язково · з'явиться в календарі після зйомки»
- **When** they tap it
- **Then** the editor (AC-3) opens

### AC-3 — The editor
- Title «Дедлайн здачі файлів», caption «Відлік від дня зйомки. Дата з'явиться на картці
  завершеної зйомки в календарі.»
- Four quick choices **+3, +7, +14, +30** days from the shoot's date, each showing the date it
  gives. The selected one is highlighted.
- «Або оберіть дату» — a date picker that allows **no date before the shoot's date**.
- Under it, the chosen date relative to the shoot: «N днів після зйомки», or «У день зйомки».
- With no deadline yet, the editor opens on **shoot date + 7**; otherwise on the current deadline.
- «Готово» saves and shows the toast «Дедлайн здачі — 16 вересня».
- «Скасувати» closes the editor without saving.
- A delete button (bin icon) is shown **only when a deadline exists** (AC-7).

### AC-4 — A deadline is set
- **Given** a shoot with a deadline
- **Then** the section shows a card: «Дедлайн здачі», the date as «до 16 вересня», and a chip
  relative to today:

| Days left | Chip | Tone |
|---|---|---|
| 3 or more | «Через N днів» | neutral |
| 2 | «Через 2 дні» | warning |
| 1 | «Завтра» | warning |
| 0 | «Сьогодні» | warning |
| below 0 | «Прострочено на N днів» | danger — the card's border too |
| delivered (AC-6) | «Передано» | success, whatever the date |

- A pencil button opens the editor (AC-3) on the current deadline.
- Days are counted on the phone's calendar, as every other date in the app is (`US-030`).

### AC-5 — Progress
- The card shows three steps: «Знято» · «Обробка» · «Передано».

| The shoot | Знято | Обробка | Передано |
|---|---|---|---|
| not finished | — | — | — |
| finished | ● | ● *current* | — |
| delivered (AC-6) | ● | ● | ● *current* |

- Nothing else moves the steps — in particular, not the raw-files or finished-photos links.

### AC-6 — Mark as delivered
- **Given** a **finished** shoot with a deadline, not yet delivered
- **Then** the card ends with «Позначити як передано клієнту»
- **When** the creator taps it
- **Then** the shoot is marked delivered, and the toast «Позначено як передано клієнту» offers an
  undo
- The row is not shown on a shoot that is not finished, or that is already delivered.
- Undoing the toast is the only way to take the mark back.

### AC-7 — Delete the deadline
- **When** the creator taps the bin in the editor
- **Then** the deadline is removed **together with the delivered mark**, the section returns to
  the tile (AC-2), and the toast «Дедлайн видалено» offers an undo that restores both

### AC-8 — The deadline follows the shoot's date
- **Given** a shoot with a deadline N days after its date
- **When** the shoot's date is changed (`US-018`)
- **Then** the deadline moves to the new date + N days — by the same number of days, in either
  direction

### AC-9 — Deleted shoots
- **Given** a deleted shoot (`US-019`)
- **Then** its deadline is shown nowhere (`ADR-014`)

### AC-10 — The calendar card
*Specified 2026-10-06 from `Calendar.dc.html`, `filesView` «Кроки з іконкою» (owner).*

- **Given** a **finished** shoot with a deadline, on its card in the calendar's list
- **Then** the card ends with a block under a divider: a file icon, the three steps of AC-5 —
  computed exactly as on «Матеріали» — with their names underneath, and a label on the right:

| State | Label | Tone |
|---|---|---|
| delivered | the deadline's date, «15 вересня» | success |
| overdue | «Прострочено» | danger |
| due today · tomorrow | «Сьогодні» · «Завтра» | warning |
| 2 days left | «до 21 вересня» | warning |
| 3 or more | «до 21 вересня» | neutral |

- The label is **not** the «Матеріали» chip: a date rather than «Через N днів», and «Прострочено»
  without the count — as drawn (owner, 2026-10-06).
- A shoot that is not finished shows no block, with a deadline or without one.
- Finished shoots sit behind «Показати минулі» unless they ended today; the block appears wherever
  the card does, and that is accepted (owner, 2026-10-06).
- Only the creator's own shoots — a crew member's schedule rows (`US-009`) carry no deadline.

### AC-11 — Language
- **Given** a creator who switched the app to English (`US-014`, `US-015`)
- **Then** the section is in English (owner, 2026-10-06):

| UK | EN |
|---|---|
| Додати дедлайн здачі | Add delivery deadline |
| Необов'язково · з'явиться в календарі після зйомки | Optional · appears in the calendar after the shoot |
| Дедлайн здачі | Delivery deadline |
| до 16 вересня | by 16 September |
| Через 10 днів · Завтра · Сьогодні | In 10 days · Tomorrow · Today |
| Прострочено на 2 дні | Overdue by 2 days |
| Передано | Delivered |
| Знято · Обробка · Передано | Shot · Editing · Delivered |
| Позначити як передано клієнту | Mark as delivered to client |
| Дедлайн здачі файлів | Delivery deadline for files |
| Відлік від дня зйомки. Дата з'явиться на картці завершеної зйомки в календарі. | Counted from the shoot day. It shows on the finished shoot's card in the calendar. |
| Або оберіть дату | Or pick a date |
| 7 днів після зйомки · У день зйомки | 7 days after the shoot · On the shoot day |
| Готово · Скасувати | Done · Cancel |
| Дедлайн здачі — 16 вересня *(save toast)* | Deadline set: 16 September |
| Дедлайн видалено | Deadline removed |
| Прострочено *(calendar label)* | Overdue |
| Позначено як передано клієнту | Marked as delivered to client |
| Змінити дедлайн · Видалити дедлайн *(VoiceOver labels)* | Change deadline · Remove deadline |

## Out of scope
- Reminders or notifications about a deadline — not now (owner, 2026-10-06).
- Showing the deadline to crew or the client.
- Undoing «Передано» other than from the toast.

## Dependencies
`US-018`, `US-019`, `US-020`, `US-030`.

## Open questions
None — the English copy was confirmed by the owner, chat 2026-10-06.
