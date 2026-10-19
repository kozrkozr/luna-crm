# US-066 — Get reminded of delivery deadlines

- **Parent epic:** [EP-08 — Shoot reminders](EP-08.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **a notification the morning before a delivery deadline, and another if I miss it**,
so that **no client waits for their files because I forgot the date**.

## Context
Owner, chat 2026-10-17. Every decision below is the owner's, same chat, except where marked.

**This lifts `US-042`'s Out of scope** («Reminders or notifications about a deadline — not now»).

The deadline and the delivered mark are `US-042`'s. The reminders are local notifications, as
`US-041`'s are — no server push — and share its permission (`US-041` AC-1, AC-10) and its
«Сповіщення» settings screen (`US-041` AC-9).

"Finished" is the status as the app derives it: the shoot's end time has passed (`US-020`, as in
`US-042`).

Two notifications, each a digest of its morning:
- **«Завтра здача»** — the morning before the deadline day, for every shoot due tomorrow.
- **«Прострочено»** — the morning after the deadline day, for every shoot whose deadline was
  yesterday and is still not delivered. Once; it does not repeat.

## Acceptance criteria

### AC-1 — The day before
- **Given** the reminder on, and one or more **finished** shoots with a deadline tomorrow, not
  marked delivered
- **When** the reminder time arrives (**11:00** by default, AC-6)
- **Then** one notification is shown for all of them, its title one of three picked at random
  (Copy)

### AC-2 — Overdue
- **Given** the reminder on, and one or more **finished** shoots whose deadline was yesterday, not
  marked delivered
- **When** the reminder time arrives
- **Then** one notification is shown for all of them, its title one of three picked at random
  (Copy)
- A shoot gets this once — on the day after its deadline, not on the days that follow.
- **Given** the same morning has shoots for AC-1 and for AC-2
- **Then** they are **two separate notifications**

### AC-3 — The body
- The shoots are listed one per line, as «• {клієнт}, зйомка {дата}»:

  ```
  • Papaya, зйомка 12 жовтня
  • Олена, зйомка 14 жовтня · і ще 2
  ```

- At most **2** shoots are listed; the rest are counted at the end of the second line,
  «· і ще N» — as `US-041` AC-3's digest does.
- Ordered by the shoot's date, earliest first.
- A shoot without a client name is listed as «• Зйомка 12 жовтня» — the name and its comma
  dropped, «Зйомка» capitalised.

### AC-4 — Only finished shoots, only undelivered ones
- **Given** a shoot that is **not finished** at the reminder's moment — e.g. a deadline on the
  shoot day, or the day after it
- **Then** it gets no «Завтра здача» reminder
- **Given** a shoot **marked delivered** (`US-042` AC-6), or **deleted** (`US-019`, `ADR-014`), or
  with no deadline
- **Then** it gets no reminder and is left out of both notifications

### AC-5 — Reminders follow the deadline
- **Given** a deadline set, changed or removed, the shoot's date changed (`US-042` AC-8), or the
  files marked delivered — or that mark undone
- **Then** the reminders follow at once: a reminder no longer true is not shown, a new one is
- **Given** a reminder whose moment has already passed when the deadline is set *(as `US-041`
  AC-6)*
- **Then** it is not shown at all

### AC-6 — Settings
- On the «Сповіщення» screen (`US-041` AC-9), a **third** block after the two that exist: a toggle
  «Дедлайн здачі» with its caption, and its time — hours and minutes — **11:00** by default.
- **On by default**, like the other two (`US-041` AC-2).
- The one time is for both notifications, AC-1 and AC-2.
- The toggle off hides the time, as the others do.
- No new design: the block repeats the existing two of `Notifications.dc.html` (owner,
  2026-10-17).

### AC-7 — Tapping a notification
- **Given** a notification about **one** shoot
- **When** the creator taps it
- **Then** the app opens that shoot on its «Матеріали» tab
- **Given** a notification about **several** shoots
- **When** the creator taps it
- **Then** the app opens the `US-063` list — «В обробці» for AC-1, «Прострочено» for AC-2 —
  **without a period**: every such shoot, whenever it was shot. Under the title only
  «{n} зйомки», no period's name. A shoot from last month due tomorrow is therefore in the list.

### AC-8 — Language
- **Given** a creator who switched the app to English (`US-014`, `US-015`)
- **Then** the notifications and the settings block are in English (Copy).

## Copy *(owner, 2026-10-17)*

**AC-1 — the day before**

| Shoots | UK | EN |
|---|---|---|
| 1 | Завтра здача ⏳ Фінальний ривок | Delivery's tomorrow ⏳ Final push |
| 1 | Ще день — і файли мають бути в клієнта 📤 | One more day, then the files go to the client 📤 |
| 1 | Завтра дедлайн. Дотискаємо 💪 | Deadline tomorrow. Let's wrap it up 💪 |
| 2+ | Завтра кілька здач. Тримаємо темп 🔥 | A few deliveries tomorrow. Keep the pace 🔥 |
| 2+ | Дедлайни на горизонті 🏁 | Deadlines on the horizon 🏁 |
| 2+ | Завтра день здачі. Поїхали 📤 | Delivery day tomorrow. Let's go 📤 |

**AC-2 — overdue**

| Shoots | UK | EN |
|---|---|---|
| 1 | Ой, здача прострочена 😬 | Oops, a delivery is overdue 😬 |
| 1 | Клієнт ще чекає на файли 👀 | The client is still waiting for the files 👀 |
| 1 | Дедлайн учора минув 🫠 | The deadline passed yesterday 🫠 |
| 2+ | Кілька здач прострочено 😬 | A few deliveries are overdue 😬 |
| 2+ | Клієнти чекають на файли 👀 | Clients are waiting for their files 👀 |
| 2+ | Дедлайни вчора пролетіли 🫠 | The deadlines flew by yesterday 🫠 |

**Body, settings, list**

| Element | UK | EN |
|---|---|---|
| Body line (AC-3) | • {клієнт}, зйомка 12 жовтня | • {client}, shoot on 12 October |
| Body line, no client (AC-3) | • Зйомка 12 жовтня | • Shoot on 12 October |
| Rest (AC-3) | і ще 2 *(as `US-041`)* | and 2 more |
| Settings toggle | Дедлайн здачі | Delivery deadline |
| Its caption | Нагадування за день до дедлайну, і ще раз, якщо файли не передано вчасно | A reminder the day before, and again if the files are late |
| Its time | Час · 11:00 | Time · 11:00 |
| Under a list's title, no period (AC-7) | {n} зйомка / зйомки / зйомок | {n} shoot / shoots |

## Out of scope
- Reminding again on the days after the overdue one.
- A reminder on the deadline day itself — the day before only (owner, 2026-10-17).
- Per-shoot settings — see `EP-08`.
- Time zones — the phone's clock, as `US-041`.

## Dependencies
`US-041` (local notifications, the settings screen), `US-042`, `US-063`.

## Open questions
None.
