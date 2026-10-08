# US-051 — Start a free trial on the paywall after registration

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As **anyone who has just registered** — a shoot creator or a crew member,
I want **to be offered 14 days free before paying $4.99 a month**,
so that **I can try Luna with my real shoots before deciding to pay**.

## Context
`ADR-023` decisions 1–3. The trial is Apple's introductory offer: it starts when the person
confirms it on Apple's own sheet, and Apple renews it into the paid subscription unless it is
cancelled in the Apple ID's settings. One trial per Apple ID. iOS only — buying on the web is out
of scope (`EP-09`).

## Acceptance criteria

### AC-1 — The paywall follows registration
- **Given** a person who has just completed registration (`US-001`, with the email confirmed —
  `ADR-019`)
- **When** they first enter the app
- **Then** the paywall is shown full screen, as the first thing the app shows (owner, 2026-10-08)

### AC-2 — What the paywall shows
- **Then** it shows: the trial length (14 days), the price after it ($4.99 a month, in the
  storefront's currency as Apple gives it), that it renews monthly until cancelled, a button that
  starts the trial, «Відновити покупки» / "Restore purchases", links to the terms and the privacy
  policy (in the app's language — `US-049`), and a way to close it
- **And** it is in the app's language (`US-045`)

### AC-3 — Starting the trial
- **Given** the paywall
- **When** the person taps the trial button and confirms on Apple's sheet
- **Then** the account has full access at once, and the paywall closes

### AC-4 — Apple's sheet cancelled *(required)*
- **When** the person dismisses Apple's sheet without confirming
- **Then** the paywall stays open and nothing changes

### AC-5 — The paywall closed *(required)*
- **When** the person closes the paywall
- **Then** the account is in view mode (`US-052`), and the paywall is not shown again on its own —
  only from a create, edit or delete action (`US-052`) or from the profile (`US-053`)

### AC-6 — An Apple ID that has used its trial *(required)*
- **Given** an Apple ID Apple no longer grants the introductory offer to
- **Then** the paywall offers the subscription at $4.99 a month with no trial, and says so

### AC-7 — The purchase fails or waits *(required)*
- **When** Apple reports a failed purchase, or one awaiting approval (Ask to Buy)
- **Then** the account stays as it was, and the person is told the purchase did not complete

### AC-8 — Restore
- **Given** a Luna account that has a subscription, on a new phone or after reinstalling
- **When** the person taps «Відновити покупки»
- **Then** the account's access is restored

## Out of scope
- Buying on the web (`EP-09`).
- A yearly plan (`ADR-023`).

## Dependencies
`US-052` (the access record and view mode), spike `S-7`, the owner's App Store Connect product.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | The paywall's design and copy — designed together after this spec (owner, 2026-10-08), in both languages — including whether it lists what the subscription includes | AC-2's screen |
| 2 | The message for AC-7, in both languages | AC-7 |
