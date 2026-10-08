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
- **Then** a different notification is sent: it says the app switches to view mode, not that a
  charge begins (owner, 2026-10-08)

### AC-3 — No permission *(required)*
- **Given** notification permission refused
- **Then** nothing is sent, and nothing else changes

### AC-4 — The trial banner
- **Given** an account on the free trial
- **Then** the home screen shows a banner «Пробний період: залишилось N днів» under its header,
  and tapping it opens the subscription screen (`US-053`) (owner, 2026-10-08; drawn in
  `Home.dc.html`, state «Пробний період»)

## Copy
Owner confirmed, 2026-10-08. `{price}` is the localized price string Apple returns for the person's storefront — never a hard-coded amount (Guideline 3.1.2); «4,99 $» in the designs is an example.

| Ukrainian | English |
|---|---|
| **Пробний період закінчується** *(title, AC-1 and AC-2)* | **Your free trial ends soon** |
| Через 2 дні почнеться оплата {price} на місяць. Скасувати можна в налаштуваннях Apple. *(AC-1)* | In 2 days you'll be charged {price} a month. You can cancel in your Apple settings. |
| Через 2 дні застосунок перейде в режим перегляду. Оформіть підписку, щоб і далі створювати зйомки. *(AC-2)* | In 2 days the app switches to view mode. Subscribe to keep creating shoots. |
| Пробний період: залишилось N днів *(AC-4, plural by each language's rule)* | Free trial: N days left |

## Out of scope
- An email reminder — not asked for.

## Dependencies
`US-051`; `US-041`'s local-notification setup.

## Open questions
None.
