# US-053 — See and manage the subscription in the profile

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As **a registered person**,
I want **one place that tells me whether I am on a trial, subscribed or not, and until when**,
so that **I am never surprised by a charge or by losing the ability to edit**.

## Context
`ADR-023`. A screen reached from the profile, like «Валюта» (`US-047`) and «Сповіщення»
(`US-041`). Cancelling is Apple's, in the Apple ID's settings — the app links there, it does not
cancel itself.

## Acceptance criteria

### AC-1 — The status
- **Then** the screen shows one of: the free trial and the date it ends; an active subscription and
  its next renewal date; beta access and the date it ends (`US-055`); or no access

### AC-2 — Manage
- **Given** a trial or an active subscription
- **When** the person taps manage
- **Then** iOS's subscription settings for Luna open

### AC-3 — Subscribe
- **Given** no access
- **When** the person taps subscribe
- **Then** the paywall opens (`US-051`)

### AC-4 — Restore
- **Then** «Відновити покупки» / "Restore purchases" is on the screen and behaves as `US-051` AC-8

### AC-5 — A cancelled subscription *(required)*
- **Given** a trial or subscription cancelled in Apple's settings but not yet ended
- **Then** the screen says it will not renew and gives the date access ends

### AC-6 — Deleting the account with a running subscription *(required)*
- **Given** a trial or subscription that will renew
- **When** the person starts deleting the account
- **Then** they are warned that Apple keeps charging until the subscription is cancelled in the
  Apple ID's settings, with a way to open those settings (owner, 2026-10-08)

## Dependencies
`US-051`, `US-052`.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | The screen's design and copy, and AC-6's warning, in both languages | AC-1–AC-6 |
