# US-072 — The web sends newcomers and accounts without access to the iOS app

- **Parent epic:** [EP-10 — The photographer's web app](EP-10.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **visitor or a photographer without a subscription** on the web,
I want **to be told that the account and the subscription start in the iPhone app, and how to get it**,
so that **I do not register or click around in an app that cannot let me in**.

## Context
`decisions/ADR-028-*.md`. The design is the owner's canvas «Luna Shoots — веб, чернетка» (claude.ai
artifact `PBUnw11JVevphXWDeKQ2tj`), boards `Login`, `LoginPhone`, `RegisterApp`,
`RegisterAppPhone`, `MainReadOnly`, `MainReadOnlyPhone`, `SubscriptionNeeded`,
`SubscriptionNeededPhone` (2026-10-21). The boards still draw the «L» mark; the logo is the moon
(`US-057` AC-3). Web only — the iOS app is unchanged (`ADR-028` decision 4).

**The way to the app** below is: at the desktop width (`US-057` AC-1) a QR code to the app's
App Store page, captioned, beside Apple's official «Download on the App Store» badge; below it the
badge alone. The badge is Apple's black one, in the UI's language (uk/en), and opens the App Store
page (owner, 2026-10-21).

## Acceptance criteria

### AC-1 — Sign-in only
- **Given** the web app, signed out
- **When** the sign-in screen is shown
- **Then** it has no «Увійти · Реєстрація» tabs — the logo, name, tagline and the sign-in form
- **And** under the form, a block «Новий у Luna Shoots?» with its line and the way to the app

### AC-2 — `/register` on the web
- **Given** the web app, signed out
- **When** `/register` is opened — an old link or a bookmark
- **Then** it shows «Реєстрація — у застосунку для iPhone», its line, the way to the app and
  «Вже маєте акаунт? Увійти», which opens the sign-in screen

### AC-3 — The view-mode banner
- **Given** an account without access on the web
- **When** «Головна» is shown
- **Then** the banner reads «Режим перегляду.» and the line after it, with «Відкрити App Store»,
  which opens the App Store page
- **And** on a trial the trial banner is unchanged (`US-040` AC-6)

### AC-4 — «Потрібна підписка»
- **Given** an account without access on the web
- **When** a create, edit or delete is pressed — anything the iOS app sends to the paywall
- **Then** «Потрібна підписка» opens instead — its line, the way to the app, and «Закрити» — and
  nothing is changed
- **And** at the desktop width it is a dialog in the middle of the window; below it, a sheet
  from the bottom

### AC-5 — The iOS app is unchanged *(edge)*
- **Given** the iOS app
- **When** registration, the paywall or the view-mode banner is shown
- **Then** they are as before this story

## Copy
Ukrainian: the owner's boards, 2026-10-21 (the dialog's line from the board, not `US-052`'s —
owner, 2026-10-21). English: agent's draft, confirmed by the owner 2026-10-21.

| Ukrainian | English |
|---|---|
| Новий у Luna Shoots? | New to Luna Shoots? |
| Створіть акаунт у застосунку для iPhone — там же оформлюється підписка. | Create your account in the iPhone app — that's where you subscribe, too. |
| Наведіть камеру iPhone *(under the QR code)* | Scan with your iPhone camera |
| Реєстрація — у застосунку для iPhone | Sign up in the iPhone app |
| Створіть акаунт у застосунку Luna Shoots для iPhone — там же оформлюється підписка. | Create your account in the Luna Shoots iPhone app — that's where you subscribe, too. |
| Вже маєте акаунт? Увійти | Already have an account? Log in |
| **Режим перегляду.** Щоб створювати й редагувати зйомки, оформіть підписку в застосунку для iPhone. | **View mode.** To create and edit shoots, subscribe in the iPhone app. |
| Відкрити App Store | Open the App Store |
| Потрібна підписка | Subscription required |
| Підписку можна оформити в застосунку Luna Shoots для iPhone. Після оплати тут усе відкриється автоматично. | You can subscribe in the Luna Shoots iPhone app. Once you've paid, everything here opens up automatically. |
| Закрити | Close |
| QR-код на сторінку Luna Shoots в App Store *(the QR code's label for screen readers)* | QR code for Luna Shoots on the App Store |

## Out of scope
- Selling the subscription on the web (`ADR-024` decision 4, `ADR-028`).
- Sign in with Apple.
- Anything in the iOS app.
