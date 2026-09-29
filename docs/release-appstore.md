# Shipping to the App Store

From "it builds on this Mac" to "a stranger installed it from TestFlight and it works". Written
2026-09-21 against the state of `main` at `d788b0c`.

**This is not `deploy-dev.md` with better words.** That document builds a throwaway environment
and says so in its own last section: *"Nothing here is a template for the real one — particularly
not 'publish everything in `dist/`' or 'confirmation off'."* This document is that real one.

---

## Where we actually are

Verified on 2026-09-21, not assumed:

| | |
|---|---|
| Stories | `US-001`–`US-027` all have commits. Plus `US-030`, `US-035`, `US-036` |
| Schema | 30 migrations, RLS + grants + soft-delete + matching triggers |
| Backend | One Edge Function, `link-gateway`, `verify_jwt = false` |
| `tsc --noEmit` | clean |
| `expo export -p web` | 54 routes, link routes renamed |
| iOS Debug (simulator) | `BUILD SUCCEEDED` |
| iOS Release (simulator) | `BUILD SUCCEEDED`, `main.jsbundle` 5.1 MB embedded |

So the product is built and it compiles. **Nothing below is about the code being unfinished.**
Everything below is environment, legal text, Apple paperwork, and four decisions that are the
owner's to make.

---

## Part 0 — Decisions that are not mine to make

`CLAUDE.md` rule 1. These are not implementation details, they are product questions, and they go
to the discovery repo as a story or an ADR **before** the code moves:

1. **Email confirmation on or off in production.** ~~It is off by deliberate decision — `US-001`
   AC-1 says registration lands on the shoot list, and a confirmation step contradicts that.
   Consequence in production is `open-questions.md` #31: an account that types an email it does
   not own inherits that person's crew rows across every photographer. For a closed beta of known
   testers this is a shrug. For the App Store it is a decision with a name on it.~~
   **Decided 2026-09-29 — on (`ADR-019`, `US-001` AC-1 amended).** #31's phone half stays open.
2. **Whether the photographer's web app ships.** `open-questions.md` #26, deferred with
   "revisit before v1 ships". Today `wrangler pages deploy dist` publishes all 54 routes —
   login, register, profile, shoot editing — to a public URL. Fix is a publish filter, ~30
   minutes. The decision is whether to fix it or to bless it.
3. **What the terms and the privacy policy say.** See Part 1. Content is legal, not technical.
4. ~~**The bundle identifier.**~~ **Answered by the owner, 2026-09-24: `com.lunashoots.app`.**
   Was `dev.luna.crm`, which reverse-resolves to a `luna.dev` nobody here owns, led with a
   segment every reader parses as "development", and ended in a word the product is no longer
   called. Permanent from the first upload, so it was settled before one.

   Two identifiers moved with it, both cheap now and expensive later:

   - `scheme: 'lunacrm'` → **`lunashoots`**. Once `lunashoots://reset` is in the prod redirect
     allow-list and inside recovery emails that have already been sent, changing it breaks links
     that are already out there.
   - The support address behind «Потрібна допомога? Напишіть нам» (`AuthScreen.tsx`) was
     `support@lunacrm.app`, a domain nobody registered — a tester tapping it wrote into the void.
     Now `support@lunashoots.com`.

   All three are *named* after `lunashoots.com` — unregistered as of 2026-09-24 — but only the
   support address actually needs it to exist. **Apple never checks domain ownership**, so
   `com.lunashoots.app` and `lunashoots://` work permanently whether or not the domain is ever
   bought. Reverse-DNS is a convention for avoiding collisions, not a claim Apple verifies.

   What genuinely needs a domain is in 1.5, and it is one thing.

---

## Part 1 — The blockers

Nothing ships until these are done. In rough dependency order.

### 1.1 The terms and the privacy policy do not exist

`AuthScreen.tsx:79` says it plainly: *"the terms checkbox now BLOCKS registration, as drawn — and
«умовами використання» and «політикою конфіденційності» still do not exist. It gates on agreeing
to nothing."* The two underlined phrases are `Text`, not links. They go nowhere.

