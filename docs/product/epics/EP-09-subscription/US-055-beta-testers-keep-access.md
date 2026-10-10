# US-055 — Picked beta testers keep full access for 3 months after the launch

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As **a TestFlight beta tester the owner picked**,
I want **to keep using Luna free for a while after it goes paid**,
so that **helping test it is rewarded, not followed by a paywall on launch day**.

## Context
`ADR-023` decision 8 (owner, 2026-10-07: "3 місяці безкоштовно"; narrowed 2026-10-10 to the
testers the owner picks). Granted by the server — no purchase, no Apple offer code, no RevenueCat
promotional grant. The owner adds a person to the beta list in the database, by their account;
nothing in the app does it. After it, the person is offered Apple's trial like anyone else, if
their Apple ID is still eligible.

## Acceptance criteria

### AC-1 — Who *(amended 2026-10-10)*
- **Given** an account the owner has put on the beta list
- **Then** it has full access until the launch date plus 3 months
- **And** a tester the owner has not put on it is a regular account: view mode, the paywall and
  Apple's trial as for anyone (`US-051`, `US-052`)

### AC-1a — The list survives the store *(required)*
- **When** RevenueCat reports the account's purchases (`S-7`'s webhook or sync)
- **Then** its beta access is untouched — the list is not RevenueCat's to rewrite

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
- **Then** the subscription starts and is charged from the purchase, as Apple sells it; the
  remaining beta access adds nothing (owner, 2026-10-08)

## Copy
Owner confirmed, 2026-10-08.

| Ukrainian | English |
|---|---|
| **Бета-доступ закінчується** *(AC-3a title)* | **Your beta access ends soon** |
| Через 2 дні застосунок перейде в режим перегляду. Оформіть підписку, щоб і далі створювати зйомки. | In 2 days the app switches to view mode. Subscribe to keep creating shoots. |

## Dependencies
`US-052`; the launch date (`ADR-023` open question 1).

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | The public launch date | AC-1's end date |
