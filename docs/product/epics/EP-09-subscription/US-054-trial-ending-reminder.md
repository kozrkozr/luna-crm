# US-054 — Be reminded before the free trial ends

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As **someone on the free trial**,
I want **to be told before it ends**,
so that **the first charge does not surprise me**.

## Context
`ADR-023`. Owner, 2026-10-07: reminders before the trial ends — "так же роблять". A local
notification, as `US-041`'s reminders are; no server push.

## Acceptance criteria

### AC-1 — Two days before
- **Given** an account on the free trial, with notification permission granted
- **When** two days remain until the trial ends
- **Then** a notification says when the trial ends and what happens then

### AC-2 — Cancelled trial *(required)*
- **Given** a trial already cancelled in Apple's settings
- **Then** the notification says access ends, not that a charge begins — or is not sent (open
  question 2)

### AC-3 — No permission *(required)*
- **Given** notification permission refused
- **Then** nothing is sent, and nothing else changes

## Out of scope
- An email reminder — not asked for.

## Dependencies
`US-051`; `US-041`'s local-notification setup.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | The notification's copy, in both languages | AC-1 |
| 2 | For a cancelled trial: a different message, or none? | AC-2 |
| 3 | A banner in the app during the trial («Залишилось N днів») — wanted, and where? | A possible AC-4 |