This is a blocker three times over:

- **App Store Connect** has a mandatory Privacy Policy URL field. There is no submitting without
  one.
- **A checkbox that gates registration on unreadable documents** is the kind of thing App Review
  notices, and it is dishonest regardless of whether they notice.
- The app stores names, emails, phone numbers and photographs **of people who never installed
  it** — crew and clients entered by the photographer. That is the part a generic template will
  not cover.

To do:
- [ ] Write the privacy policy. Must cover: what is collected (account email, name, phone,
      Instagram/Telegram handles, shoot data, uploaded images and video), that the photographer
      enters third parties' contact details, where it is stored (Supabase, EU region), who can
      see it (anyone holding a link token — including that links never expire), retention, and
      how to delete (in-app «Видалити акаунт», and a contact address for non-users).
- [ ] Write the terms of use.
- [ ] Host both. Cheapest correct answer: two static routes on the same Cloudflare Pages project
      as the link surface — `/privacy` and `/terms`, Ukrainian.
- [ ] Wire the two underlined phrases in `AuthScreen.tsx` to open them.
- [ ] Put the privacy URL into App Store Connect.

### 1.2 There is no production environment

There is one hosted Supabase project, and `deploy-dev.md` built it as a throwaway with email
confirmation off and "nothing in it is precious". Real testers do not get that project.

- [x] ~~New Supabase project, `luna-crm-prod`, Frankfurt.~~ Created 2026-09-28 as
      `luna-shoots-prod` (`hjijvyensphkwyystgyq`), `eu-central-1`, in its own organization.
- [x] ~~**On the Pro plan, not Free.**~~ Non-negotiable for real users — see 1.3. On Pro.
- [x] ~~`npx supabase link --project-ref <prod ref>` then `npx supabase db push` — 30 migrations.~~
      Checked 2026-09-29: prod has all 31, the last `20260928120000`.
- [x] ~~`npx supabase functions deploy link-gateway`.~~ Two of three user flows are this function;
      without it every link is dead. Checked 2026-09-29: `ACTIVE`, `verify_jwt: false`.
- [x] ~~Verify RLS is actually on after the push. Dashboard → Database → Tables, every table.~~
      Checked 2026-09-29 with `supabase db query --linked`: RLS on for all eight `public` tables,
      none selectable by `anon`; the four `storage.objects` policies are `authenticated` only.
- [x] ~~Set the password minimum in the dashboard.~~ Set to 8 on prod, 2026-09-29.
      `supabase/config.toml` says `minimum_password_length = 8` and `passwordRules.ts` exports
      `MIN_PASSWORD_LENGTH = 8` — but **`config.toml` only configures local Supabase.** The
      hosted project defaults to 6 and must be changed by hand, or the app promises a rule the
      server does not keep.
- [x] ~~Authentication → URL Configuration: add `lunashoots://reset` to the redirect allow-list, and
      set `site_url` to the Pages host.~~ Done on prod 2026-09-29, `site_url` =
      `https://lunashoots.com`. **A missing entry fails at send time, not at open time**, which
      looks exactly like the email never being triggered.
- [x] ~~Decide and set the email-confirmation toggle per Part 0 item 1.~~ Set off 2026-09-28 — it
      was on by default and registration "succeeded" into «Увійти». **On since 2026-09-29**
      (`ADR-019`), after migration `20260929120000`, the `lunashoots://confirm` redirect, the
      «Confirm signup» template and a build carrying `(auth)/confirm`. Tested on an iPhone: the
      email arrives and its link opens the app.
- [x] ~~Storage: the `shoot-media` bucket is created by migration and is private — confirm it
      came up private on prod, and set a file size limit if none is inherited.~~ Checked
      2026-09-29 — `shoot-media` and `avatars` both private on prod. Size limit left at the
      hosted default of 50 MB, the same as local `config.toml`.

