# US-055 — Beta testers keep full access for 3 months after the launch

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As **a TestFlight beta tester**,
I want **to keep using Luna free for a while after it goes paid**,
so that **helping test it is rewarded, not followed by a paywall on launch day**.

## Context
`ADR-023` decision 8 (owner, 2026-10-07: "3 місяці безкоштовно"). Granted by the server — no
purchase, no Apple offer code. After it, the person is offered Apple's trial like anyone else, if
their Apple ID is still eligible.

## Acceptance criteria

### AC-1 — Who
- **Given** an account registered before the public launch date
- **Then** it has full access until the launch date plus 3 months

### AC-2 — No paywall during it
- **Given** such an account
- **Then** it is not shown the paywall after registration or on login, and has no view mode, until
  the access ends

### AC-3 — When it ends *(required)*
- **When** the date passes without a subscription
- **Then** the account is in view mode (`US-052`), and the paywall is offered as for anyone else

### AC-3a — Warned before it ends
- **Given** such an account, with notification permission granted
- **When** two days remain of its beta access
- **Then** it is notified, as a trial is (`US-054`) (owner, 2026-10-08: "попереджати як всіх")

### AC-4 — Subscribing early
- **Given** such an account that subscribes before its beta access ends
- **Then** the subscription applies; nothing of the beta access is lost

## Dependencies
`US-052`; the launch date (`ADR-023` open question 1).

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | The public launch date | AC-1's end date |
| 2 | AC-4: does an early subscription start charging at once, or after the beta access ends? | AC-4 |
