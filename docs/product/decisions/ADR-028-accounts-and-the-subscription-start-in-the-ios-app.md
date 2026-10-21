# ADR-028 — Accounts and the subscription start in the iOS app; the web app only signs in

- **Date:** 2026-10-21
- **Status:** accepted
- **Answers:** `ADR-024` open question 1 — what a newcomer, and any account without access, sees on
  the web
- **Amends:** `US-040` AC-6 — the interim «Режим перегляду» alone and guarded actions that do
  nothing are replaced by `US-072`; `ADR-024` decision 4 stands (nothing on the web sells the
  subscription)
- **Does not change:** `ADR-023` (the subscription through the App Store), `ADR-015` (email and
  password), the link views (no account at all)
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-21), agent (recommendation)

## Context
The web app cannot sell the subscription: it is bought through Apple (`ADR-023`), and selling it
on the web needs a merchant of record. The owner looked at Paddle on 2026-10-21 (report: claude.ai
artifact «Paddle для Luna Shoots — аналіз») and chose speed: the subscription is bought on the
iPhone only, for now.

So someone who registered on the web would land in an app where nothing works, with no way to
start the trial there. And an account whose subscription ended sees «Режим перегляду» with nothing
to press (`US-040` AC-6, interim).

## Options considered
### Option A — register on the web, explain view mode
- **Pros:** the door stays open; a visitor can look around before installing the app
- **Cons:** looks like an app where nothing works; an account is created that cannot be used
  until the person moves to the iPhone

### Option B — register only in the iOS app; the web signs in *(chosen)*
- **Pros:** says how the product works today before anyone types a password; what Bear's web app
  does (the web is for people who already use the app); registration on the web comes back
  easily when the web can sell
- **Cons:** a visitor without an iPhone cannot start at all

## Decision
Option B.
1. **No registration on the web.** The web sign-in screen has no «Реєстрація» tab; under the form
   a block points a newcomer to the iOS app. `/register` on the web says the same.
2. **The way to the iOS app is the App Store.** On the desktop layout a QR code to the app's
   App Store page and Apple's official «Download on the App Store» badge; below the desktop width
   (a phone's browser — nothing to scan with) the badge alone.
3. **An account without access on the web is told where to subscribe.** The view-mode banner
   explains it and opens the App Store; a create, edit or delete without access opens «Потрібна
   підписка» instead of doing nothing.
4. **The iOS app is unchanged.** Registration, the paywall and the banner there stay as they are.

## Consequences
- **Accepted cost:** new copy in both languages; Apple's badge artwork and a QR code in the web
  build.
- **Now easier:** the web app can launch publicly — `ADR-024` open question 1 no longer blocks it.
- **Now harder:** nobody can start on a computer. Accepted while the subscription is iPhone-only.
- **Revisit when:** the web sells the subscription (Paddle or RevenueCat web billing) — then
  registration on the web returns, with a paywall there.

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `ADR-024` | open question 1 answered |
| `US-040` | AC-6 — the interim replaced by `US-072` |
| `US-072` | new — the web sends newcomers and accounts without access to the iOS app |
| `EP-10` | `US-072` added; open question 1 closed |