### 1.3 Supabase Free pauses after 7 days — and that breaks real users

`deploy-dev.md` already warns: *"A free Supabase project pauses after 7 days of no activity.
Un-pausing is one dashboard click, but a link that worked last week can be dead today, and it
looks like a bug in the app."*

For a tester who opens the app twice a month, that is not an edge case, it is the normal case.
And the people most likely to hit it are the ones on a link — crew and clients with no account,
no app, and no way to tell a paused database from a broken product.

Free tier also has no backup worth the name. There are 30 migrations' worth of real shoots about
to land in this thing.

- [x] ~~Supabase Pro, $25/month.~~ This is where "development costs $0" ends, and it should end
      here. Prod is on Pro as of 2026-09-29.

### 1.4 Password-reset email: the default sender will not carry a beta

`ADR-015` makes recovery email-based. Supabase's built-in SMTP is a shared sender, rate-limited
to a handful of messages per hour, and routinely spam-foldered. A tester who cannot reset a
password is a tester who is finished with the app.

- [x] ~~Custom SMTP on the prod project. Resend or Postmark; Resend's free tier (3k/month) is more
      than a beta needs.~~ Resend, 2026-09-29.
- [x] ~~A sending domain, verified (SPF/DKIM). This wants the custom domain from 1.5.~~
      `lunashoots.com` — `resend._domainkey` and `send.` SPF records are live.
- [x] ~~Translate the Supabase email templates to Ukrainian.~~ They are English by default, and
      `CLAUDE.md` rule 4 does not stop at the app's edge — a recovery email is user-facing copy.
      Done 2026-09-29; the recovery email arrives in Ukrainian.
- [x] ~~**Test the recovery link on a real iPhone, from Mail and from Gmail.**~~ The redirect is
      `Linking.createURL('/reset')` → `lunashoots://reset`, a custom scheme. iOS mail clients
      frequently refuse to make custom-scheme URLs tappable. If it does not work, the fix is
      Universal Links (associated domains + an `apple-app-site-association` file on the Pages
      host), which is a day of work, not an hour. **Find this out before the beta, not during.**
      Passed 2026-09-29 — from both Mail and Gmail the link opens the app; Universal Links are
      not needed.

### 1.5 A custom domain

`deploy-dev.md` lists this under "what this does not cover" with the right reasoning — *"a real
domain matters for trust when a stranger opens a link, not before."* A stranger opening a link is
now the whole product.

`https://luna-crm-107.pages.dev/s/…` arriving in a Telegram message from a photographer is a
link most people will not tap. It also gives the reset email a sender domain (1.4) and gives the
privacy policy a home (1.1).

**One hard requirement, and it is not the one people assume.** The identifiers settled in Part 0
item 4 do *not* need this domain — Apple never verifies domain ownership. What needs it:

| Wants a domain | Actually required? |
|---|---|
| **Sending password-reset email (1.4)** | **Yes.** Resend, Postmark and every alternative refuse to send from an address you cannot prove you control; a verified sending domain with SPF/DKIM is the price of leaving Supabase's rate-limited shared sender |
| Support address | No — any mailbox works. The code currently names `support@lunashoots.com`, and that is the only reason this domain in particular |
| Hosting the privacy policy and terms (1.1) | No — a `*.pages.dev` path is accepted by App Store Connect |
| Support URL | No, same |
| Bundle ID and URL scheme | **No** |
| A link a stranger will actually tap | Judgement, not a blocker |

So: **any domain you control satisfies the real requirement.** If one already exists, use it and
change the support address in `AuthScreen.tsx` to match. `lunashoots.com` is worth the ~$12/year
mainly because the product now carries that name and someone else can take it.

- [ ] Get a domain — `lunashoots.com` unless one already exists.
- [ ] Point it at the Cloudflare Pages project.
- [ ] Create the support mailbox and make sure a person reads it — `AuthScreen.tsx` already
      offers that address to every user on the login and registration screens.
