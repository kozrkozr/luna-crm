# US-030 — A shoot has a required start and end time

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **each shoot to carry the hours it runs, not just the day**,
so that **I can see at a glance what my day looks like and tell crew when to arrive**.

## Context
The shoot record has only ever held a `date` (`US-002` AC-2). Every mockup behind `ADR-017`
shows hours instead — `09:00 – 12:00` — and gives the range its own typography (`numeric-xl`,
the largest numeric style in the system) and its own column in the most-used list row. The
design cannot be built over a date alone.

The owner chose required over optional (chat, 2026-08-28). `date` stays required as it is today.

**Existing shoots have no times.** They keep working and display as they do now, date only,
until someone edits them — no times are invented for historical rows.

## Acceptance criteria

### AC-1 — Times collected at creation
- **Given** a logged-in shoot creator on the creation form
- **When** they fill it in
- **Then** a start time and an end time are required alongside the date, and both use a
  24-hour clock

### AC-2 — Save blocked when a time is missing
- **Given** the creation form with a date but no start or end time
- **When** the creator tries to save
- **Then** save is blocked and the missing field is indicated, exactly as `US-002` AC-2 already
  does for the date

### AC-3 — End before start *(unspecified — do not implement)*
- **Blocked on `02-product/open-questions.md` item 14.** Whether an end earlier than the start
  is rejected or read as crossing midnight is undecided, and the Ukrainian message for a
  rejection appears in no story or prototype. Inventing either is what `CLAUDE.md` rule 1
  forbids, so this AC stays empty until answered.

### AC-4 — The range is shown wherever a shoot is
- **Given** a shoot with times
- **When** it appears on the detail screen, in the shoot list, or in the calendar's day view
- **Then** the range is shown as `09:00 – 12:00`, en-dash with spaces, 24-hour

### AC-5 — Times are editable
- **Given** an existing shoot
- **When** the creator edits it (`US-018`)
- **Then** start and end times can be changed, under the same rules as AC-1 and AC-2

### AC-6 — Shoots predating this story still work
- **Given** a shoot created before times existed
- **When** it is viewed anywhere
- **Then** it shows its date with no times and nothing is broken; the next edit collects them
  under AC-5

## Out of scope
- The «менше години після попередньої» conflict warning — `US-031`.
- Time zones. Every shoot is local to the photographer, as the date already is.
- Duration arithmetic, reminders, or calendar export.

## Dependencies
- `US-002` — extends its form and its AC-2.
- `US-018` — extends the edit form.
- `US-004` — AC-4's list and calendar rendering.

## Open questions
`open-questions.md` item 14, which AC-3 is blocked on.
