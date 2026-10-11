# Changelog

What changed in each build that went to TestFlight or the App Store. Newest first.

- **Version** (`version` in `app.config.ts`) is the release people see in the store. It stays
  `1.0.0` through the TestFlight beta, and must go up only after a version is released on the
  App Store — Apple then accepts no more builds for it.
- **Build** (`ios.buildNumber`) goes up on every upload, whatever the version.
- Each entry names its story, so `git log --grep=US-0xx` finds the code.
- How a build is shipped: `docs/releases/`.

## 1.0.0 (build 3) — the App Store, with the subscription

Checklist: [`docs/releases/1.0.0-build-3-app-store.md`](docs/releases/1.0.0-build-3-app-store.md).
Since build 2 (`v1.0.0-build.2`). The date is set when it is released.

### Added
- **A monthly subscription** with Apple's 14-day free trial, bought through RevenueCat; the
  database records an account's access from RevenueCat's webhook (`S-7`, `ADR-023`).
- **The paywall** right after registration — the trial or the subscription, «Відновити», and
  what went wrong (`US-051`).
- **View mode without access** — everything visible, nothing created, edited or deleted; the
  database refuses it and every such action opens the paywall (`US-052`).
- **«Підписка» in the profile** — the plan, its state, managing it in Apple's settings, restore;
  deleting the account warns about a running subscription (`US-053`).
- **The free trial's end** — a banner on the home screen and a reminder two days before
  (`US-054`).
- **Picked beta testers keep full access** for a year from the launch, shown as a subscription
  that will not renew (`US-055`).
- **The terms and the privacy policy describe the subscription**, both languages (`US-056`).
- **«Написати в підтримку»** in the profile opens an email to support@lunashoots.com (`US-016`),
  and a support page in both languages (`ADR-017`).

### Fixed
- The weekday stays capitalised after an English date (`US-015`).
- The app's access to crew contacts is granted explicitly (`US-005`).

## 1.0.0 (build 2) — 2026-10-07

Checklist: [`docs/releases/1.0.0-build-2.md`](docs/releases/1.0.0-build-2.md).
Since build 1 (`f34cb40`, archived 2026-10-01).

### Added
- **Shoot reminders** — an evening digest of tomorrow's shoots and a reminder 1–3 hours before
  each, as local notifications, with a «Сповіщення» settings screen (`US-041`).
- **Delivery deadline** — an optional date the finished files are owed by, with progress and
  «Позначити як передано клієнту», also on the calendar card (`US-042`).
- **References on the new-shoot form** (`US-043`).
- **English and Ukrainian, chosen from the phone** — the app, sign-in and registration follow the
  phone's language; an account can still switch (`US-045`).
- **Link views in the reader's language**, with a UA / EN switch remembered in the browser
  (`US-046`).
- **Account currency** — UAH, USD, EUR, PLN or CZK, first picked from the phone's region, with a
  «Валюта» screen (`US-047`).
- **Auth emails in the account's language** — confirmation, password reset, email change
  (`US-048`).
- **English privacy policy and terms**, opened in the app's language; both languages brought up
  to date — drafts, before legal review (`US-049`).
- **iOS's own prompts in both languages** — the photo-library request (`US-050`).

### Changed
- Crew roles and reference categories are stored as keys and translated on every surface
  (`US-044`).
- Phone fields show an example number of the phone's region instead of a `+380` mask (`US-049`).
- The dev link surface moved to `dev.lunashoots.com` (`ADR-012`).

### Fixed
- A link view re-requests its data when a signed image has expired, on the shoot page and on the
  all-references page (`US-010`, `US-021`).
- English plurals follow the English rule (`US-015`).
- A user can change their own currency (`US-047`).
- Delivery-deadline layout and colour fixes (`US-042`).

## 1.0.0 (build 1) — 2026-10-01

First TestFlight build, against the production backend (`ADR-017`).