- [ ] Update `EXPO_PUBLIC_LINK_BASE_URL` — then **rebuild both surfaces.** `EXPO_PUBLIC_*` is
      inlined at build time; changing `.env` changes nothing until the web export and the iOS app
      are both rebuilt.

### 1.6 App config: three fields that block an upload

`app.config.ts` today:

- [x] ~~`version: '0.1.0'` → `'1.0.0'`.~~ Apple does not reject `0.1.0`, but it is the version a
      human sees on the store page.
- [x] ~~No `ios.buildNumber`. Add `buildNumber: '1'`~~ and **increment it on every single upload** —
      App Store Connect rejects a duplicate build number outright, which is a slow way to learn.
- [x] ~~No export-compliance declaration. Add `ios.config.usesNonExemptEncryption: false`.~~ The app
      uses HTTPS only, which is exempt; without the flag App Store Connect asks the same question
      on every upload and blocks the build until answered.
- [x] ~~Bundle identifier.~~ Settled 2026-09-24 — `com.lunashoots.app`. See Part 0 item 4.

### 1.7 Controls that do nothing

`profile.tsx:139` — the «Сповіщення» switches are a documented stub: *"there is no
`expo-notifications`, no push-token table, no column to store a preference in and nothing that
would send either kind of message."*

Two working answers, and the cheap one is fine: **remove the two switches for v1.** The honest
alternative is building push, which is a feature, not a release task. Shipping a settings toggle
that resets on every launch is the one answer that is neither.

- [ ] Remove or implement.

---

## Part 2 — Apple paperwork, step by step

**Start at step 1 today**, whatever else is happening. Everything here is queues and approvals
you do not control, and none of it depends on a single line of the app being finished.

The whole of Part 2 is perhaps a day of actual work spread across one to two weeks of waiting.

### Step 1 — Decide the entity: Individual or Organization

This is the first fork and it sets the timeline for everything after it. It also cannot be
changed later without opening a new account and migrating the apps.

| | Individual | Organization |
|---|---|---|
| Seller name shown publicly | Your **legal personal name** | The company name |
| Needs a D-U-N-S number | No | **Yes** |
| Needs a registered legal entity | No | Yes |
| Realistic time to approval | 1–3 days | 2–5 weeks |
| Cost | $99/year | $99/year |

**Individual is almost certainly right here.** Luna is one photographer's tool going to a handful
of testers. The one thing to be sure of is that "seller: <your legal name>" on the store page is
acceptable — for some people it is not, and that is a real reason to choose Organization.

If Organization: **apply for the D-U-N-S number first and separately**, before enrolling. It is
free, Apple has a request form for it, and it takes roughly 5–14 business days on its own. It is
the single longest pole in this entire document.

- [x] ~~Decide. Write the decision down somewhere.~~ **Individual** (owner, 2026-09-29). The
      business is a ФОП — a registered sole trader, not a legal entity — which Apple enrols as an
      individual; the terms and privacy policy already name a sole trader. The store page shows
      the owner's legal name as seller. Moving to Organization later means a new account and an
      app transfer.

### Step 2 — The Apple Account that will own everything

- [ ] Use a **dedicated Apple Account for the business**, not a personal one already carrying
      iCloud photos and an iPhone backup. This account becomes the Account Holder and is
      awkward to change afterwards.
- [ ] Turn on **two-factor authentication** on it. Enrolment is refused without it.
- [ ] Put the credentials and the 2FA recovery in a password manager. Losing this account means
      losing the app.

### Step 3 — Enrol in the Apple Developer Program

- [ ] Easiest route: the **Apple Developer app on an iPhone**, signed in with that account →
      Enroll. Identity verification runs through the phone and is smoother than the web form.
      The web route is <https://developer.apple.com/programs/enroll/>.
- [ ] Have a **government-issued ID** ready to photograph. Apple asks for one from most
      individual applicants.
- [ ] Pay $99 USD. **Have a second card ready** — Ukrainian cards are declined by Apple often
      enough that it is worth planning for rather than discovering at 11pm.
