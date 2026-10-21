# ADR-024 — The web app ships on its own, before file hosting, for every Luna Shoots subscriber, with a desktop layout

- **Date:** 2026-10-15
- **Status:** accepted
- **Amends:** `ADR-021` — answers-after-acceptance item 1 (the desktop layout) and the web app's
  place in `EP-07`; `ADR-023` decision 7 — the web app moves from the planned PRO tier into the
  current «Luna Shoots» subscription
- **Does not change:** `ADR-021` decisions 1–4 and its answers 2–5 (whole app, four browsers,
  `app.lunashoots.com`, one email link, account language); `ADR-020` (file hosting);
  `ADR-013`, `ADR-014`; `ADR-023` decisions 1–6 and 8–10
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-15)

## Context
`ADR-021` (2026-10-04) put the whole photographer's app in a desktop browser, but as a step of
`EP-07`: file hosting made it needed, so `US-040` sat behind spike `S-6` and paused with the
epic. It also settled the layout as "the phone layout, centred".

`ADR-023` (2026-10-09) then put the web app, with file storage, in a planned PRO tier that does
not exist yet.

After the 1.0.1 release (2026-10-15) the owner wants the web app now, on its own, and looked at a
draft of desktop screens — a sidebar in place of the tab bar, two-column layouts — drawn from the
shipped screens.

## Options considered
### Option A — keep `ADR-021` and `ADR-023` as written
- **Pros:** nothing to amend
- **Cons:** the web app waits for `EP-07` and for a PRO tier that has no date; when it comes it is
  a phone screen in a wide window

### Option B — the web app now, PRO only
- **Pros:** keeps the tier split
- **Cons:** PRO has no product, price or entitlement, so the web app would be built and then
  closed to everyone but hand-picked accounts

### Option C — the web app now, for every Luna Shoots subscriber, with a desktop layout *(chosen)*
- **Pros:** ships what exists; the access rules (`US-052`) already apply on the web, because
  access is decided on the server
- **Cons:** a design and testing surface at desktop widths; PRO loses one of its two features;
  the web cannot sell or start the subscription (it is bought through Apple), so a newcomer on
  the web has no way in yet (open question 1)

## Decision
Option C.
1. **The web app leaves `EP-07`** and becomes its own epic, `EP-10`, built now — before
   `S-6` and independent of file hosting. `US-040` moves to `EP-10`; `EP-07` will rely on it.
2. **It is part of the «Luna Shoots» subscription**, not PRO. An account's access is the same on
   the web as on iOS — full with an active subscription, trial or beta access, view mode
   (`US-052`) without. PRO is left with file storage.
3. **Desktop layout:** a sidebar replaces the tab bar, and screens use the width (two columns where
   they gain from it), following the owner's approved design. Below a desktop width the web app
   shows the phone layout. Amends `ADR-021` answer 1.
4. **No subscription on the web, for now:** the paywall, the «Підписка» screen and the profile's
   subscription row are not shown, and nothing on the web buys, restores or manages a
   subscription.
5. **No notification settings on the web:** reminders are the iOS app's local notifications
   (`US-041`, `US-054`), so the «Сповіщення» row and screen are not shown.
6. **Address:** `app.lunashoots.com`, as `ADR-021` answered — `lunashoots.com` keeps the link
   surface and later a landing page (owner, 2026-10-15).

## Consequences
- **Accepted cost:** every creator screen gets a desktop layout and is tested in four browsers.
- **Now easier:** `EP-07` builds its upload on a web app that already works.
- **Now harder:** the web cannot take money. Until it can, a subscription is started only in the
  iOS app.
- **Risk to iOS:** shared screens change. Web-only code lives in `.web.tsx` files; the iOS app
  is iPhone-only and portrait (`supportsTablet: false`), so desktop breakpoints never apply there.
  A screen whose logic is moved for the web is re-tested on iOS before the next build.
- **Revisit when:** PRO is defined — what it holds besides file storage; or the web needs to sell
  the subscription (web billing through RevenueCat).

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `ADR-021` | answer 1 and the `EP-07` placement marked as amended by `ADR-024` |
| `ADR-023` | decision 7 — the web app struck from PRO |
| `EP-07` | `US-040` leaves its stories; becomes a dependency |
| `EP-09` | out of scope: the web app is no longer PRO |
| `EP-10` | new — the photographer's web app |
| `US-040` | moves to `EP-10`; AC-4 replaced; subscription and notifications hidden |
| `US-057` | new — the desktop layout |
| `04-tech/backlog-order.md` | `EP-10` before `EP-07`; `US-040` leaves `EP-07`'s order |

## Open questions
1. **A newcomer on the web.** Someone who registers on the web has no subscription and cannot
   start Apple's trial there, and the web shows no paywall (decision 4). What do they see — view
   mode pointing to the iOS app, registration only in iOS, or something else? Owner: "decide
   later" (2026-10-15). Blocks the web app's public launch, not the start of the build.
   The same answer decides what **any** account without access sees on the web (owner,
   2026-10-16); until then `US-040` AC-6's interim: «Режим перегляду» alone, and guarded actions
   do nothing. *Answered 2026-10-21 by `ADR-028`:* registration only in the iOS app; the web
   points newcomers and accounts without access to the App Store (`US-072`).
