# US-040 — Use the photographer's app in a desktop browser

- **Parent epic:** [EP-10 — The photographer's web app](EP-10.md) *(moved from `EP-07` by
  `ADR-024`, 2026-10-15)*
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** L

## Story
As a **shoot creator**,
I want **to use the app in the browser on my computer**,
so that **I can manage my shoots there as well as on the phone — and, once `EP-07` is built,
upload files where they are**.

## Context
`decisions/ADR-021-*.md`, amended by `decisions/ADR-024-*.md`. The whole photographer's app, not
only uploading. It no longer waits for file hosting (`ADR-024` decision 1). The desktop layout is
`US-057`; this story is everything working in the browser.

## Acceptance criteria

### AC-1 — Every creator story works in a desktop browser
- **Given** a modern desktop browser — Chrome, Safari, Firefox or Edge
- **When** a registered user signs in on the web
- **Then** every creator story behaves as its acceptance criteria say, as in the iOS app — except
  what AC-6 and AC-7 leave out
- *Checked so far (2026-10-16):* Chrome and Edge. Safari and Firefox are checked last, after
  `US-057`'s redesign (owner, 2026-10-16)

### AC-2 — One account on both
- **Given** a user registered in the iOS app
- **When** they sign in on the web with the same email and password
- **Then** they see the same shoots, and a change on one shows on the other

### AC-3 — One email link, the right app
- **Given** a confirmation or recovery email (`US-001`, `ADR-019`)
- **When** the user follows its link
- **Then** on a phone it opens the iOS app, and on a computer the web app — the same link in
  both cases (owner, chat 2026-10-04)
- *Met by `US-058` since `ADR-025` (2026-10-16):* the email carries a code that works in the iOS
  app and on the web whichever device opened it; the link keeps going back to where the email was
  asked for. Universal Links are not needed for this criterion.

### AC-4 — The layout
~~The phone layout, centred — no separate desktop layout~~ — replaced by `US-057` (`ADR-024`
decision 3, owner 2026-10-15).

### AC-5 — At its own address, in the account's language
- **Given** the web app
- **When** a user opens it
- **Then** it is served at `app.lunashoots.com`, and its copy follows the account's language
  (uk/en, `US-014`, `US-015`) (owner, chat 2026-10-04; address confirmed 2026-10-15)

### AC-6 — The same access as on iOS, and no subscription screens
- **Given** an account on the web
- **When** it has an active subscription, a trial or beta access
- **Then** it has full access, as on iOS (`ADR-024` decision 2)
- **And when** it has none
- **Then** it is in view mode (`US-052`) — and on the web nothing offers, buys, restores or manages
  a subscription: the paywall, the «Підписка» screen and the profile's subscription row are not
  shown (`ADR-024` decision 4)
- **And** the view-mode banner reads «Режим перегляду» alone — no «Оформити підписку», nothing to
  press — and a create, edit or delete without access does nothing. *Interim*, until open
  question 1 decides what an account without access sees on the web (owner, 2026-10-16).
  *Replaced 2026-10-21 by `US-072` (`ADR-028`):* the banner points to the App Store, and a
  guarded action opens «Потрібна підписка»
- **And** on a trial, the home banner still shows the days left, but opens nothing (owner,
  2026-10-16: "показувати без переходу")

### AC-7 — No notification settings on the web
- **Given** the profile on the web
- **When** it is shown
- **Then** the «Сповіщення» row is absent, and the notification settings screen cannot be opened
  (`ADR-024` decision 5)

## Out of scope
- Uploading files — `EP-07`, which builds on this story.
- Uploading files from the iOS app — deferred (`ADR-021`).
- Buying or starting a subscription on the web (`ADR-024` decision 4).
- The desktop layout — `US-057`.

## Dependencies
Every creator story it covers.

## Open questions
1. What a newcomer who registers on the web sees, with no trial available there (`ADR-024` open
   question 1) — and with it, what any account without access sees there (owner, 2026-10-16: the
   same question). Until then AC-6's interim. Blocks the public launch of the web app, not this
   story's build.