- [ ] Wait for the "Welcome to the Apple Developer Program" email. 1–3 days for individuals.

Nothing below this line can start before that email arrives.

### Step 4 — Reserve the app name immediately

Do this the hour the account is live, before anything else.

- [ ] App Store Connect → Apps → **+** → New App. Platform iOS, primary language **Ukrainian**,
      bundle ID, and an SKU (any internal string, e.g. `luna-crm-001`).
- [ ] **App names are unique across the entire App Store**, and creating the app record is what
      reserves one.

**«Luna CRM» is already taken.** Checked 2026-09-23 against the iTunes Search API:

| | |
|---|---|
| Name | Luna CRM |
| Seller | Gamzat Magomedov |
| Bundle ID | `com.extradev.manager` |
| Category | **Business** — the same one this app would list in |
| Released / last updated | 2026-03-11 / 2026-08-02, v1.3.8 — actively maintained |
| Listing | <https://apps.apple.com/us/app/luna-crm/id6757653347> |

So the App Store **listing name** has to be something else. Two things soften that:

- **Only the store listing name must be unique.** The name on the home screen is
  `CFBundleDisplayName` — `app.config.ts`'s `name: 'Luna CRM'` — and carries no uniqueness rule.
  The product can stay Luna CRM on the phone while the listing reads, say, «Luna — CRM для
  фотографа».
- The existing app is Russian-language team-management software. Different audience, no overlap
  in what the products do.

What does *not* soften it: it sits in the same **Business** category, so a listing name that
merely decorates the identical root invites Guideline 4.1 attention. Prefer a name that is
genuinely distinct over "Luna CRM Pro".

- [ ] **Naming is the owner's decision, not the build's** (`CLAUDE.md` rule 1) — it goes to the
      discovery repo before it goes into `app.config.ts` or a store listing.
- [ ] Check candidates before committing to one:

```bash
curl -s "https://itunes.apple.com/search?term=<candidate>&entity=software&country=us&limit=10" \
  | python3 -c "import json,sys; [print(r['trackName'],'—',r.get('sellerName')) for r in json.load(sys.stdin)['results']]"
```

**A clean result is a strong signal, not proof.** The API only sees *published* apps; App Store
Connect also refuses names that someone reserved and never shipped. The authoritative check is
typing the name into App Store Connect, which is why step 4 happens the hour the account is live.

- [ ] **Check the trademark too, separately.** A free name in App Store Connect is not a free
      name in law, and "Luna" is heavily registered. <https://www.tmdn.org/tmview/> covers the
      EUIPO and many national offices at once; Ukraine's own register is at
      <https://sis.nipo.gov.ua>. Check the domain from 1.5 in the same sitting.

Creating this record needs the bundle ID to exist, so in practice step 5 happens a few minutes
before this one.

### Step 5 — Register the bundle identifier

- [ ] Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App.
- [ ] Enter the identifier from `app.config.ts`. **Permanent from the first upload** — see Part 0
      item 4, and settle `dev.luna.crm` before typing it here.
- [ ] Capabilities: **enable nothing.** No push (the toggles are stubs), no Sign in with Apple
      (`ADR-015` is email + password), no Associated Domains — unless 1.4 forces Universal Links
      for the password-reset email, in which case that one gets enabled later.

### Step 6 — Agreements, Tax, and Banking

The step people skip, and then a build sits in TestFlight refusing to go anywhere.

- [ ] Accept the **Apple Developer Program License Agreement** (App Store Connect prompts on
      first sign-in).
- [ ] App Store Connect → Business → **accept the Free Apps agreement.** A free app still needs
      this, and external TestFlight will not start without it.
- [ ] Paid apps — **only if Luna will ever charge money**: this opens bank details, a tax
      questionnaire and a W-8BEN as a non-US entity. It is a genuinely slow process and there is
      no reason to start it for a free beta. Skip until there is a price.

### Step 7 — Signing, without losing a certificate

