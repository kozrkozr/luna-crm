# ADR-023 — A monthly subscription through the App Store, with Apple's free trial and a view mode without it

- **Date:** 2026-10-08
- **Status:** accepted — owner (chat, 2026-10-07/08); the provider (RevenueCat) proposed by the
  agent, accepted by the owner 2026-10-08
- **Amends:** `prd.md` Constraints — the price ($5/month → **$4.99/month**); `US-009`'s premise that
  a registered crew member uses the app for free; `ADR-021` — the photographer's web app becomes part
  of the planned PRO tier (decision 7)
- **Does not change:** `ADR-013` (anonymous link reads through the gateway), `ADR-014` (link validity
  from soft deletes) — links never depend on a subscription
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-07/08), agent (provider)

## Context
Luna has been free in the TestFlight beta. The owner wants the public App Store release to be
paid. `prd.md` named a price (fixed monthly, $5 without files) but nothing about how people pay,
what happens before they pay, or after they stop. `EP-07` (file hosting, paused) would add a
second, dearer tier; it is not built, so it is not priced here.

Facts that constrained the choice:
- A digital subscription sold inside an iOS app must use Apple's In-App Purchase (App Review
  Guideline 3.1.1). An app cannot be subscribed to at download: a subscription app is free to
  download and sells the subscription inside.
- Apple's own free trial (an *introductory offer*) starts when the person confirms it on Apple's
  sheet, not at registration, and is granted once per Apple ID per subscription group.
- Anyone can register — a photographer, or a crew member who only wants `US-009`'s schedule.
- Link readers (crew, clients) have no account and pay nothing (`ADR-013`).

## Options considered

### Who runs the free trial
- **Luna, from registration, no card** — rejected by the owner: what other apps do is Apple's trial.
- **Apple's introductory offer, 14 days, card on Apple's sheet** *(chosen)* — the familiar flow;
  renewal and the end of the trial are Apple's.

### When the trial is offered
- **During onboarding, before registration** — rejected: the subscription belongs to a Luna
  account, which does not exist yet.
- **Right after registration** *(chosen)* — the person has an account, and the offer comes in the
  first session, when most trials start.
- **Only at the first paid action** — kept as the second chance: closing the offer leads to the
  view mode, whose create actions bring it back.

### After the trial or the subscription ends
- **Lock the app entirely** — rejected: the photographer's own data held hostage.
- **A free tier with a limit (freemium)** — deferred: the limit would be a guess; loosening a free
  tier later is easy, tightening it is not (owner, 2026-10-08).
- **A view mode** *(chosen)* — everything stays visible, nothing new can be made.

### Crew members who register
- **Free view mode for crew** — first proposed, then **dropped by the owner**: everyone who
  installs and registers is offered the same trial and the same subscription.

### How purchases are verified *(agent's proposal)*
- **Own StoreKit integration** — receipts, renewals, refunds, grace periods and the App Store
  Server Notifications to an Edge Function, all hand-built.
- **RevenueCat over StoreKit** *(chosen)* — the SDK buys and restores; RevenueCat validates and
  sends a webhook to an Edge Function that records the account's access. Free up to $2,500 monthly
  tracked revenue, then 1%.

## Decision
1. **Price:** one plan, **$4.99 per month**, the same in every storefront (Apple's automatic
   conversion). A yearly plan was weighed on 2026-10-09 and deferred until the higher tier exists,
   so the paywall is redesigned for plans once, not twice (owner).
2. **Free trial:** **14 days, Apple's introductory offer**, offered on a paywall shown right after
   registration. One trial per Apple ID, as Apple grants it.
3. **Who pays:** everyone who installs the app and registers — photographers and crew members
   alike. Link readers pay nothing and need no account.
4. **Without access** — the paywall closed, the trial ended or the subscription lapsed — the
   account is in **view mode**: its own shoots and the shoots it is crew on (`US-009`) are visible;
   creating, editing and deleting are not, and each of those actions opens the paywall. Allowed
   without access: replying to an invitation, editing one's own profile, deleting the account.
5. **Links keep working** whatever the creator's subscription — crew and clients never see a link
   die over a payment.
6. **Nothing is deleted** when access ends.
7. **Access is decided on the server**, and enforced by the database, not by hiding buttons — the
   same principle as `ADR-013`. **The photographer's web app (`ADR-021`) and file storage (`EP-07`)
   belong to the planned PRO tier, not to this subscription** (owner, 2026-10-09): this subscription
   is the iOS app. Neither is built, so nothing is taken away from anyone. The plan names: this one is
   «Luna Shoots», the higher one «Luna Shoots PRO» (owner, 2026-10-09).
8. **Beta testers:** every account registered before the public launch has full access for
   **3 months from the launch date**, granted by the server, with no purchase.
9. **Ready for more plans** (agent, owner 2026-10-09 — "можемо десь закласти логіку під майбутню
   річну, і майбутні різні види підписок"): a yearly plan and a higher tier with the web app and file
   storage are planned later, not now. So from the start:
   - product IDs name the tier and the period — `com.lunashoots.ios.base.monthly`; later
     `…base.yearly`, `…pro.monthly`, `…pro.yearly`;
   - **one subscription group** holds every plan, so Apple handles moving between them;
   - the access the server records names the tier (RevenueCat entitlement `base`), not a yes/no —
     a higher tier is a second entitlement, not a rewrite;
   - the paywall reads the plans on offer from RevenueCat, not from the code.
10. **Provider:** RevenueCat over StoreKit; the RevenueCat customer is the Luna
   account id, so a subscription belongs to the Luna account, not to whoever is signed in to the
   Apple ID.

## Consequences
- **Accepted cost:** Apple's commission — 15% under the App Store Small Business Program (the owner
  must apply), 30% otherwise; RevenueCat's 1% past $2,500/month. A person who closes the paywall
  and never returns is lost.
- **Now easier:** a free tier later is a change to one server rule ("may create" becomes "may create
  while under N shoots"); web purchases later read the same access record.
- **Now harder:** every write path needs an access check in the database, including ones added
  later — a forgotten one is a free app. Reversing to free is easy; to a different price model,
  Apple-side work.
- **Owner's non-code work:** Paid Apps Agreement, banking and tax in App Store Connect; the Small
  Business Program; the subscription group and product with its introductory offer; a RevenueCat
  project; the DSA trader declaration (address and phone, public in the EU).
- **Legal:** the terms gain a subscription section and lose "free testing period"; the privacy
  policy names RevenueCat and Apple's payment processing.
- **Revisit when:** conversion data exists (freemium, a yearly plan, regional prices), or `EP-07`
  ships (a second tier).

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | The public launch date — after EP-09 is built and tested (owner, 2026-10-08) | The end of the beta testers' 3 months (`US-055`) |
