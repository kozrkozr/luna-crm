# US-041 — Get reminded of upcoming shoots

- **Parent epic:** [EP-08 — Shoot reminders](EP-08.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **a notification the evening before my shoots and another a few hours before each one**,
so that **I can prepare the day before and not miss the start**.

## Context
Beta feedback, 2026-10-05 — see `EP-08`. Every decision below is the owner's, chat 2026-10-05.

Two reminders, deliberately different in kind:
- **The evening digest** — one notification the day before, at a fixed hour, covering **all** of
  tomorrow's shoots. Chosen over "exactly 24 hours before": it is for preparing the day, it never
  lands at an odd hour for an early shoot, it is one notification instead of several, and it works
  for shoots that have no start time.
- **The «за N годин» reminder** — one per shoot, N hours before its start time.

## Acceptance criteria

### AC-1 — Permission asked at first launch
- **Given** the app opened for the first time on a device
- **When** it starts
- **Then** iOS's notification permission is requested

### AC-2 — On by default
- **Given** a creator who granted permission and never changed the settings
- **Then** both reminders are on: the evening digest at **20:00**, and «за N годин» with **N = 2**

### AC-3 — The evening digest
*Rewritten 2026-10-05 after the owner tested the first build — the copy below replaces «Завтра
зйомка» / «Завтра 3 зйомки» and the one-line body.*

- **Given** the digest on, and one or more shoots tomorrow
- **When** the digest hour arrives
- **Then** one notification is shown for all of them. Its title is **one of three, picked at
  random**, by how many shoots there are tomorrow:

| Shoots | Titles |
|---|---|
| 1 | «Завтра лайтово 😌 Одна зйомка.» · «Один shoot і можна видихнути 😮‍💨» · «Завтра спокійно, всього одна зйомка 😌» |
| 2 | «Завтра буде щільненько 😮‍💨» · «Дві зйомки — розігріваємось 📸» · «Окей, завтра вже без лінощів 🔥» |
| 3–5 | «Завтра без зайвих пауз. Поїхали 🔥» · «Wow, завтра хард ворк 🔥» · «Графік щільненький. Тримайся 🫠» |
| 6+ | «Ну все, завтра режим «вижити» 🫠🔥» · «Графік просто кричить «ТРИМАЙСЯ» 🫠» · «Хардкор намічається 🫠» |

- The body lists the shoots one per line, by start time, as «• {початок} – {кінець} {клієнт}»:

  ```
  • 10:00 – 14:00 Papaya
  • 15:00 – 18:00 Олена · і ще 3
  ```

- The en-dash keeps its spaces, as everywhere else in the app (`US-030` AC-4).
- **No location** in the digest.
- A shoot without times (`US-030` AC-6) is listed by client alone: «• Papaya».
- At most **2** shoots are listed; the rest are counted at the end of the second line:
  «· і ще 3». *(Was 3, on a line of its own — changed 2026-10-05: a collapsed notification on
  iOS 26 shows the title and two lines, so a third line was never seen.)*

### AC-4 — The «за N годин» reminder
- **Given** the reminder on, and a shoot with a start time
- **When** N hours remain before it starts
- **Then** a notification is shown: **«Зйомка через 2 години»** · «{клієнт}, о 10:00 · {локація}»
- An empty «{клієнт}» or «{локація}» is dropped from the text together with its separator.

### AC-5 — Shoots without a start time
- **Given** a shoot created before `US-030` (no start time)
- **Then** it appears in the evening digest, and gets no «за N годин» reminder

### AC-6 — No reminder that is already late
- **Given** a shoot created or edited after a reminder's moment has passed — e.g. created an hour
  before it starts
- **Then** that reminder is not shown at all

### AC-7 — Finished and deleted shoots
- **Given** a shoot marked finished (`US-020`) or deleted (`US-019`)
- **Then** it gets no reminders, and is left out of the digest (`ADR-014`)

### AC-8 — Reminders follow edits
- **Given** a shoot whose date or time is changed (`US-018`, `US-030` AC-5)
- **Then** its reminders move with it

### AC-9 — Settings
- **Given** the creator in their profile
- **When** they tap «Сповіщення» in the «Налаштування» section — a row like «Написати в
  підтримку», between «Мова застосунку» and «Написати в підтримку»
- **Then** a separate notification settings screen opens, where they can:
  - turn the evening digest on or off, and change its time — hours and minutes;
  - turn «за N годин» on or off, and pick N from **1, 2 or 3** hours.
- Both can be on at the same time.
- A toggle that is off hides its time or its choice of N.
- Design: `Notifications.dc.html` in Claude Design. The profile row is **not** taken from that
  canvas's `Edit Profile.dc.html` (owner, chat 2026-10-05).

Copy (owner, chat 2026-10-05):

| Element | UK | EN |
|---|---|---|
| Profile row, «Налаштування» section | Сповіщення | Notifications |
| Screen title | Сповіщення | Notifications |
| Digest toggle | Вечірнє зведення | Evening summary |
| Its caption | Список завтрашніх зйомок напередодні ввечері | Tomorrow's shoots, the evening before |
| Its hour | Час · 20:00 | Time · 20:00 |
| «за N годин» toggle | Перед зйомкою | Before a shoot |
| Its caption | Нагадування перед початком кожної зйомки | A reminder before each shoot starts |
| Its choice | За 1 годину · За 2 години · За 3 години | 1 hour before · 2 hours before · 3 hours before |

### AC-10 — Permission refused
- **Given** notifications turned off for the app in iOS settings
- **When** the creator opens the reminder settings
- **Then** they see «Сповіщення вимкнені в налаштуваннях iOS» and a button «Увімкнути»
  (EN: «Notifications are turned off in iOS settings», «Turn on»)
- **When** they tap it
- **Then** the permission is requested again if iOS still allows it; otherwise the app's page in
  iOS settings opens — iOS shows its own prompt only once, so after a refusal that page is the
  only way back

### AC-11 — Tapping a notification
- **When** the creator taps a «за N годин» reminder
- **Then** the app opens that shoot
- **When** they tap the evening digest
- **Then** the app opens the calendar with tomorrow selected

### AC-12 — Notification language
- **Given** a creator who switched the app to English (`US-014`, `US-015`)
- **Then** the notifications are in English (owner, 2026-10-05):

| Shoots | UK | EN |
|---|---|---|
| 1 | Завтра лайтово 😌 Одна зйомка. | Easy day tomorrow 😌 Just one shoot. |
| 1 | Один shoot і можна видихнути 😮‍💨 | One shoot and you can breathe out 😮‍💨 |
| 1 | Завтра спокійно, всього одна зйомка 😌 | A calm day tomorrow, just one shoot 😌 |
| 2 | Завтра буде щільненько 😮‍💨 | Tomorrow's going to be busy 😮‍💨 |
| 2 | Дві зйомки — розігріваємось 📸 | Two shoots — time to warm up 📸 |
| 2 | Окей, завтра вже без лінощів 🔥 | Okay, no slacking tomorrow 🔥 |
| 3–5 | Завтра без зайвих пауз. Поїхали 🔥 | No downtime tomorrow. Let's go 🔥 |
| 3–5 | Wow, завтра хард ворк 🔥 | Wow, hard work tomorrow 🔥 |
| 3–5 | Графік щільненький. Тримайся 🫠 | Packed schedule. Hang in there 🫠 |
| 6+ | Ну все, завтра режим «вижити» 🫠🔥 | That's it, tomorrow is survival mode 🫠🔥 |
| 6+ | Графік просто кричить «ТРИМАЙСЯ» 🫠 | The schedule is literally screaming "HANG IN THERE" 🫠 |
| 6+ | Хардкор намічається 🫠 | Hardcore day ahead 🫠 |
| — | і ще 2 | and 2 more |
| — | Зйомка через 2 години | Shoot in 2 hours |
| — | {клієнт}, о 10:00 | {client}, at 10:00 |

## Out of scope
- Reminding crew or clients; a push for crew responses; per-shoot settings — see `EP-08`.
- Time zones — reminders follow the phone's clock, as the shoot's date and time already do
  (`US-030`).

## Dependencies
`US-030`, `US-018`, `US-019`, `US-020`.

## Open questions
None — all answered by the owner, chat 2026-10-05.