`ios/` is gitignored and regenerated by `expo prebuild`, so signing state must not live only
inside it.

**EAS (recommended).** Apple's certificates and provisioning profiles are the classic way to lose
a weekend; EAS creates and stores them for you.

- [ ] `npx eas-cli login`
- [ ] `eas build:configure` — creates `eas.json`. **Commit it**; it does not exist in the repo yet.
- [ ] `eas credentials` once, to let EAS generate the distribution certificate and the App Store
      provisioning profile against the account from step 3.

**Xcode instead**, if adding no new tooling matters more: `npx expo prebuild`, open
`ios/LunaShoots.xcworkspace`, Signing & Capabilities → check "Automatically manage signing" and pick
the team. Works — the Release build already proved the native project compiles — but every
prebuild regenerates the project, and that is exactly where manual signing state goes missing.

### Step 8 — Invite the people who will test

TestFlight internal testers are **App Store Connect users**, not just email addresses.

- [ ] Users and Access → add each tester with an Apple Account. Up to 100.
- [ ] They install the **TestFlight app** from the App Store and accept the invite.
- [ ] No Beta App Review for this group — a build is installable minutes after it finishes
      processing.

External testers (up to 10,000, invited by email or a public link) do **not** need to be team
members, but that group is gated by Beta App Review and by the privacy policy from 1.1.

---

## Part 2b — The build pipeline

Signing is set up in step 7. This is what you run once it is, and once Part 1 and Part 3 are
done.

**With EAS:**

```bash
eas build -p ios --profile production
eas submit -p ios
```

**With Xcode:** `npx expo prebuild`, open `ios/LunaShoots.xcworkspace`, select "Any iOS Device",
Product → Archive, then Distribute App → App Store Connect.

Measured on this Mac, 2026-09-21: a clean Release build of this project takes **5 minutes**. The
cloud adds queue time; the upload and Apple's processing add 20–60 minutes before the build
appears in TestFlight.

**Whichever route: `EXPO_PUBLIC_*` is baked in at build time.** The `.env` on disk when the
archive is made decides which backend every tester talks to for the life of that build. Check it
before building, not after.

**Increment `ios.buildNumber` before every upload.** App Store Connect rejects a duplicate
outright, after the upload has finished.

---

## Part 3 — App Store Connect metadata

All of it Ukrainian first. The app is Ukrainian-only for link views and Ukrainian-by-default
everywhere else.

- [ ] **Screenshots, 6.9" iPhone.** Required. iPhone-only app (`supportsTablet: false`), so no
      iPad set is needed. The booted iPhone 17 simulator produces the right size.
- [ ] Name, subtitle, promotional text, description, keywords.
- [ ] **Support URL** — mandatory. A page on the custom domain, or a mailto-backed page.
- [ ] Privacy Policy URL — from 1.1.
- [ ] Category, age rating questionnaire.
- [ ] **Privacy nutrition labels.** Declare honestly: email address, name, phone number, user
      content (photos and video), and — the one that is easy to miss — **contact info about
      third parties**, since the photographer enters crew and client details. Nothing is used for
      tracking or advertising, so no ATT prompt is needed.
- [ ] **A demo account for App Review**, with credentials in the review notes. Everything is
      behind a login; a reviewer with no account sees a login form and rejects the app under
      Guideline 2.1.
- [ ] Review notes should also hand the reviewer **a live crew link and a live client link**,
      because two of the three flows are unreachable from inside the app and a reviewer will not
      discover them.

What is *not* required, checked rather than assumed: **Sign in with Apple** is only mandatory
when an app offers third-party social login. `ADR-015` is email + password, so it does not apply.
**In-app account deletion** *is* mandatory (Guideline 5.1.1(v)) and already exists —
`deleteOwnAccount()` → the `delete_own_account` RPC. Verify it works against prod, and confirm it
takes the Storage objects with it.

---

## Part 4 — Testing before anyone else sees it

