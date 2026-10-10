# S-7 — A purchase through RevenueCat, and the server recording the account's access

- **Retires:** the risk named in `backlog-order.md` (EP-09 step 1) — that the provider choice
  (`ADR-023` decision 10, RevenueCat) does not hold up on a device
- **Date:** 2026-10-09
- **Branch:** `spike/s-7-revenuecat`
- **Status:** **the chain works end to end through RevenueCat's Test Store. The Apple sandbox run
  is still owed** — App Store Connect's Paid Apps Agreement is not active until Apple updates the
  owner's address and the W-8BEN is filed. See "Still owed".

## What the spike was for
`ADR-023` chose RevenueCat over a hand-built StoreKit integration and decided that access is
**decided on the server** (decision 7). Everything in EP-09 sits on two claims: a purchase made in
the app reaches our database without the app writing it, and the database can tell from what it
holds whether an account has access. Both are cheap to test now and expensive to discover wrong
under `US-052`'s database rules.

## What was built
Kept for `US-052` to build on (not throwaway):
- `supabase/migrations/20261009120000_account_access.sql` — `account_access`, one row per
  (account, entitlement), `expires_at` the whole answer. Read-own RLS; no client writes.
- `supabase/functions/revenuecat-webhook` — takes RevenueCat's webhook, learns **whose** access
  changed, re-reads that customer from `GET /v1/subscribers`, and replaces their rows. Event types
  are not interpreted, so order and retries do not matter.
- `src/features/subscription/PurchasesHost.tsx`, `purchases.native.ts` — the SDK configured with
  the Luna account id as the RevenueCat customer (`ADR-023` decision 10); web gets a no-op.
- Keys: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` — `.env.dev` the Test Store key, `.env.prod` the App Store
  key. Function secrets on dev: `REVENUECAT_WEBHOOK_AUTH`, `REVENUECAT_SECRET_KEY`.

Throwaway, deleted by `US-051`: `SpikeScreen.native.tsx`, the `spike-s7` route and its `__DEV__`
row in the profile.

RevenueCat (owner, 2026-10-09): project «Luna Shoots»; App Store app `com.lunashoots.ios` with the
In-App Purchase key; product `com.lunashoots.ios.base.monthly` in the App Store and in the Test
Store (month, $4.99, 2-week trial); entitlement `base`; offering `default` with package
`$rc_monthly`; webhook «Supabase dev», Sandbox, to the dev project.

## The run — Luna Dev on the owner's iPhone, dev backend, Test Store
| Step | App (SDK) | Server (`account_access`) |
|---|---|---|
| Opened | offering `default`, «Luna Shoots — 4,99 US$», intro «0,00 US$ for 2 WEEK» | no row |
| Buy | purchase confirmed in **3.5 s**; `base · TRIAL` | row `trial`, written **5.6 s** after the purchase began |
| Trial ended | `base · NORMAL`, new expiry | row `normal`, the same expiry |
| Renewals stopped | `none` | row kept, `expires_at` in the past → no access |

Test Store compresses time: the 2-week trial lasted ~7 minutes, then a few renewals, then it
stopped on its own — the lapse needed no manual cancel.

## Findings

### F-1 — The provider choice holds. *(the spike's question)*
Offering, price and trial come from RevenueCat, not from code (`ADR-023` decision 9); the purchase
goes through; the webhook reaches an Edge Function; the database ends up with the same answer as
the SDK, through trial, renewal and lapse. Nothing in the app writes access.

### F-2 — `expires_at` alone decides; `will_renew` lies after a lapse.
After the subscription ended, the row still said `will_renew = true` — RevenueCat never reported
an unsubscribe, because nobody unsubscribed; the store simply stopped renewing. **Access must be
`expires_at > now()` and nothing else** (as the migration says), and `US-053`'s «renews on …»
must also check the date, not just the flag. No scheduled job is needed for a lapse: time passes
and the answer changes.

### F-3 — The server lags the app by seconds. *(bears on `US-051` and `US-052` AC-3)*
The row appeared 5.6 s after the purchase started, ~2 s after the SDK confirmed it. Once
`US-052` makes the database refuse writes without access, a photographer who subscribes and
immediately taps «Створити» can be refused for those seconds. `US-051` needs to bridge it — wait
for the row after a purchase, or have the app ask the server to re-read the customer (the same
code as the webhook, called with the user's JWT). To decide when building `US-051`; not a
product question.

**Resolved in `US-052`** (2026-10-09): on the device the webhook once took about a minute, past
the app's 30-second polling. The app now calls `revenuecat-sync` right after RevenueCat reports a
purchase or restore — the same re-read the webhook does, for the caller's own account — and
access returned within seconds on the next run.

### F-4 — Trial eligibility is per customer, and the paywall has to ask.
After the trial was used, the same product came back with **intro: none**. `US-051`'s copy
«14 днів безкоштовно» must therefore show only to someone still eligible — Apple grants one trial
per Apple ID per subscription group (`ADR-023`). On the App Store the SDK's
`checkTrialOrIntroductoryPriceEligibility` is the check; the Test Store hid the intro outright.
The ineligible paywall is already `US-051` AC-6, with its copy («Оформити — {price} на місяць»,
no days — confirmed again by the owner, 2026-10-09).

### F-5 — `GET /v1/subscribers` creates the customer it is asked about.
The dashboard's test event carries a random uuid; the first version of the function asked
RevenueCat about it before checking our database, and left a phantom customer in RevenueCat. Fixed
(`9fce504`): the account is checked first. Worth knowing for anything else that calls the REST
API.

### F-6 — One RevenueCat project, two backends: route webhooks by app, not by environment.
TestFlight purchases are **sandbox** purchases. The dev webhook is filtered to Sandbox, so once
TestFlight testers buy from the production build, their events would go to **dev**. Before
anything is bought against prod, the webhooks need to be split by **app** — the Test Store app to
the dev project, the App Store app to the prod project (both environments) — or dev gets its own
RevenueCat project.

### F-7 — Setup notes
- Sandbox customers are hidden from the Customers list; they are under **Audiences → Sandbox**.
- A `supabase secrets set` with two values silently set only one; the webhook answered 401 until
  the missing one was set alone. Check with `secrets list`.
- In the current dashboard a product is attached to a package from the **offering's** Edit, not
  from the product page.

## Still owed
1. **The Apple sandbox run** — the real product with its 14-day introductory offer, bought with a
   sandbox Apple ID. Blocked on the Paid Apps Agreement (address change at Apple, then W-8BEN).
   The SDK path is the same as F-1; what it adds is Apple's sheet, Apple's trial, and
   `store = app_store` in the row.
   It must also show that **a used trial is not offered again** (`US-051` AC-6): the Test Store
   offered «Спробувати безкоштовно» a second time to an account whose trial had ended without
   converting (2026-10-10), so on dev builds the trial comes from the Test Store's product alone.
   On the App Store the app asks StoreKit's eligibility check instead — untested until this run.
2. **Which build runs it.** The App Store product exists only for `com.lunashoots.ios` — Luna
   Shoots, which is baked against **prod**. Either the run happens on prod (after `F-6`'s split,
   with the migration and the function deployed there), or a Luna Shoots build is pointed at dev
   for the run. **Owner's call.**