The acceptance suites cannot help here. `deploy-dev.md`: *"Do not run the acceptance suites
against this project… They are hardcoded to localhost and should stay that way."* So this is a
manual pass, on a device, against prod.

- [ ] Register a fresh account. Confirm the password minimum is 8 on the server too.
- [ ] Reset a password end to end, from a real mail app on a real phone (1.4).
- [ ] Create a shoot, upload a gallery image, add a note image, add a location video.
- [ ] Add a crew member, copy the link, **send it to yourself in Telegram and open it there** —
      not by pasting into a browser. That is how a crew member actually meets this product.
- [ ] Open the client link. **Confirm the payload carries no `note` field at all** — `ADR-013`,
      `CLAUDE.md` rule 2. Check the network response, not the screen.
- [ ] Remove a crew member, then reopen their link: «Це посилання більше не діє».
- [ ] Delete a shoot, then reopen its links.
- [ ] Leave a link view open long enough for a signed media URL to expire, then interact —
      signed URLs expire, link tokens never do, and the payload is meant to be re-requested on
      media error.
- [ ] Delete the account, and confirm the shoots, crew, links and uploaded files go with it.
- [ ] Do a run with wifi off, on mobile data.

- [ ] **Add crash reporting before the beta, not after.** There is none today — no Sentry, no
      Crashlytics. A tester's crash is currently invisible; they will simply stop using it and
      you will not know why. Sentry's free tier covers a beta.

---

## Part 5 — TestFlight

Two flavours, and the difference decides the timeline:

**Internal testing.** Up to 100 people, each added to the App Store Connect team. **No Beta App
Review** — a build is installable minutes after processing. This is the right first step, and if
the first real users are a handful of people the photographer knows, it may be the only step
needed.

**External testing.** Up to 10,000 people by email or public link. Requires **Beta App Review**,
typically a day or two, and requires the privacy policy, a beta description and a feedback email.

- [ ] Upload a build; wait for processing (10–60 min).
- [ ] Internal group first. Install on a device that has never had a dev build.
- [ ] Then external, if the tester list needs it.

**No over-the-air updates.** `expo-updates` is not installed, so every fix — including a one-line
copy change — is a new native build, a new upload, and processing again. Worth knowing before the
beta rather than during it. Adding `expo-updates` later is a reasonable call; it is a change to
the release model, not a release task.

---

## Part 6 — Once it is live

- [ ] Someone watches Supabase usage. Pro has limits too, and uploaded video is the line item
      that moves.
- [ ] Confirm backups are on and have actually run.
- [ ] A support address that a person reads.
- [ ] A way to tell testers what changed, since they cannot see commits.

---

## What this costs

| | |
|---|---|
| Apple Developer Program | **$99/year** — mandatory |
| Supabase Pro | **$25/month** — see 1.3 |
| Domain | ~$12/year |
| Email (Resend free tier) | $0 |
| Cloudflare Pages | $0 |
| Sentry (free tier) | $0 |

**~$99 up front, ~$25/month running.** The `$0` in `architecture.md` Stage 1 was true for
development and stops being true here.

---

## How long

Assuming the code needs no new features — and it does not:

| | |
|---|---|
| Apple enrolment | 1–3 days (individual). 2–5 weeks if organization, because of D-U-N-S. **Start day one** |
| Part 1 blockers | 3–5 working days, of which the privacy policy is the unpredictable one |
| Signing + first upload | 1 day, or two if a certificate goes wrong |
| Manual test pass | 1 day |
| Beta App Review (external only) | 1–2 days |
| App Store review | 1–3 days typically, and a rejection restarts it |

**Realistically 2–4 weeks to real testers on TestFlight**, and the variance is almost entirely
outside the repository: Apple's queue, a domain's DNS, and how long it takes to get two legal
documents written.

The shortest honest path to *someone else holding it*: Apple enrolment + 1.2 + 1.3 + 1.6 +
internal TestFlight. That skips Beta App Review entirely and can be done in about a week — but
it does **not** skip 1.1, because the registration screen already asks people to agree to
documents that do not exist.
