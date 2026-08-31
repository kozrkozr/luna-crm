# Redesign log — ADR-017, screen by screen

- **Started:** 2026-08-28
- **Why this file exists:** the redesign runs one screen at a time against the
  HTML mockups in `~/Desktop/luna_redesign/`, built **as drawn** (owner's
  instruction, 2026-08-28). Where a mockup and the specification disagree, the
  mockup wins and the disagreement is written down here instead of being
  resolved on the spot. One documentation pass folds all of it into the
  discovery repo once every screen is done.
- **Nothing here is a decision.** Each entry is a question for the owner, or a
  fact the docs will need to absorb. Read it before updating
  `02-product/`, `04-tech/` or the ADRs.
- **Tests are not being run** during this phase, also per the owner's
  instruction. The full suite was last green at commit `aed5931`
  (395 assertions). Anything below may have broken an assertion that nobody has
  looked at yet — assume the suite needs a run before the next commit that
  matters.

---

## Auth — `auth-screen.html` → `src/features/auth/AuthScreen.tsx`

Login and registration combined onto one screen behind a segmented control.
Both routes (`(auth)/login`, `(auth)/register`) still exist and render the same
component with a different starting tab; switching tabs is state, not navigation.

### Needs the owner's answer

| # | What the mockup does | What the spec says | Consequence as built |
|---|---|---|---|
| A-1 | Labels the credential field **«Email або телефон»** | `ADR-015` makes the credential **email + password**, phone optional. Both screens this replaces carried a comment saying that label predates the ADR | The mockup's label ships. The field still validates as an email, so a user entering a phone number will be rejected by a field that invited it. **Either the label or `ADR-015` has to move.** |
| A-2 | Offers **«Забули пароль?»** | No password-reset flow exists anywhere in the codebase, and no story covers one | The control is present and does nothing when tapped. Dead on arrival, deliberately, so the screen matches the mockup |
| A-3 | Adds **«Підтвердіть пароль»** | Not in `US-001` | Field ships. The mockup validates nothing; blocking a mismatch is the minimum that makes it honest, so it blocks — and `passwordMismatch` is **new user-facing copy that no story or prototype supplies** |
| A-4 | Adds a **terms checkbox** with links to «умовами використання» and «політикою конфіденційності» | Neither document exists. No story asks for either | Checkbox ships, styled as the mockup draws it, gating nothing (the mockup does not gate either). Both phrases look like links and lead nowhere |
| A-5 | Password placeholder promises **«Мінімум 8 символів»** | Supabase enforces **6** (`supabase/config.toml`, `minimum_password_length`); the backlog specifies no minimum | The screen now tells the user 8 while 6 is accepted. `uk.passwordHint` («Щонайменше 6 символів») is no longer shown on this screen |
| A-6 | Titles the product **«Зйомки»** beside a «З» logo mark | `app.config.ts` calls the app **Luna CRM** | The screen says «Зйомки». If that is the product's name now, `app.config.ts`, the README and the discovery repo all disagree with it |

### Could not follow the mockup

**The role picker and social-handle fields stay**, though `auth-screen.html` has
neither. `US-001` AC-2 requires registration to be blocked without a role, with
an inline message and no account created, and `register()` cannot be called
without one. Removing the field would not restyle registration, it would break
it. Flagged rather than silently kept: **if the mockup is meant to be complete,
`US-001` AC-2 has to change first.**

### Fixed on the way through

**`src/components/ui/select.tsx` was dark-on-dark**, reported from the device on
the register form's role picker. Same root cause as `Input` and `Textarea`: RNR
styles the trigger `bg-background`, which after the inversion is the frame. Two
separate faults:

- the **trigger** rendered near-black, so the field did not match the Inputs
  above it — now the white field of §5.9, `h-11` to sit level with them;
- the **dropdown's own item text** was `text-foreground` (white after ADR-017),
  and that override beat the `text-popover-foreground` context the Content
  already supplies — which is why white text appeared on the white sheet.

Also brought the popover onto §5.13: radius 12, no border, and `elevation.overlay`
as a style rather than `shadow-md` classes, which do not reach Android.

**Worth noting for the docs:** this is the third component where stock RNR's
light-theme assumption survived the token swap. `Input`, `Textarea`, `Label`,
`Button` and `Card` were caught earlier; `Select` was missed because no themed
screen used it until now. **`alert-dialog.tsx` and `textarea.tsx`'s siblings have
not been audited** — anything in `src/components/ui/` that names `bg-background`
or `text-foreground` is suspect on sight.

### Notes for the docs pass, not questions

- The native header is gone from both auth routes. The mockup opens with its own
  intro block (logo, name, tagline), and a title bar above it would name the
  screen twice. `uk.loginTitle` and `uk.registerTitle` are now unused as titles;
  `registerTitle` is reused as the segment label.
- Only the active form is mounted, not both with one hidden. Besides being the
  right thing in React Native, `cdp.mjs`'s `login()` helper indexes
  `querySelectorAll('input')[0]` and `[1]` — with both forms mounted, index 0
  would be the register form's name field and every suite would fail.
- The submit button carries `id="auth-submit"`. The login tab and the login
  button are both labelled «Увійти», so `tapByText('Увійти')` now finds the tab
  first. **`cdp.mjs`'s `login()` helper needs updating to tap the id** — it has
  not been touched yet, and this will fail the whole suite until it is.
- The primary button is the mockup's dark `#1C1C1E` pill. Note that this is
  1.07:1 against the `#151517` frame — the defect the design system's §3.5
  names, where a button reads only because its label is white and has no edge.
  §3.5's own fix (the inverted white CTA) is what the edit screen uses, so the
  two screens now treat their main action differently. Worth settling.
- New dictionary keys: `appName`, `appTagline`, `showPassword`, `hidePassword`,
  `emailOrPhone`, `forgotPassword`, `confirmPassword`,
  `confirmPasswordPlaceholder`, `passwordMismatch`,
  `registerPasswordPlaceholder`, `termsPrefix`, `termsUse`, `termsAnd`,
  `termsPrivacy`. English added for the type's sake only — the auth screen sits
  outside the language provider and reads `uk` directly (`EP-05`).

---

## Shoot list — `calendar-ux-variants.html`, «Варіант 3» → `app/(app)/index.tsx`, `src/components/ShootCalendar.tsx`

Month/week calendar card, dark «Нова зйомка» pill, then a time-forward agenda:
shoots grouped under an uppercase date heading, each row led by a 4px stripe in
its status colour, with a time column, a hairline and the body beside it.

### Needs the owner's answer

| # | What the mockup does | What the spec says | Consequence as built |
|---|---|---|---|
| C-1 | Marks a conflict when a shoot starts **less than 60 minutes** after the previous one ends, with the tag «Менше години після попередньої» | No story, PRD requirement or review names any threshold. `US-031` was written *from this mockup* | Built as drawn, so `US-031` is now implemented ahead of its place in the wave. **The number is the mockup's, not Ilona's** — if 60 is wrong, one constant in `followsTooSoon` changes it |
| C-2 | Header carries a **search icon** | No search feature exists and no story covers one | Not built. The header keeps the language switcher and the profile button it already had |
| C-3 | Header avatar shows **initials and a green online dot** | There is no presence feature anywhere in the product, and the header does not load the signed-in user's name | Not built; the profile button stays as it was. Presence would be a new story, and the dot is the only thing in the design implying one |
| C-4 | Titles the screen **«Зйомки»** | `uk.myShoots` («Мої зйомки») was the title, from the earlier prototype | Now `uk.appName` — the same string the auth screen uses as the product name. Ties into A-6: if the product is not called «Зйомки», both screens are wrong together |

### Could not follow the mockup

**Weeks start on Monday, not Sunday.** All three variants draw `НД ПН ВТ …` and
compute with `d.getDay()`. The design system's own §9 calls this a defect —
Ukraine's week starts Monday — and following the mockup would ship a calendar
whose columns are wrong by one day. `t.weekdays` already began on Monday and
still does.

**The arrows navigate months.** In the mockup `v3prev()`/`v3next()` return early
unless the mode is `week`, so month navigation silently does nothing. `US-004`
AC-3 requires it, so both modes step.

### Notes for the docs pass, not questions

- **The rows use the Figma card** (owner, 2026-08-30): `bg-card` = `#1F1F22`,
  a `#27272A` 1px border, 14px radius — the crew card from the shoot-detail frame
  (node `1:79`), applied to both row kinds. **`calendar-ux-variants.html` draws
  `.agenda-row` white, so this is a departure from that prototype** in favour of
  the newer Figma file. The docs pass needs to know which source won.

  These rows were white, then dark, then white, then this, across two days. The
  earlier dark round failed for a reason that no longer holds: `--card` then
  equalled `--background`, so the row had no edge and the border was the only
  thing making it a row. The card token now lifts on its own.
- **`CrewRow` takes the same card, and no mockup covers that row at all.**
  `US-009`'s commitments are the app's own addition. The two kinds interleave in
  one list, so a different surface between the shoot rows would read as a
  rendering fault.
- `CrewRow` takes its border from the `row` variant now that every variant draws
  one (F-1, answered). `AgendaRow` still states its own, because it is a raw
  `View` rather than a `Card` — the stripe needs `overflow-hidden` on the same
  element as the radius. Both override the radius to 14px; the variants are 12.
- Two colours corrected while the rows were being reworked, both the mockup's and
  both now in the palette: the «менше години» tag is the `warning` pair as drawn
  (`#8A5A10` on `#FAEEDA`, `.agenda-warn-tag`) instead of a dark `secondary`
  chip, and the conflict ring is `warning-border` (`#E2A63F`, `.agenda-row.warn`)
  instead of `destructive`. It is a warning, not an error.

- **The hand-drawn header is gone entirely** (owner, 2026-08-29). It lost the
  avatar, then «Зйомки» — the `text-display` title beside the chevron, which was
  `t.appName` and so read as the app's name sitting against a back arrow — and
  with nothing left but a chevron the route was switched to the **navigator's**
  header, on the same options `new-shoot` uses (`title: ''`,
  `headerLargeTitle: false`, `headerBackButtonDisplayMode: 'minimal'`). One back
  control, drawn by the navigator on both screens. `ListHeader` is deleted.
  «Варіант 3»'s header row is gone rather than restyled.
- **The screen is titled «Календар»** (owner, 2026-08-29) — `calendarTitle`, new
  in both dictionaries. Not from any prototype: the mockup's title for this
  screen was «Зйомки», which was `t.appName` and went with the header it sat in.
  The new one names what the screen leads with. **The docs still call this the
  shoot list**, and `US-004`'s own copy is untouched. `US-016` AC-2's route to the
  profile — and therefore `US-015`'s language switcher, which lives on that
  screen — survives on `app/(app)/index.tsx`, which keeps its own avatar and is
  the screen this one is reached from. **If home ever loses its avatar, AC-2 has
  no route left.**
- Crew avatars on each row needed data the list never loaded.
  `listCrewNamesForShoots` (one `in` query for every shoot on screen, name
  column only) is new in `src/features/crew/api.ts`. A failure there is
  non-fatal — the avatars are decoration, so the rows draw without them rather
  than failing the screen.
- The status stripe now exists, as `STRIPE` in the list screen. That was the
  thing deliberately deferred to §10 Step 3's `ListRow` component during the
  theme pass; it arrived with this mockup instead. If `ListRow` is ever built,
  this is the code to move into it — the same stripe is specified for the
  timeline, agenda, history and shoot-card rows.
- `AgendaRow` puts `overflow-hidden` and the elevation on the same View, which
  is what lets the stripe reach the rounded corners. §5.2 warns that on Android
  that combination can clip the shadow. Untested — iOS only so far.
- New dictionary keys: `calModeMonth`, `calModeWeek`, `shootsWord`,
  `shootsPerDay`, `untilShort`, `conflictLessThanHour`.
- `uk.myShoots` is now unused. Left in the dictionary rather than deleted, in
  case C-4 comes back the other way.

### Header — root route only (`app/(app)/index.tsx`)

The shoot list now draws its own header (`ListHeader`), and `headerShown: false`
on that route makes room for it. Every other route keeps the native
`@react-navigation` header.

Why custom for this one: the mockup's root header is a **single row** with the
title inline beside the chevron, and iOS's native stack centres the title as
soon as a `headerLeft` exists. There is no native arrangement that produces
`‹ Зйомки … avatar` on one line, so this screen renders it.

| # | What the mockup does | Consequence as built |
|---|---|---|
| C-5 | Draws a **back chevron on the root screen** | Rendered as drawn, and it does nothing — this is the root of the stack, and the mockup shows a back arrow because it is one screen in a demo deck that navigates between variants. **A dead control in the top-left corner of the app's home screen.** Worth deciding: remove it, or give it a destination |
| C-6 | Puts a **search icon** left of the avatar | No search feature exists, so the language switcher takes that slot. It has to live somewhere on a signed-in screen (`US-015`) and this is where the mockup puts a control |
| C-7 | Avatar shows **initials + a green online dot** | Initials, from `useProfile()`. No dot — there is no presence feature (see C-3). Before the profile loads it renders a plain `avatar-header` circle rather than «?» |

The two controls the native `headerRight` used to carry both moved into
`ListHeader`, so nothing was lost: `US-016` AC-2 still reaches the profile (the
avatar is the way in) and `US-015`'s UA/EN toggle still sits beside it.

`useSafeAreaInsets` supplies the top padding. The mockups have no notion of a
safe area (§5.1's first pitfall) and without it the row sits under the status bar.

**C-6 revised (owner, 2026-08-28):** the language switcher is out of the root
header — it is the avatar alone, with nothing in the mockup's search slot. The
switcher moved to the **profile screen**, under a «Мова» label beside the logout
button. It could not simply be deleted: the header was the only place in the app
it existed, so removing it would have made `US-015` unreachable and the app
Ukrainian-only in practice.

**This will fail `us015-check` (17 assertions).** That suite drives the switcher
from wherever it used to be. The screen it lives on has changed, not the
behaviour, so the fix is in the suite's navigation rather than in the app — but
it has not been touched, per the instruction to skip tests. New key: `language`.

---

## Home — `home-screen.html` → `app/(app)/index.tsx` (new: `US-035`)

A new screen, so it got a story rather than only a log entry:
**`02-product/epics/EP-02-.../US-035-home-screen.md`**, with `EP-02.md` updated.
Six acceptance criteria, all derived from data that already exists — no table, no
column, no migration.

**Routing changed.** Home took the `(app)` index and the shoot list moved to
`/(app)/shoots` (owner's decision). Knock-on effects handled:

- login and register land on Home (`AuthScreen`, both forms);
- deleting a shoot now returns to `/(app)/shoots`, because `US-019` AC-1 says it
  disappears from **the list** — landing on Home after a delete would leave the
  reader unsure it worked;
- the shoot list's back chevron finally has a destination (C-5 is resolved by
  this: it was a dead control only while that screen was the root).

**Five acceptance suites navigate to the app root expecting the shoot list** —
`us009`, `us014`, `us015`, `us020`, `us030`. All five will now land on Home. The
app is right and the suites are stale; the fix is one navigation line each, to
`/shoots`. Not touched, per the instruction to skip tests.

### Decided by the owner, 2026-08-28

| # | Mockup | Decision |
|---|---|---|
| H-1 | Bell with an unread dot, whose handler shows «Гліб підтвердив участь…» | **Rendered inert.** No notification system exists anywhere — no table, no read state, no delivery. It is drawn and does nothing. **The dot is the only thing in the app that states something untrue**, which is the argument for either building notifications or dropping the dot |
| H-2 | Greeting «Доброго дня, Дарино» — the Ukrainian vocative | **No name.** We store one nominative `name`; declining it would mangle names the rules do not cover, on the home screen, addressed to the user |
| H-3 | Two stat cards, «Зйомок цього місяця» and «Очікують підтвердження» | **Removed** at the owner's request. The second was also ambiguous — it could count crew who owe an answer or shoots with anyone unconfirmed |

### Still open

**Countdown copy for today and tomorrow.** The mockup shows only «за 22 дні». A
shoot later today would render «за 0 днів» — wrong in Ukrainian and wrong in
meaning. `todayWord` («Сьогодні») and `tomorrowWord` («Завтра») are **new copy
that no story or prototype supplies.** Implemented because omitting the chip on
the day of a shoot would be worse, but they are inventions and want confirming.

Also unspecified: **no empty state for the next-shoot section.** With nothing
upcoming the label and card are both absent (AC-5) rather than showing invented
copy. A screen whose only content is two buttons may want something there.

### Notes for the docs pass

- **`home-screen-2.html` arrived (2026-08-29) and two of its three states are
  now built.** That file is a later revision of `home-screen.html` with a state
  switcher; the notes below replace the earlier "the mockup draws no empty state"
  reasoning, which was true of the first file only.

  **«Порожньо»** — an account with no shoots at all now shows `.empty-next`: a
  32px calendar outline at .55 opacity, «Ще немає жодної зйомки» (14/600), and a
  12.5px body capped at 260, on the frame. New keys `emptyNextTitle` and
  `emptyNextSub`, kept separate from the shoot list's `emptyShoots`/`Sub` —
  two screens, two prototypes, two texts. **One word changed from the mockup:**
  it writes «Натисніть «Створити зйомку» вище», naming a button renamed to «Нова
  зйомка» earlier the same day; a quoted label has to match the label.

  **«Сьогодні зйомка»** — when the next shoot is today the card goes amber
  instead of status-coloured: `.next-card.today .bar` and `.next-days.today` take
  the amber pair, and the section label becomes «СЬОГОДНІ» with a pulsing dot
  (1.6s, opacity 1→.4 and scale 1→.7, `ReduceMotion.System`). The mockup's own
  caption is the reasoning: «радше нагадування, ніж звичайний запис календаря».

  **`US-035` AC-5 still holds for the third absence** — shoots on the account but
  none upcoming keeps the section hidden, label included. `home-screen-2.html`
  has no state for it either. If it should say something («Немає запланованих
  зйомок»?), that is new copy and needs the owner.

### Needs the owner's answer

| # | What the mockup does | Consequence as built |
|---|---|---|
| H-1 | Colours the «СЬОГОДНІ» label `--amber-text` (`#8A5A10`) | **Not built as drawn.** That is a deep brown on the dark frame — **2.6:1**, on 11px bold uppercase text. Built with `warning-border` (`#E2A63F`) instead: 9.2:1, and it matches the pulsing dot the mockup already draws in that tone. Revert only if the contrast is acceptable to you |
| H-2 | Hides the **bell** in the «Порожньо» state, showing only the profile chip | Not built — the bell is always present here. It is inert anyway (`US-035` note), so hiding it on an empty account is a change with no data behind it either way. Say if you want it |
| H-3 | Keeps the two **stats cards** in «Сьогодні зйомка» | Still absent, per your earlier instruction to remove them |

- **The next-shoot card was brought back onto `.next-card`** (2026-08-29). Four
  drifts fixed: the status was a second `StatusPill` where the mockup writes it
  as text in the muted line («Нова · команда: 2 з 3 підтвердили»), the countdown
  chip wore the `new` status tones **hardcoded** — so a finished shoot showed a
  green stripe beside an amber chip — the location pin was the 📍 emoji rather
  than the mockup's 14px stroked pin, and the radius was 24 rather than 20.
  `StatusPill` is no longer used on this screen.
- **The stripe and chip are now the mockup's blue** (owner, 2026-08-29), by
  re-toning the status triples in `global.css` rather than by painting this card
  — see «Status colours come from the design system» below. The countdown chip
  is **fixed** to the `planned` pair, as drawn: the mockup's chip is blue whatever
  the shoot is, so a finished shoot shows a pink stripe beside a blue chip.

- `src/features/shoots/home.ts` is new: `nextShoot`, `daysUntil`, `pluralUk`,
  `distanceLabel`, `todayLabel`. `pluralUk` implements the three Ukrainian forms
  by hand, including the 11–14 exception — `Intl.PluralRules` is what §9 warns
  against, since Hermes ships a cut-down Intl and would silently fall back to
  English's two forms.
- "Next" means **dated today or later**, not "later than now": a shoot at 09:00
  is still the answer at 10:00, and the card should not vanish mid-shoot.
- Two new tokens, because the mockup uses colours nothing had: `--chip-on-dark`
  (the header controls' `rgba(255,255,255,.08)`, flattened over the frame to
  `#28282A` — RN has no translucent-over-background token, so **if the frame
  changes this must be recomputed**) and `--notify-dot` (`#E05A7E`).
- New dictionary keys: `greeting`, `weekdaysFull`, `createShootCta`,
  `viewCalendar`, `nextShootLabel`, `inDaysPrefix`, `dayForms`, `todayWord`,
  `tomorrowWord`, `crewConfirmedTemplate`, `notifications`.

---

## Clients table — `ADR-018` implemented (2026-08-29)

Built ahead of redesigning the create-shoot screen, which needs it.
`supabase/migrations/20260829100000_clients.sql`, applied to the local stack and
pushed to the hosted dev project.

- `clients` — id, creator_id, name, phone, instagram, notes, deleted_at.
- `shoots.client_id` NOT NULL; `client_name` and `client_contact` **dropped**,
  after a backfill of one client per existing shoot with **no retroactive
  dedup** (`ADR-018`).
- `soft_delete_client()`, a SECURITY DEFINER function — see below.
- `src/features/clients/api.ts`: search by name, find by phone, get, create.

**No screen changed.** `Shoot.clientName` / `clientContact` are still on the
type, now filled from a `clients(name, phone)` join, so every screen that shows
a client keeps working. Only `new-shoot.tsx` moved: it creates a client from
what was typed, then the shoot. **It still does no matching** — booking the same
person twice makes two client rows, the same outcome as the two text columns it
replaced. `US-029`'s search-and-dedup is the redesign of that form and owns
that step; `createShoot` deliberately cannot create a client itself, so every
path has to go through the one place the rule lives.

**A mistake worth recording.** The first version put `with check (auth.uid() =
creator_id)` on the update policy and a comment claiming that made a soft delete
possible "without a SECURITY DEFINER function". That was wrong, and a check
caught it: setting `deleted_at` still failed, and it fails identically with
`with check (true)`. Postgres applies the **SELECT** policy to the new row, so a
row marked deleted fails its own read policy.

`soft_delete_shoot` (20260826170000) had already documented this exactly — and
its closing note predicted `crew_members.removed_at` would need the same
treatment, which it did. This is the third table. The pattern is now: **any
table whose SELECT policy carries `deleted_at is null` needs a definer function
to soft-delete.** Worth stating once in the architecture docs rather than
rediscovering on the fourth table.

`soft_delete_client` exists even though no story asks to delete a client
(`ADR-018` open question 1 — the mockups have no delete action). Without it
`deleted_at` would be unreachable and `US-029` AC-7 would be a rule nothing
could exercise.

**Verified locally**, 11 checks: insert under RLS, the join the app reads, the
old columns gone, `client_id` NOT NULL, case-insensitive name search, soft
delete via the function, the removed row filtered by the policy, removing twice
returning false, and a second account seeing none of mine and unable to remove
them.

**The suites have not been run.** `us003`, `us005`, `us020` and others insert
shoots with `client_name`/`client_contact` and will now fail on a column that no
longer exists — a fixture change, not a behaviour change.

---

## Create shoot — `client-match-flow.html` → `app/(app)/new-shoot.tsx` (`US-002` + `US-029`)

The form rebuilt with the client search, the phone-match modal and a toast.
`US-029` was already written, so this implements it rather than needing a new
story.

**Presentation changed.** `new-shoot` was registered `presentation: 'modal'` and
slid up over Home as a sheet; it is now a pushed screen with a back chevron
(owner, 2026-08-29), which is how the mockup draws it and gives the form the
whole screen.

**The suggestion list floats, through a portal.** Two approaches were built and
thrown away first — a separate search screen (a misreading of what "separate
screen" meant) and an inline list. The owner chose the true floating dropdown.
It renders through the `PortalHost` the root layout already mounts, positioned
from the input's `measureInWindow` coordinates, because an absolutely positioned
child of a ScrollView is §5.13's trap. **Known limitation:** it is positioned
when it opens, not continuously, so scrolling the form with it open would leave
it behind — any tap outside closes it first, including on the backdrop.

### Needs the owner's answer

| # | What the mockup does | What the spec says | Consequence as built |
|---|---|---|---|
| S-1 | Collects **Локація** on the creation form | `US-002` Out of scope excludes it explicitly: location moved to `US-018` after Ilona's own prototype review, so that creation stays minimal | Built as drawn, at the owner's instruction (2026-08-29). **`US-002` needs amending** — its Out of scope now contradicts the screen. Nullable, and `US-018` still owns editing it |
| S-2 | One bottom button, «Створити зйомку» | — | **Two**, «Зберегти» and «Скасувати», at the owner's instruction. `uk.createShootCta` («Створити зйомку») was left serving the home screen's button, and has since been removed — see the note below |

### Notes for the docs pass

- **One label for one destination: «Нова зйомка»** (owner, 2026-08-29). Home and
  the calendar screen both push `/(app)/new-shoot` and used to say different
  things — `createShootCta` («Створити зйомку», from `home-screen.html`) and
  `newShoot` («+ Нова зйомка», from `calendar-ux-variants.html`). Both keys are
  **deleted from both dictionaries**; both buttons now use `newShootTitle`, which
  is also the title of the screen they open, and each renders the `+` itself
  rather than carrying it inside a translated string.

  The mockups genuinely disagree here, so this overrides one of them: **home's
  «Створити зйомку» is not built as drawn.** The reasoning is that the button
  opens a form and creates nothing — the shoot is created by «Зберегти» on that
  form — so a verb label promises an outcome the tap does not deliver, and
  competes with the real create button one screen later.

  `createFirst` («Створити першу зйомку») is deliberately untouched: the empty
  state is a one-off nudge, not a repeated action.
- `createShoot` gained `locationAddress`. It still cannot create a client:
  the form either links one or creates one, so `US-029`'s matching rule has
  exactly one place it can be bypassed — and it is the place that implements it.
- `Client.shootCount` comes from a `shoots(count)` aggregate in the same round
  trip. Soft-deleted shoots stop counting without a filter, via the shoots
  policy.
- **`src/components/Toast.tsx` is new.** RNR ships none (§7's matrix marks it
  ❌ and suggests `sonner-native`); this is ~40 lines on the existing portal, no
  new dependency. Durations from §3.7 — 2200ms, or 4000ms with an action.
- **The date row is labelled «Дата», not the mockup's «Дата і час»** (owner,
  2026-08-29). The two time fields below it carry «Початок» and «Кінець» of
  their own, which is what made the longer label redundant. The row now reuses
  the existing `date` key — the same one `shoot/[id]/edit` already used, so the
  two forms agree — and `dateAndTime` is **removed from both dictionaries**.
- `app/(app)/client/[id].tsx` is a **stub** so «Глянути профіль» has a
  destination. `US-028` builds the real thing.
- New keys: `clientField`, `clientNameSearchPlaceholder`, `newClientHint`,
  `viewClientProfile`, `unlinkClient`, `phoneField`, `phonePlaceholder`,
  `phoneBelongsToTemplate`, `yesSamePerson`, `noNewClient`,
  `creatingNewProfile`, `shootCountForms`, `clientRequired`,
  `clientSearchTitle`, `useTypedNameTemplate`, `clientProfileTitle`,
  `clientProfileComingSoon`. The last four were written for the abandoned search
  screen; `clientProfileTitle` and `clientProfileComingSoon` are still used,
  `clientSearchTitle` and `useTypedNameTemplate` are now unused.

---

## Form fields go dark (owner, 2026-08-29)

The design system's §5.9 specifies a **white** field on the dark frame — an
`#E9E8E4` hairline, `#111111` text, under a light-grey label. The owner chose
React Native Reusables' dark treatment instead. Applied to `Input`, `Textarea`,
`Select` (trigger and dropdown) and `DateField`'s trigger.

- Field fill is `bg-background` — the frame itself, which is stock RNR.
- Border is **`onDark-borderStrong` (#63636B), not the #34343B hairline.** With
  the fill matching the background, the border is the field's only boundary, and
  §3.5 requires ~3:1 for exactly that case (WCAG 1.4.11). The hairline is 1.48:1
  and would leave the field with no edge — the same defect §3.5 names for the
  dark CTA.
- Text `onDark`, placeholders `onDark-muted`.
- `--popover` flipped to `#1F1F22` with white text, so a select's dropdown and
  the client-search list match their fields. Those two are its only consumers.
- Both dropdowns' rows moved off the light press tint (`accent`, `surface-alt`)
  onto `screen-segment`, and off `ink` onto `onDark`.

**`DateField`'s picker sheet stays white**, deliberately. `DateTimePicker` is a
native view drawing its own text, and `app.config.ts` pins
`userInterfaceStyle: 'light'`, so that text is dark. A dark sheet would hide it.
Making it dark means switching the app's native appearance, which takes the
keyboard and every other system surface with it — a bigger decision than a
field colour.

**The phone-match modal was already dark** and nobody chose it: `AlertDialog`
uses `bg-background`, which the inversion turned into the frame. §5.13 specifies
a white modal card. It now looks consistent with the dark fields by accident.
Worth settling on purpose — either it follows the fields, or §5.13 stands and it
goes white.

---

## Touch feedback — haptics and press states (owner, 2026-08-29)

The complaint was that the controls do not *respond* like iOS ones. Two fixes,
neither of which needs `@expo/ui`:

**Haptics.** `expo-haptics` added, wrapped in `src/lib/haptics.ts` with four
verbs — `tapped`, `selected`, `succeeded`, `failed` — chosen by what the user
did rather than by which generator they map to. The wrapper exists for three
reasons: the link views are static web where the API does not exist (`ADR-012`),
haptics reject on a device with the Taptic Engine off or in Low Power Mode and a
missing tick must never surface as an unhandled rejection, and one vocabulary
keeps the choice a design decision instead of an import.

Wired into `Button` — one component every button in the app passes through, so
the whole surface gained feedback without a screen having to remember. Then the
hand-rolled Pressables: list rows, the next-shoot card, calendar days and
arrows, both segmented controls, the client suggestions, the filter pill, header
chevrons and avatars. Saving a shoot ticks `succeeded`; a blocked save ticks
`failed`.

**Press states.** `active:opacity-80` added alongside §3.7's
`active:scale-[0.98]` on every button, and `active:opacity-70` on rows that had
none at all. Scale alone is the one thing UIKit never does — every native
control fades on touch, and a control that only shrinks reads as a web page
imitating one.

**`expo-haptics` is a native module, so this needs `npx expo run:ios --device`
once** — a Metro reload will not pick it up.

### Not done, and worth knowing

The wider "doesn't feel native" problem has parts this does not touch:

- **Dynamic Type is ignored.** The type scale is fixed pixels, so the system
  text-size setting does nothing. The design system's own acceptance checklist
  requires testing at 130%, and we would fail it today.
- **No `KeyboardAvoidingView`** on the forms — §5.9 flags it and it is still
  missing.
- **No `keyboardDismissMode="interactive"`** on any scroll view.
- **The Toast is not an iOS pattern** at all; it is Android/web.
- **The role picker** is a popover where iOS convention is a wheel in a sheet or
  a `UIMenu`.

`@expo/ui` was reconsidered and rejected again: it is not a component library
(no Card, Badge, Avatar, dialog or calendar), NativeWind cannot style SwiftUI
views so none of the token layer reaches them, and it has no web implementation
while two of three user journeys are web. Same grounds as `ADR-010` Option B and
`ADR-016` Option C.

---

## Link view rebuilt against `Shoot Link Preview.dc.html` (owner, 2026-08-31)

`app/s/[token]/index.tsx`, the link gateway, `src/features/links/gateway.ts`, a
new `src/features/links/calendar.ts`, and migration
`20260831180000_decline_reason.sql`.

**This is the `ADR-013` surface** — two of the product's three journeys, and the
one screen where a mistake shows one audience another's data.

### `shoots.notes` now crosses the network, to crew only

The design shows «Нотатки від організатора» badged «Клієнт не бачить». The
column had reached nobody since it was added; the owner approved sending it to
crew.

**Verified after the change**, because this is the rule CLAUDE.md leads with:

| | line | selects `notes` |
|---|---|---|
| `crewPayload` | 239 → select 256, return 300 | **yes** |
| `clientPayload` | 417 → select 428 | **no** |

`ClientLinkPayload` has no `notes` key at all — not `notes: null` — so `US-026`'s
"not even an empty one" holds at the type level as well as the wire.

**The type system caught a real hazard on the way.** `absolutise` spread one
shared `shoot` object into both payloads; the moment `notes` existed on one and
not the other, it stopped compiling. It is branched per audience now, so the
client's `shoot` is *constructed* without the field rather than trusted to omit
it.

### Times were missing entirely

`shoot` was `{ date, locationAddress, locationNote, locationAttachmentUrl }`.
`US-030` added start and end on 2026-08-28 and **the gateway was never
updated** — so no link view has ever been able to show a time, and the design's
hero is a 28px time range. Fixed for both audiences; not a design change, a gap.

### The organizer card

`users` name, role, phone and handles now reach both audiences — **the first
thing from that table ever to do so** (owner's decision). `email` is not among
it: it is the login credential and the crew-matching key, and nothing on the
screen asks for it.

What it costs, stated once: the link is shareable, so the photographer's number
reaches anyone it is forwarded to. That is true of every field on the payload and
is why the footer calls the link private.

### `US-008` reversed, deliberately

«Змінити» lets a crew member revise an answer. `US-008`'s Out of scope says **"a
submitted response is final"**, `20260826190000` records it, and the gateway
enforced it with `.eq('response', 'pending')` — now removed. **`US-008` needs
amending, and that migration's note is out of date.**

The two conditions that gate ACCESS are untouched: a removed crew member's link
still acts on nothing, and the row must be the one the token resolved to.

`decline_reason` is new, and the grant stays column-level — `grant update
(response, decline_reason)`, never `grant update`, for the reason 20260826190000
gives: this is the one component reachable by anyone holding a URL. The reason is
capped at 120 characters server-side, cleared on a confirm so a changed answer
leaves nothing stale, and free text from an anonymous caller is bounded rather
than trusted.

### Not built

| # | What the design does | Why not |
|---|---|---|
| L-1 | «**Діє до 20 вересня 2026**» | `ADR-014` has **no expiry column, deliberately** — validity is derived from soft deletes. The line would be untrue on every link. Dropped; «Приватне посилання — не публікуйте його» stays, which is true |
| L-2 | «Дарина **запросила** вас на зйомку» | Past-tense agreement with the organiser's gender, which nothing holds. Neutral «Запрошення на зйомку від {name}», same reason as H-14 |
| L-3 | «Дарина чекає відповідь **до 17 вересня**» | No response deadline exists anywhere in the data model |
| L-4 | «KULT Studio» beside the organiser's role | No studio column — the same gap the profile screen has (P-3) |
| L-5 | Response badges on every row **for the client too** | Crew link only. `US-026` gives a client the crew list; nothing says an internal confirmation state is theirs to read |

### Worth knowing

- **«Додати в календар»** is `src/features/links/calendar.ts` — a Google URL and
  an `.ics` data URI. No schema change. A shoot with no times (`US-030` AC-6)
  becomes an all-day event rather than an invented 09:00, and iCalendar's field
  separators are escaped or an address like «вул. Хрещатик 22, Київ» truncates.
- **The screen filters nothing.** It renders what it was handed; the `isCrew`
  check on the notes block is what satisfies TypeScript, and the SELECT is what
  satisfies `ADR-013`.

---

## Client gets Instagram and Telegram (owner, 2026-08-31)

Both fields on the create form and the shoot's edit form, matching what the crew
form now collects. Migration `20260831160000_client_telegram.sql`.

**`clients.instagram` has existed since `ADR-018` (20260829100000) and no screen
ever collected it** — the create form asked for a name and a phone. So this makes
a dead column live and adds `telegram` beside it. Third table in two days to gain
that field, after `users` and `crew_members`; **no story defines any of them**.
`US-002`, `US-029` and `ADR-018` need amending.

### These propagate, and the name still does not

`updateClient` writes the `clients` row, so changing a handle changes it on every
shoot that person appears on. That is the point of `ADR-018` giving a client
cross-shoot identity, and it is the argument for editing contacts from a shoot at
all: **a stale phone number everywhere at once is the bug this fixes.**

The asymmetry with the NAME is deliberate and is worth settling in the client
discussion the owner has parked:

- **handles and phone** — edited from either shoot form, propagate everywhere;
- **name** — never written by either form. Typing a different one creates a NEW
  client and re-points this shoot. Renaming belongs on the client's own profile
  (`US-028`), because a name is how the creator recognises the person in a list
  and rewriting it across their history is a different kind of change.

`UpdateClientInput` has no `name` field, so that rule is held by the signature
rather than by remembering it.

### Worth knowing

- **Picking a client on the create form fills their handles in**, the way `US-029`
  AC-3 already fills the phone. Editing them after picking writes back — leaving
  the form's values behind would silently discard them.
- **The edit form only writes when the shoot kept its client.** A client created
  from a typed name already carries the values, so writing again would be a
  second round trip for nothing.
- **Nothing reaches an anonymous audience.** The gateway's ShootRow has never
  selected anything from `clients`, so a handle added here stays with the creator
  by construction — not by a filter anyone has to remember.
- The client's Telegram now shows in the person sheet, which had been passing
  `telegram: null` because the column did not exist.

---

## Telegram on a crew member (owner, 2026-08-31)

A «Telegram» field under Instagram in the add-crew form's «Новий контакт» tab.
Migration `20260831140000_crew_telegram.sql`.

**No story defines it.** `US-005` collects a name, a role, one contact and one
optional Instagram handle. This is the same field `users` gained a day earlier
(`20260831100000`); `US-005` needs amending along with `US-001`.

It threads through `AddCrewMemberInput`, `CrewMember`, `CREW_COLUMNS` and
`PastCrewMember` — the last so that re-adding someone from «Мої контакти» keeps
the handle rather than dropping it.

**Shown in the person sheet**, beside Телефон and Інстаграм. That is the only
surface where a crew member's contacts are read, and a field nothing displays is
a field nobody would fill in.

### The person sheet's primary action follows the contact (owner, 2026-08-31)

Was «Зателефонувати», disabled whenever there was no phone — which is most crew
members added with a handle. Now:

- a **Telegram or Instagram handle** gives «Написати», opening `t.me/…` or
  `instagram.com/…`;
- **a phone and nothing else** gives «Зателефонувати»;
- **neither** disables the button, as before.

Telegram wins when both exist: it is the one of the two that exists to be
messaged, where an Instagram profile is a page you then have to find the DM
button on.

**The icons are not the brand marks.** `lucide-react-native` ships no brand
icons at all in this version — no Instagram, no Telegram — so the button uses
`send` (a paper plane) for Telegram and `at-sign` for Instagram, both already in
the app's icon set and both distinguishing the destination. **Real marks would
mean adding an icon package or SVG assets**; path data for a logo is not
something to approximate from memory, so it is flagged rather than guessed.

### Needs the owner's answer

| # | What | Consequence as built |
|---|---|---|
| T-2 | The «Написати» button uses `send` / `at-sign` where the owner asked for the **Telegram and Instagram marks** | Lucide has no brand icons. Supplying the two SVGs, or naming an icon package, is all it needs — `react-native-svg` is already a dependency |
| T-1 | **The link gateway sends `instagram` to both crew and clients; it does not send `telegram`** | Both crew payloads are built from explicit column lists and neither names the new column, so the handle reaches nobody but the creator. That is the safe default, not a considered asymmetry — widening an anonymous payload is the expensive direction to undo, so it was not done on a field no story asks for. **The visible consequence is that a link view shows a person's Instagram and not their Telegram**, which will read as a bug rather than a decision. One line in each payload closes it |

---

## Profile rebuilt against `Edit Profile.dc.html` (owner, 2026-08-31)

`app/(app)/profile.tsx`, plus `src/features/auth/profile.ts`, a new
`app/(app)/password.tsx`, and migration `20260831120000_profile_editing.sql`.

**The screen was read-only** — five fields, a language switcher, a logout
button. `US-016` is *viewing* a profile; nothing wrote `public.users` except the
language preference. This makes it an editing surface, so **`US-016` needs
amending**, and so do `US-001` (roles are no longer a fixed set) and `US-013`
(changing a password is not login).

### Decisions

| # | Question | Answer |
|---|---|---|
| P-1 | Email is the login credential | **Read-only row**, with «Це ваш логін. Щоб змінити — напишіть нам.» Editing it means `auth.updateUser`, `double_confirm_changes = true` mails BOTH addresses, and `public.users.email` is the crew-matching key (`match_contact_to_user`). Half of that shows an address you cannot log in with; the other half leaves crew matching on the old one |
| P-2 | The design has no language switcher | **A «Мова» row was added anyway.** `US-015`'s switcher lives ONLY here — following the design would make English selectable nowhere, which is a story regression, not a restyle |
| P-3 | Four things with no data | **Built:** the three stats, and the avatar photo. **Not built:** «KULT Studio» (no column) and the version line (`app.config.ts` says 0.1.0 where the design says 1.0, and it spells the product a fourth way — A-6) |
| P-4 | Two account actions with no mechanism | **Both built:** «Пароль · Змінити» and «Видалити акаунт» |

### The avatar reverses F-4, narrowly

redesign-log **F-4** recorded that avatars are initials on purpose: the mockups
drew emoji picked by hashing a name, which asserts a skin tone, gender and age
the person never gave.

That objection is about **generating a likeness for someone who supplied none**,
and it does not apply to a photo the account holder uploads of themselves. So the
account holder may have one; **crew and clients keep initials**, because nobody
has uploaded anything for them and nothing may be invented. New `users.avatar_url`
and an `avatars` bucket — its own bucket, not a prefix under `shoot-media`, whose
policies key ownership off the first path segment being a SHOOT id.

### «Видалити акаунт» is the one irreversible action in the product

`delete_own_account()`, SECURITY DEFINER, **taking no id** — it deletes
`auth.uid()` and nothing else, so there is no argument to get wrong. `auth.users`
cascades to `public.users`, which cascades to every shoot, and each shoot to its
references, crew members and access links. Every link the photographer ever
shared stops working.

It is **not** a soft delete and cannot be: the point is to remove the account.
That makes it the single exception to "v1 has no hard deletes anywhere"
(20260825140000), and it is worth an ADR of its own rather than a log entry.

It uses the same confirmation `US-019` and `US-022` use — a real iOS alert on
device — and the question names what goes.

### Worth knowing

- **Nothing collects a current password.** Supabase's `updateUser` authenticates
  by the session and offers no way to verify one, so a field collecting it could
  not check it. Holding a live session is the protection. Re-authentication
  before sensitive changes would need its own mechanism, not a field.
- **The stats are derived, and «У команді» counts PEOPLE.** `ADR-003` makes one
  colleague three rows across three shoots; counting rows would report a crew of
  nine for three people.
- **`LogoutButton` is deleted.** Its only caller was this screen, and the design
  draws logout as a destructive text row rather than a filled button. The call
  moved to `signOut()` in the feature module.
- **The discard confirmation is a bottom SHEET here**, where the shoot's edit
  screen uses an alert dialog for the same question. Followed as drawn; one of
  the two should move, and guessing which is not a redesign decision.
- The role chips are the third copy of that control (auth, add-crew, here).
  Worth extracting on the next screen that needs one.

---

## Auth rebuilt against `Auth.dc.html` (owner, 2026-08-31)

`src/features/auth/AuthScreen.tsx`, plus a new `app/(auth)/reset.tsx` and
`src/features/auth/passwordReset.ts`.

**This closes three of the four defects the first auth pass logged**, and
sharpens the fourth.

| # | Was | Now |
|---|---|---|
| **A-1** | «Email або телефон» on a field that validates as an email | **«Email».** The owner reaffirmed `ADR-015` on 2026-08-31 after asking whether phone login was possible without an SMS provider — see below. The design's «Надішлемо SMS з кодом» hint is not built |
| **A-2** | «Забули пароль?» present and inert | **Works.** Two screens here + `(auth)/reset`, over `resetPasswordForEmail` |
| **A-3** | «Підтвердіть пароль» — a field no story defined, with invented mismatch copy | **Gone.** The design does not draw it |
| **A-5** | Placeholder promised 8; backend enforces 6 | **Says 6, validates 6.** No story specifies a minimum, so 6 is the only reviewed number. `MIN_PASSWORD_LENGTH` is the single source and mirrors `config.toml` |
| **A-4** | Terms checkbox gating nothing | **Now BLOCKS registration**, as drawn — and both documents it names still do not exist. It gates on agreeing to nothing. Not resolved; made sharper |

Five dictionary keys went with them: `emailOrPhone`, `confirmPassword`,
`confirmPasswordPlaceholder`, `passwordMismatch`, `registerPasswordPlaceholder`.

### Why phone login was ruled out

The design accepts a phone as the credential and promises an SMS code. Asked
whether that could work without a provider: **technically yes** —
`[auth.sms] enable_confirmations` is already false, so phone + password with no
OTP is a supported shape. It was rejected because of what `users.phone` does
here.

`users.phone` is the **match key that links an account to crew rows across other
photographers' shoots** (`US-009`, `match_contact_to_user` → `normalise_phone`).
An unverified phone at signup means registering with someone else's number and
immediately seeing their bookings across accounts — the exact failure S-5 F-2 was
designed against, arriving through a different door. Nothing about SMS fixes that
except SMS itself.

So: email is the credential, phone stays a profile field, `ADR-015` stands.

### Password recovery

`resetPasswordForEmail` → «Перевірте пошту» → the emailed link opens
`(auth)/reset`, which sets the new password and lands in the app.

Three things worth knowing:

- **The redirect must be allow-listed or Supabase refuses to send**, and it fails
  at SEND time — which looks exactly like the email never being triggered.
  `lunacrm://reset` was added to `additional_redirect_urls` in `config.toml`;
  **the hosted project needs the same entry** under Authentication → URL
  Configuration.
- **Success never means the address exists.** `requestPasswordReset` returns ok
  either way, so this screen cannot be used to discover which emails have
  accounts — the same reasoning `login` gives for collapsing its failures.
- **`(auth)/reset` is not in the design.** It draws the request and the
  confirmation but not the form that changes anything; the flow is unreachable
  without it, so it was built and its copy is new.

### The strength meter is monochrome

The design colours its three bars `#f87171` / `#facc15` / `#4ade80`. Amber and
green would be the only hues to return after 2026-08-30 removed all seven
application scales, so strength reads as **how many bars are filled** — the
channel the design already uses too — with the word beside them saying it
outright. Weak keeps `destructive`, the one surviving hue: a password the form is
about to reject is the same class of thing as any other refusal.

### Two additions with no story behind them

- **«Інша роль»** opens a free-text field. `users.role` is `text` so it stores,
  but **roles stop being a fixed set** — the glossary defines five and `US-001`
  AC-2 speaks of choosing one. Both need amending.
- **Telegram** — `users.telegram`, migration `20260831100000`, carried through
  `handle_new_user` so it is written in the same transaction as the auth user
  (the window `20260825130000` exists to close). `social_handle` keeps its name
  rather than being renamed to `instagram`: a rename is a migration, a trigger
  change and a data move to gain one better name.

### Still open

- **A-4** above — the terms documents.
- **A-6** — the product's name. The screen says `uk.appName`, `app.config.ts`
  says «Luna CRM», and this design says «LunaCRM». Three spellings, unresolved.
- **`logo.png`** is now in the design project. Both the current screen and this
  design still draw a letter in a rounded square; the asset is not used.

---

## «Клієнт» search parked on the edit screen (owner, 2026-08-31)

`ClientField` — `US-029`'s search, its suggestion list and «Переглянути
профіль» — is replaced by a plain `Input` on the shoot's **edit** screen, for a
discussion the owner wants to have before shipping it there. **Temporary, and
nothing was deleted:** the create form still uses `ClientField`, so `US-029` is
intact, and restoring this is swapping one block back.

**Save semantics are deliberately unchanged**, which is the point of doing it
this way rather than rewriting the field:

- name untouched → the shoot keeps its `clientId`, no client is written;
- name changed → the typed name becomes a NEW client at save, exactly as
  unlinking and retyping did before;
- name changed and then changed back → the original link is restored, so an
  edit-and-undo does not strand the shoot on a client it never had;
- **still never a rename.** An `ADR-018` client has cross-shoot identity, so
  renaming here would silently rewrite every other shoot that person is on.

**The cost while it is parked:** typing a name that already belongs to a client
creates a second one, because nothing is looking any more. That is precisely
what the search prevented, and it is the thing to weigh in the discussion.

---

## «Клієнт» is editable on the edit screen (owner, 2026-08-30)

It was a read-only row, and the comment on it said why: **`US-018`'s Out of scope
excludes editing the client** — "only date and location were asked for… if that's
also needed, it's a new ask, not assumed here". The owner made the ask.
`US-018` needs amending.

It is the same `ClientField` the create form uses, so searching, linking and
unlinking behave identically on both screens. `UpdateShootInput` gained
`clientId`, and `updateShoot` writes `client_id`.

### It moves a shoot. It does not rename a client.

The distinction is load-bearing and it is why this is not simply a text input:

- **Picking a different client** re-points `shoots.client_id`. Only this shoot
  changes.
- **Typing a name** creates a NEW client at save and points this shoot at it.
- **Nothing here ever writes to an existing `clients.name`.** An `ADR-018`
  client has cross-shoot identity — renaming would silently rewrite every other
  shoot that person appears on. Renaming belongs on the client's own profile
  (`US-028`, `app/(app)/client/[id].tsx`), which is not built.

### Worth knowing

- **Clearing the field is now reachable**, so the edit form validates a client
  the way the create form does — blocked, with «Вкажіть клієнта».
- **No phone dedup here.** `US-029` AC-4's "this number already belongs to {name}"
  prompt needs a phone field, and this form has none. Typing an existing
  client's name and ignoring the suggestion list creates a duplicate — the same
  outcome `US-029` AC-5 already allows on the create form ("answering no creates
  a second profile"), reached a different way. The search suggestions are what
  normally prevent it.

---

## Edit shoot aligned with New Shoot (owner, 2026-08-30)

«Дата й час», «Початок», «Тривалість» and «Локація» are now **the same
component** on both forms, not two files kept in step — which is the only
version of "the same" that survives the next change to either.

`src/components/ShootFormFields.tsx`: `ShootWhenFields` (month grid, the rail
behind «Інший час», the ± duration stepper, the summary bar, the clash warning),
`LocationChips`, `SectionLabel`, and the `HALF_HOURS` / `endOf` /
`durationBetween` / `DEFAULT_DURATION_MINUTES` helpers.

### What the edit screen lost

A `DateField` row for the date, a «Початок» + «Завершення» pair, and a read-only
«Тривалість: 3 год» line. The end is **derived from a duration** now, exactly as
on the create form; `US-030` still stores both, because the end is computed at
save.

### Three things that are NOT the same, each deliberate

| | Why |
|---|---|
| **`allowPastDates`** on edit | The create form refuses past dates as drawn. The edit form must not inherit that: a shoot that has already happened is still editable, and with the past locked **its own date would render dimmed and untappable** — the field would look broken on exactly the records most likely to need correcting. New prop on `MonthPicker` |
| **The clash check excludes this shoot** | It is in `listShoots()` too, at the very times the form is showing, so without the filter every edit would report the shoot overlapping itself |
| **`start` stays nullable** | `US-030` AC-6: a shoot created before that story has neither time. The rail opens with nothing selected and save is blocked until a slot is picked. Defaulting to 09:00 like the create form would quietly fill a field nobody chose, which is not what "the next edit collects them" means |

### Also

- `timeErrors` was a `{start, end}` pair and is a single `startError` — there is
  no end field left to be missing, which removes one of the two ways this form
  could refuse to save.
- **`SectionLabel` is shared now.** There were five copies of the same 12/600
  uppercase label (home, shoot detail, edit, new shoot, and inline on the
  calendar); the note in the Home entry said it was worth extracting if a third
  appeared. It was well past three.
- `DurationLine` and both local `GroupLabel`s are gone with it.

---

## New Shoot rebuilt against `New Shoot.dc.html` (owner, 2026-08-30)

`app/(app)/new-shoot.tsx` (`US-002` + `US-029`). Read through `DesignSync`.

### The time picker was an open question

`Time Picker Options.dc.html` — new in the project — lays out **six** variants
(1a–1d, 2a, 2b) and ends with the designer's recommendation of **2a**, while
`New Shoot.dc.html` embeds **2b**. The two files disagreed, so it went to the
owner: **2b**.

So: a horizontal rail of half-hour slots (08:00–20:00) is the primary control,
«Інший час» swaps it for the platform picker, and duration is a ± stepper in
half-hour steps (30–720 min).

**The end time is derived, not entered.** `US-030` AC-5 still stores both — the
form collects a start and a duration and computes the end at save — so the
columns and the AC are unaffected. What changed is only how the pair is
collected, and it removes one of the four ways this form used to be refusable.

`<input type="time">` does not exist in React Native; «Інший час» opens the
app's own `DateField`, which is what every other time on this surface uses.

**The duration opens at 1 год, not the design's 3** (owner, 2026-08-30). Three
is what the prototype's fixture shoots run; an hour is the smaller assumption to
make for the reader, and a duration that is too short is easier to notice than
one that quietly saved as three hours.

### `shoots.notes` exists now

Migration `20260830160000_shoot_notes.sql`. **No story defines this field** — it
had been drawn three times and skipped three times (S-1, then H-1) for exactly
that reason. The owner asked for the column, which unblocks all three at once:

- the new-shoot form's «Нотатки» group (this screen);
- the shoot detail's «Нотатки» card — **restored**, hidden in client view;
- the edit screen's «Нотатки» group — **restored**.

`US-002`, `US-018` and `US-035` all need amending to describe it.

**Visibility, and this is the part to check first if anything changes.** The
design badges it «Клієнт не бачить», which says who must not see it and leaves
open whether crew should. **Nothing was added to the link gateway**, so today the
answer is "only the creator": all three `shoots` SELECTs in
`link-gateway/index.ts` name their columns explicitly and none names this one —
verified after the change. That is the safe default and it is reversible in the
cheap direction: adding it to `crewPayload` is one line whenever a story asks;
un-shipping it from a client payload is not. Same stance the gateway already
takes on `crew_members.note`.

The badge in the UI is therefore true by construction rather than by the label,
and the client-view toggle that hides the card is a **preview**, not the
guarantee (ADR-013, CLAUDE.md rule 2).

### Clash warning

`overlappingShoots()` compares the chosen date, start and duration against that
day's other shoots and prints «Перетин із «…» 10:00 – 13:00». Owner's call,
2026-08-30; **no story asks for it**, and it is the same family as `US-031`'s
calendar marker — which catches a tight turnaround *after* saving, where this
catches a real double-booking *before*.

**A warning, never a block.** Two shoots can genuinely overlap and nothing in the
backlog says otherwise.

### Location chips

`pastLocations()` — distinct `location_address` values from the creator's own
past shoots, most recent first, capped at six. Same argument as `listPastCrew`:
derived from what the creator already wrote, no new table, and **no locations
entity is implied** — a chip just fills the text field, which still writes a
plain `location_address`.

### Also

- **Its own header** («Скасувати» · «Нова зйомка» · «Зберегти», the save dimmed
  until valid). Five routes now draw their own.
- **`MonthPicker`** is a new component: an inline month grid for picking ONE
  date, replacing the `DateField` row. Deliberately **not** `ShootCalendar` —
  that one browses (marks shoot days, drives a filter, has a week mode, allows
  any day), this one selects (single date, refuses the past, no week mode). One
  component doing both would be a pile of flags.
- **Past dates are unpickable** here, as drawn. The edit screen still allows one;
  nothing in the backlog forbids a shoot in the past, and this is the create form
  treating a past tap as far more likely a mistake than an intent.
- `ClientField` was **not** rewritten — `US-029` already built the design's
  suggestion list (avatar, name, «клієнт · N зйомок», a row that fills the form).

### Not followed

| # | What the design does | Why not |
|---|---|---|
| S-11 | Weekday row **Sunday-first** (`['НД','ПН',…]`, `getDay()` arithmetic) | Ukrainian weeks start Monday and the app is Monday-first throughout. Same US default leaking through the prototype's plain `Date` maths as on the calendar (C-3) |
| S-12 | `renderVals` carries `crewChips`, `crewCount`, `code`, `security`, `moreOpen`, `toggleMore`, `moreHint` | **None is referenced in the design's own markup** — leftovers, as on Home (M-3). Picking crew at creation time and access code / security phone are all real features with no column and no story |

---

## Calendar rebuilt against `Calendar.dc.html` (owner, 2026-08-30)

`app/(app)/shoots.tsx` and `src/components/ShootCalendar.tsx`. Read through
`DesignSync`; the `design-new` Desktop export has a `Calendar.dc.html` too, but
the remote is authoritative.

Much of it was already there — «Варіант 3» gave this screen a month/week
calendar, a marked-day grid, and a time-forward agenda. This is mostly a
restyle, plus three structural moves.

### Structural

1. **Its own header again.** It had gone back to the navigator's on 2026-08-29,
   when its hand-drawn header was reduced to a bare chevron. The design gives it
   a **meta line** under the title («Вересень · 6 зйомок») and a **«Сьогодні»**
   control, and a native header can hold neither. Four routes now draw their own.
2. **«Сьогодні» is new.** The calendar could always be walked back with the
   arrows; nothing jumped to the current month — a gap on a screen whose whole
   subject is dates.
3. **«+ Нова зйомка» is pinned.** It sat inline under the calendar card, which
   put the screen's one action halfway up a scrolling list.

### `ShootCalendar` is controlled now

`mode` and `focus` moved onto the screen, because the header's meta line and its
«Сьогодні» button both read them and neither could reach state the card owned
privately. The segmented control moved out with them — the design draws it
**above** the card, and it is the shared `Tabs` now, so this file's own `ModeTab`
is gone. That is the third hand-rolled segmented control retired by `Tabs`.

The card itself went from the lifted `--card` hero (radius 20, elevation) to the
handoff's `flat` card: page colour, `#27272a` border, radius 12, no shadow. Its
arrows are lucide chevrons in 36pt buttons rather than «‹» / «›» text glyphs,
and they carry accessibility labels (`calPrev` / `calNext`) — they had none, and
a bare glyph announces nothing.

### Agenda rows

| | Was | Now |
|---|---|---|
| card | `bg-card`, radius 14, elevation | page colour + border, radius 12, flat |
| stripe | 4px, `foreground` / `border-strong` | 3px, `border-strong` / `border` — the design's own `planned` / `done` tones |
| clash | 1.5px amber ring + amber filled tag | card lifts to `secondary` with a `border-strong` edge; the tag is an **outline** `Badge` |
| heading | «19 вересня» + «· 2 зйомки за день» | adds «· сьогодні» for the current day, and the count is **pluralised** |

**A copy bug fixed on the way.** The count used the fixed phrase `shootsPerDay`
(«зйомки за день»), which read wrong from five upward — «5 зйомки за день». It is
`pluralUk(n, shootCountForms)` plus a new `perDay` («за день») now, like every
other count in the app.

**`warning` is gone.** The clash tag was its last use anywhere — the amber ring
went with the row restyle, and the tag itself is an outline badge now. It had
outlived the other six scales twice: first as the home screen's «Сьогодні»
amber (retired by `Home.dc.html`), then as this clash marker, which was a
defensible last colour because it meant "something is wrong with the schedule"
rather than identity or state. With no usage left it was removed from
`global.css` and `tailwind.config.js` too.

**`--destructive` is now the only hue in the app** — which is also all that stock
shadcn dark has. Seven application colour scales have been removed in one day;
what that costs is stated at the top of `global.css` and is worth reading before
anyone asks for colour back.

### Empty states collapsed

Three separate blocks became one card whose text names the case: «У вас ще немає
зйомок» (`US-004` AC-2, unchanged), «На цю дату зйомок немає.», «На цьому тижні
немає зйомок», «У цьому місяці ще немає зйомок». The last two are new copy, taken
verbatim from the design.

### Not followed

| # | What the design does | Why not |
|---|---|---|
| C-3 | Weekday row is **`['НД','ПН','ВТ',…]`** — Sunday first, and `startOfWeek` uses `getDay()` | **Ukrainian weeks start on Monday.** The app is Monday-first throughout and the dictionaries' `weekdays` is ordered that way; the design's is a US default leaking through the prototype's plain `Date` arithmetic. Kept Monday-first |
| C-4 | Three statuses — `planned` / `progress` / `done` | Two, for the reason already logged as H-11: `shoot_status` is an enum of two and `US-020` AC-2 says there is no way to reach a third |
| C-5 | The filter bar's clear reads **«Показати всі ✕»** | Built as drawn. Note it now differs from `allShoots` («Всі зйомки»), the older label on the pill this replaced — that key is now unused |

---

## Home rebuilt against `Home.dc.html` (owner, 2026-08-30)

`app/(app)/index.tsx` (`US-035`). The file was read through `DesignSync` from
project `4c1f75ab-…` — it is **not** in the `design-new` Desktop export, which
predates it.

### The order reversed

Was: header → «+ Нова зйомка» → «Переглянути календар» → next-shoot card.
Now: header → **next-shoot card** → buttons → **«Наступні зйомки»**.

The right way round for the question this screen exists to answer: the shoot is
the answer, and the buttons are what you do when it is not enough.

### The next-shoot card inverted

**The biggest change, and it undoes a deliberate decision.** The card was
`bg-primary` — filled near-white, the one bright surface on the screen so the
next shoot read first (owner, 2026-08-29). `Home.dc.html` makes it `#09090b`
inside `#27272a` like every other card, with a 3px stripe and a badge doing that
work instead.

Everything inside un-inverted with it. The card's text had to be
`primary-foreground` at assorted opacities because `card-foreground` and
`muted-foreground` are light and would have vanished on white; they are simply
the right tokens again. Its hairline was `primary-foreground/15` for the same
reason and is `border-border` now.

Gained: a footer «Деталі →», and a stronger border when the shoot is today.

### `StatusPill.onLight` is gone

That prop swapped the pill's pair for a light surface, and this card was its
only caller — ever. With no light surface left anywhere in the app there is
nothing for it to do.

### `warning` survives after all

**A correction to what was reported before building.** The «Сьогодні» state was
the reason `warning` was kept through the monochrome pass, and `Home.dc.html`
draws that state monochrome — white pulsing dot, white label, white stripe,
solid white badge — so that use is gone.

But it has a second use that was missed: **`US-031`'s conflict marker on the
shoot list** («менше години після попередньої»). That is a warning in the
ordinary sense — something is wrong with the schedule — where every scale the
monochrome pass removed encoded identity or state. Kept, with the note in
`global.css` rewritten to say so. `destructive` and `warning` are now the only
colour left, and each means "something is wrong".

### New: «Наступні зйомки»

A bordered list under the buttons — label, an «Усі» link to the calendar, then
60px rows: day/month column, a 1px rule, name, `time · location`, and an outline
status badge.

`upcomingShoots()` in `src/features/shoots/home.ts`. No schema change —
`listShoots()` already returns everything and `nextShoot()` picks the head.

**It excludes the shoot in the card above.** The prototype does not: `Home.dc.html`
assigns `upcoming` twice in one object literal, the second wins, and its
`UPCOMING.slice(1)` guard is silently discarded — so the card's shoot is listed
again underneath itself. Not copied.

### Smaller

- **The empty state moved onto a card**, and its copy changed with it. The old
  line said «Натисніть «Нова зйомка» **вище**» and the button is BELOW it now —
  the design's replacement describes the shoot instead of the button, so it does
  not care where the button sits. Both languages updated.
- **The bell** is a 40×40 bordered square with a lucide glyph, not a 🔔 emoji in
  a filled circle. **Always shown** (owner, 2026-08-30) — `Home.dc.html` gates it
  on `hasNotifications`, and there is no notification mechanism to derive that
  from. Its dot is `foreground` now rather than `destructive`, and **still
  reflects nothing** — unchanged, and still the one thing on this screen that
  states something untrue.
- **The profile chip** is a plain 40pt avatar; the `›` went with the pill.
- `shortMonth` / `dayOfMonth` added to `date.ts`. The short month is **sliced
  from the genitive list**, not a second hand-written array: all twelve give the
  conventional abbreviation that way («вересня» → «вер»), and English does too.
- `SectionLabel` (12/600 uppercase, 0.04em) is now on this screen as well as the
  shoot detail. **Two copies** — worth extracting if a third appears.

### Not built

| # | What the design does | Why not |
|---|---|---|
| ~~M-1~~ | Greeting reads **«Доброго дня, Дарино»** | The name is in the **vocative**. We store one nominative `name`, and declining it in code would mangle every name the rules do not cover. This was already the owner's decision on 2026-08-28 and is unchanged — the greeting stays «Доброго дня» |
| M-2 | `hasNotifications` gates the bell | No notification mechanism. Always shown, by decision |
| M-3 | `renderVals` carries `stats`, `hasStats`, `hasPending`, `pendingTitle`, `pendingSub`, `onRemind` | **None is referenced in the design's own markup** — leftovers from an earlier version. The statistics cards were already removed at the owner's request on 2026-08-28, and `onRemind` is the reminder feature that does not exist (H-5) |

---

## Removing a reference (owner, 2026-08-30)

Asked for after the edit screen's location attachment gained a ✕ and the
reference tiles beside it had none. **The two are not the same operation**, and
the difference is why this needed a migration:

| | Location attachment | Reference |
|---|---|---|
| What it is | a column on `shoots` | a row in `shoot_references` |
| Removing it | `location_attachment = null`, an UPDATE | needs DELETE, or a soft delete |
| When it writes | on «Зберегти» — the form is a draft | immediately, there is no draft |
| Undo | «Скасувати» discards the draft | none |

`20260825140000_grants.sql` grants **DELETE on nothing, anywhere**, deliberately:
"v1 has no hard deletes: US-019 and US-022 are soft deletes (ADR-014)". So this
is the third soft delete, built to the same three-part shape as the other two —
`20260830140000_reference_soft_delete.sql`:

1. `removed_at timestamptz` on `shoot_references`, plus a partial index matching
   the policy's shape.
2. **The liveness filter goes in the POLICY.** `listReferences`, the grid, the
   all-references page and anything added later inherit it and cannot forget it
   (CLAUDE.md rule 3).
3. `soft_remove_reference(uuid)`, SECURITY DEFINER — because the SELECT policy is
   applied to the NEW row, so a plain `set removed_at = now()` makes the row fail
   its own read policy. Third time this codebase has hit that; `soft_delete_shoot`
   documented it first.

**The link gateway got the filter by hand, in both of its reference reads.** It
runs as service role, so no policy applies — this is the one place ADR-014 is not
enforced for us, and `risks.md` calls a forgotten filter the most likely bug in
v1. Without it a reference the creator removed would keep being served to
everyone holding a link.

### Decisions

| # | Question | Answer |
|---|---|---|
| R-1 | How is an accidental ✕ protected? | **A confirmation**, via `DestructiveAction`'s machinery — the same guarantee `US-019` and `US-022` use. Deliberately NOT the 4-second undo the handoff gives crew removal: that works there because the write is deferred, and `soft_remove_reference` has no inverse |
| R-2 | Does a removed reference disappear from the link views? | **Yes**, filtered in the gateway |

### Worth knowing

- **`useDestructiveConfirm` was extracted** from `DestructiveAction`. The trigger
  here is a ✕ drawn on a tile by `ReferenceGrid`, not a button that component
  could own, and duplicating the Alert-on-native / dialog-on-web split would be
  two places to get AC-2's guarantee wrong. `DestructiveAction` now uses the hook
  too, so there is still one copy. It is generic over the subject, so `ask(ref)`
  carries which tile all the way to `onConfirm`.
- **`ReferenceGrid`'s `onRemove` is opt-in.** That grid serves the «Матеріали»
  tab, the all-references page, and the shape the link views copy — a caller that
  passes nothing gets the read-only grid it had before. Hidden in client view.
- **The ✕ applies to link references too**, not only images. The owner asked
  about images; a link reference is the same row removed the same way, and a ✕ on
  photos but not on links would be arbitrary. Say so if it should be images only.
- **The removal is not optimistic.** The tile goes only once the write succeeded
  — with no undo to fall back on, an optimistic hide that silently failed would
  leave the reference on the shoot with nothing saying so.
- **The Storage object stays in the bucket**, as everywhere else: nothing points
  at it, no story asks for deletion, and there is no DELETE grant to do it with.
- **New copy, no story behind it:** `confirmRemoveReference` («Видалити цей
  референс? Це незворотньо.»), worded on `confirmDeleteShoot`'s pattern.

**The migration has not been pushed.** `npm run db:push` is needed before the ✕
works against a real database — until then `soft_remove_reference` does not
exist and `removeReference` returns false.

---

## «Додати учасника» rebuilt (owner, 2026-08-30)

`app/(app)/shoot/[id]/crew/add.tsx`, against the **add screen** in
`~/Desktop/design-new/Shoot Detail v3.dc.html`.

**That file is newer than the bundle this redesign started from.** The
`design_handoff_shoot_detail/` copy in the repo is 42906 bytes with two screen
states (`detail`, `edit`) and `onAddMember` as a toast stub; the current export
is 55283 bytes and adds a third, `add`. Verified by MD5 that the repo copy and
the zip are byte-identical, i.e. the repo's bundle is simply stale. The remote
project (`4c1f75ab-…`, "Shoot Management Call Sheet", read through `DesignSync`
after `/design-login`) lists the same tree as the Desktop folder, so the Desktop
folder is the current export. **`design_handoff_shoot_detail/` in the repo
should be re-exported or deleted — it is now misleading.**

### What the design asks for

Two tabs behind the same segmented control the rest of the redesign uses:

- **«Мої контакти»** — a search over «Збережені контакти», 64px rows with a 22px
  checkbox, rows already on the shoot dimmed and badged «У команді», and a
  sticky «Додати до команди (N)» / «Виберіть учасників».
- **«Новий контакт»** — Імʼя, Телефон, Інстаграм, «Роль на зйомці» chips, and a
  sticky «Зберегти й додати» / «Зберегти».

### `ADR-003`, and why this does not reopen it

The contacts tab is a saved-crew directory, which `ADR-003` **defers**. It is
built anyway, from a source that decision did not rule out (owner, 2026-08-30):
`listPastCrew()` reads the **creator's own past shoots**, deduplicated by
`crewIdentity` (name + stored contact).

ADR-003 rejected a *searchable crew marketplace* — a two-sided directory of
strangers with availability, "empty at launch", which "doesn't help anyone".
This is none of that: single-sided, private to one creator, self-populating, and
useful from their second shoot. **It is the same argument
`20260829100000_clients.sql` used to add `clients` while leaving ADR-003
standing** — and it leaves it standing here too, because picking someone still
INSERTS a new `crew_members` row. A person on three shoots is still three rows;
only the typing is saved.

No new table, no migration, no policy change: `crew_members_via_shoot` already
scopes every read to shoots the caller created, so "my past crew" is what the
query returns by construction. `listCrewNamesForShoots` was already reading crew
across shoots, so the pattern is not new either.

The note is deliberately **not** carried across — «привозить свій набір» is a
fact about one shoot, not about the person, and `ADR-013` is reason enough to
copy a note as little as possible.

### Departures from the design

| # | What the design does | What is built, and why |
|---|---|---|
| N-1 | **«Телефон — необовʼязково»**, and no email field | **Required, and the hint is dropped.** `US-005` AC-2 wants a phone or an email and `crew_members_contact_required` enforces it in the database — a name-only contact is refused by Postgres. The field keeps the app's existing «Телефон або email» label, because that is what it accepts (`splitContact` decides on the `@`). Otherwise the label would invite a value the row rejects, which is the defect already logged as A-1 |
| N-2 | **No «Нотатки»** field, and no note image | **Kept**, below the role chips. It is `US-005`'s field and the one `ADR-013` / CLAUDE.md rule 2 exist for; with no way to write one, half that story would be unreachable from the app — the same shape of gap as S-10 |
| N-3 | Role chips are **«Фотограф / Гафер / Стиліст / Візажист / Асистент / Оператор»** | **`ROLES_UK`** instead — Фотограф, Стиліст, Гафер, Візажист, Менеджер зйомок. These are values written to `crew_members.role` and read back on the two Ukrainian-only surfaces, so they are not the dictionary's to restyle, and the glossary confirms the list. **The design adds «Асистент» and «Оператор» and drops «Менеджер зйомок» — if that list is now the right one, the glossary moves first** |
| N-4 | The «Новий контакт» CTA turns white on `name.length > 1` | Turns white on name **and** contact, i.e. exactly when the insert would succeed. Keying it off the name alone shows a ready-looking button that then refuses |
| N-5 | The multi-add toast writes the name in the **accusative** («Дмитра Марчука додано до команди») | Nominative, for the reason already logged as H-14: the prototype carries a hand-written `acc` per person, nothing in the data model holds one, and Ukrainian declension is not derivable from a name |

### The note image was removed (owner, 2026-08-30)

The «+ Зображення» button under «Нотатки» is gone from this form, along with its
picker and preview.

**`US-005` collects an image with the note, so that half now has no UI.**
`uploadCrewNoteImage` has no caller anywhere in the app. Everything downstream
is intact and still works for rows that already carry one: the `note_image`
column, `signedCrewNoteImageUrl`, the gateway's `noteImageUrl`, and the crew
link view that renders it (`app/s/[token]/crew/[crewId].tsx`). Only the way in
is missing.

This is the same shape as **S-10**, where the pasted-link reference lost its
input and kept its API — and it is now the second story half that is unreachable
from the app. Worth deciding whether both come back or both are dropped from the
backlog.

### Worth knowing

- **The role picker went from `Select` to chips.** With five roles that is one
  fewer tap and every option visible. `ui/select.tsx` is now unused by this
  screen but still used elsewhere.
- **The row is the checkbox.** The design taps the whole row and draws the box
  as an indicator, so the row carries `role="checkbox"` and its state, and the
  box is a plain View — a real `Checkbox` nested in a `Pressable` row would be
  two controls, two tap targets and two things announced.
- **Multi-add inserts sequentially**, and reports a partial failure rather than
  claiming success: six parallel inserts gain nothing noticeable and a
  half-failed batch is much harder to describe honestly.
- **The empty state carries the cold start.** «Нікого не знайдено. Створіть
  новий контакт.» covers both a search that matched nothing and a creator on
  their first shoot — which is exactly the emptiness ADR-003 worried about, and
  the sentence already says the right thing about it.

---

## Shoot detail + edit rebuilt against `design_handoff_shoot_detail/` (owner, 2026-08-30)

Supersedes the Figma-frame rebuild below, which is **hours old** — that pass and
this one both happened on 2026-08-30. The handoff bundle
(`design_handoff_shoot_detail/`: a README plus `Shoot Detail v3.dc.html`) is
newer than the Figma frame and disagrees with it in structure, not just styling.
Where they conflict, the handoff wins.

`Shoot Detail v2.dc.html` and `Call Sheet.dc.html` in that bundle are marked
reference-only by its own README and were not implemented.

### What changed structurally

The screen was one long scroll — client card, date/time, location, crew,
references, two file sections, delete. It is now:

- a **fixed header** it draws itself: back · «Деталі зйомки» + «19 вересня ·
  09:00» subline · «⋯», with a segmented Tabs control below;
- **three tabs** — «Деталі», «Люди N», «Матеріали N»;
- a **person sheet** — tapping a row opens the full record, which is where the
  copy-link and remove controls now live;
- a **client-view preview**, entered from the ⋯ menu;
- an **overflow menu** carrying edit, client view and «Скасувати зйомку».

The edit screen gained its own header («Скасувати» · «Редагувати» ·
«Зберегти»), dirty tracking against the loaded shape, a sticky save with two
states, a discard-confirmation on leave, and the status control — which moved
off the detail screen's pill.

Both routes now take `headerShown: false`; `app/(app)/_layout.tsx` explains why
neither header is expressible through `screenOptions`.

### The palette went monochrome, app-wide (owner)

The handoff is built on the shadcn dark **zinc** scale and states the rule
outright: "monochrome zinc scale, no colour tints", "only these; no coloured
status tints". The owner applied that to the whole app rather than one screen.

**Six scales removed** from `src/theme/global.css` and `tailwind.config.js`:
`status-new`, `status-finished` (both added 2026-08-29 from §3.1), `client`,
`link`, `pending`, `confirmed` (all four added 2026-08-30 from the Figma frame —
i.e. the entries in the table below this one, which the same day removed).

**One scale added:** `--border-strong` (`#3f3f46`), the handoff's "strong border
/ focus ring". RNR has no slot for it and the outlined badge, the toast and the
sheet grabber all disappear into the surface without it.

**What replaced each:**

| Was | Now |
|---|---|
| `StatusPill` blue / pink | `new` solid `secondary`, `finished` outlined — fill vs outline |
| `ResponsePill` green / amber | `confirmed` solid `primary`, `pending` outlined on `border-strong` |
| status stripe (home + list) | `bg-foreground` / `bg-border-strong` — brightness, not hue |
| `Card variant="client"` purple | variant **removed**; a client is a `row` like anyone else |
| `text-link` on phones and handles | plain `muted-foreground` |
| home countdown chip blue | `primary-foreground/10` on the light card |

**`warning` survives** — the home screen's «today» amber. It was not among the
six the owner named and it means something none of them did (urgency, not
identity or state). **This is the obvious next question if «no colour tints» is
meant literally.** `destructive` also survives: the handoff has its own red.

**What it costs, plainly.** A status is no longer identifiable at a glance
across a list — it has to be read. `src/components/Visibility.tsx` has carried a
note since the first theme reset saying access level was the one thing this
product colour-coded; the client purple was the last of it, and it is now gone
too.

### New components

Five primitives, none of which existed in any form. `@rn-primitives` ships
`alert-dialog`, `checkbox`, `label`, `portal`, `select`, `separator`, `slot` and
nothing else, so tabs, sheets, menus and progress bars are hand-built either way.

| File | Note |
|---|---|
| `ui/tabs.tsx` | Consolidates three hand-rolled segmented controls — `AuthScreen`'s, `ShootCalendar`'s, and the two this redesign needed |
| `ui/badge.tsx` | `solid` / `outline` / `muted`. The whole labelling vocabulary now that hue is gone |
| `ui/progress.tsx` | The confirmation card's bar |
| `ui/sheet.tsx` | Portal + Reanimated. **The grabber is decorative** — dismissal is by overlay tap; a draggable sheet needs `react-native-gesture-handler`, which is not a dependency |
| `ui/dropdown-menu.tsx` | Anchored by the caller rather than measured, so it cannot land a frame late |

Plus `ShootDetailHeader.tsx`, `PersonSheet.tsx`, and `src/lib/nextScreenToast.ts`
— a one-value handoff so the edit screen's «Зміни збережено» survives the pop
that follows it.

`Toast` gained an `action`. Until now `withAction` lengthened the timer to 4s and
**nothing rendered a control**, so a toast could be given four seconds to reach a
button it did not have. The undo is the first caller that needed one.

### Not built — no column, no mechanism (owner: "build UI only for what exists")

| # | What the handoff draws | Why not |
|---|---|---|
| H-1 | A **«Нотатки»** card, and a «Нотатки» group on the edit screen | No shoot-level notes column. `location_note` is the access note; `crew_members.note` is per-person. **This is S-1 below, unchanged and now twice-flagged** |
| H-2 | **Назва локації**, **Код доступу**, **Охорона** as separate fields | One free-text `location_note` is what `shoots` has — and is where a creator already writes exactly that sentence. Rendered unparsed as the «Деталі» block |
| H-3 | **Four** location photos and a «+» tile | `location_attachment` is one image OR one video (`US-018` AC-2) — S-3 below |
| H-4 | A client **«Очікує»** badge, and the client counted in «2 з 4 підтвердили» | A client has no response state anywhere — S-2 below. Moot for the card itself, which is no longer built (H-18) |
| H-18 | The **confirmation card** opening the «Люди» tab — «2 з 4 підтвердили», a progress bar, «Очікують: …» and a reminder button | **Removed at the owner's request, 2026-08-30.** The tab now leads with «Клієнт». Nothing is lost: the same count is a row on the «Деталі» tab («Команда → 2 з 3 підтвердили») and each person's answer is the `ResponsePill` on their own row, so the card summarised what the screen already said twice. Its reminder button was never built anyway (H-5). Removed with it: `shortDate`, and the `untilPrefix` / `waitingPrefix` keys. **`src/components/ui/progress.tsx` now has no consumer** — kept as a primitive, but it is dead until something uses it |
| H-5 | **«Надіслати нагадування (2)»** | No notification mechanism exists in this product at all |
| H-6 | **«Скопіювати для тих, хто не підтвердив»** / **«для всіх»** — the «Люди» sticky CTA and a menu item | Copying for a group is a feature that does not exist — S-5 below. Per-person copy moved into the sheet, so **«Люди» has no sticky CTA** |
| ~~H-7~~ | **«Маршрут»** | **Reversed 2026-08-30 — the owner asked for it back as a stub.** The button is drawn as designed, primary, beside «Копіювати адресу», and **does nothing when tapped** — the same arrangement as A-2's «Забули пароль?». Wiring it is one line (`openExternalUrl` with a URL built from the address); what is missing is the product decision, not the code: which map app, and what a `maps:` URL does on the static web export (`ADR-012`), where two of the three user journeys live |
| H-8 | **«Незабаром: перетягуйте сюди…»** under the files | Advertises a feature that does not exist — S-6 below |
| H-9 | A **«Клієнт»** text field on the edit screen | `US-018` Out of scope: client name and contact "is a new ask, not assumed here". Shown **read-only** so the reader can see which shoot they are editing |
| H-10 | The note under «Скасувати зйомку»: «Команда й клієнт отримають повідомлення про скасування» | **Nothing notifies anybody.** Shipping the sentence would promise it |

### Needs the owner's answer

| # | What | Consequence as built |
|---|---|---|
| H-11 | The handoff's status segment is **«Заплановано / В роботі / Завершено»** — three | `shoot_status` is an enum of two, and `US-020` AC-2 says they are "the only two options — there is no way to reach any other status value, intentionally or by mistake". **Built with two**, «Нова» / «Закінчена». A third segment would be a value the database rejects |
| H-12 | The menu item is **«Скасувати зйомку»** where `US-019` says «Видалити зйомку» | Copy taken as written, per instruction. **The action behind it is still the soft delete** — nothing is cancelled, nothing is announced. *Cancel* and *delete* are different products; if the handoff means cancellation, that is a story |
| H-13 | Removing a crew member has **no confirmation** — a 4s undo toast instead | Built as drawn, and it required deferring the write: `soft_remove_crew_member` has no inverse, so the row hides locally and the RPC fires after four seconds unless undone. **Committed on unmount** if the reader leaves inside the window. `US-022` AC-2 requires that "an accidental tap must not silently cut someone out" — the undo satisfies that differently from a dialog, and someone should confirm that reading. `US-019`'s delete **kept** its dialog: there is no undo to fall back on |
| H-14 | «Підтвердив» / **«Підтвердила»**, and the accusative «**Соломію Дяк** видалено з команди» | Gendered. The prototype hardcodes a `fem` and an `acc` field per person; nothing in the data model holds either, and Ukrainian declension is not derivable from a name. Masculine and nominative are used |
| H-15 | A **countdown** «Початок через 2 год 40 хв» | Built. The handoff defines only the counting-down state — **nothing is drawn once the shoot has started**, and writing «Триває» would be new copy nobody has reviewed |
| H-16 | References in a **3-column** grid, location photos in **4** | Both reuse `ReferenceGrid`'s 84px wrapping tile, which is roughly four per row. Changing it would touch the link views |
| H-17 | Surfaces `#18181b` (muted) and `#09090b` (card) | Ours are `#262626` (`--secondary`) and `--card` `#1F1F22`. The new `flat` card variant uses `bg-background` + border, as the handoff draws; the muted surfaces are **one step lighter than the design**. Deliberate — the owner asked for our palette, not the handoff's hexes |

### Fixed after review

**The «Файли» section was missing from «Матеріали».** It rendered only when at
least one of `raw_files_url` / `finished_photos_url` was set, so on a shoot with
neither — which is every shoot until someone pastes a link — the section did not
exist. The reasoning written into it borrowed `FileSection`'s, and that argument
is about the CLIENT's view: `US-024` AC-1 wants the section present but empty so
a client can tell "not ready" from "this app does not do that". On the creator's
own screen the two rows are the only thing saying the slots exist at all.

Both rows now always render. An empty one shows «В розробці» — the string
`FileSection` already uses for this case, so no copy is invented — and leads to
the edit screen, which owns both inputs. The section's count and the «Матеріали»
tab badge still count only the links that are actually set.

**The location attachment was invisible and unremovable on the edit screen.**
The form rendered a line of text naming the KIND («Фото локації» / «+ Відео»),
inherited from the version before it, which drew a 🖼 emoji. So a creator who
attached a photo could see it on the detail screen and nowhere on the form that
owns the field — and could replace it but never clear it.

It is now an 84px thumbnail with a ✕: images show themselves and open full
screen, a video shows a film glyph and opens in the platform's player (a poster
frame needs a video library this project does not have). Removing sets the column
to null, which `updateShoot` has always accepted and `sameDraft` correctly reads
as dirty. **Storage is not touched** — the file stays in the bucket, unreachable,
exactly as `uploadLocationAttachment` already documents about replacing one, and
for the same reason: v1 grants no DELETE anywhere.

New key `remove` («Видалити»), the bare verb — deliberately separate from
`removeCrewTitle`, which is `US-022`'s and names a person.

Fixed alongside it: **«посилання» was not pluralised.** It is declinable and was
a bare constant, so it read wrong at 0 and at 5 or more — most of the range this
renders. Now `linkForms` through `pluralUk`, like every other count in the app.
«фото» stays a constant; it is indeclinable.

### Tests this breaks

`tests/acceptance/us019-check.mjs` asserts «Видалити зйомку» is visible on the
detail screen and taps it. It is now **«Скасувати зйомку», inside the ⋯ menu**,
and also on the edit screen. `us021-check.mjs` skips a list of control labels
that includes «Видалити зйомку». Both need updating. Per the note at the top of
this file the suite has not been run since `aed5931`; this is a known break, not
a discovered one.

---

## Shoot detail rebuilt against the Figma frame (owner, 2026-08-30)

`app/(app)/shoot/[id]/index.tsx`, remade against the Figma shoot-detail frame
rather than `shoot-detail-screen.html`. **Where the two disagree, the Figma file
won** — it is newer, and it is the only source that reflects the dark theme.
The header is the exception: this route keeps the navigator's, by instruction.

### Structure

The hero card is gone. It held the date, the location, the access note and two
buttons; the frame puts each somewhere else, so the screen now reads:

client card → date + time → location → «Фото локації» → access note →
«Команда:» → «Референси:» → «Вихідні файли:» → «Готові файли:» → delete.

Date, location, photo and note sit **on the frame**, not on a card, with the
frame's hairline dividers and its extra inset (its cards are at x=14 and this
block at x=29). Delete stays last — the frame has no delete at all, and `US-019`
needs it somewhere.

### Edit and status moved into the header

`headerRight` is the status pill plus a pencil. The pill is now the control:
tapping it toggles `US-020`'s two values, and the label it used to carry
(«Позначити як «Закінчена»») became its accessibility label. **What that costs:**
a pill states what the status IS, not what a tap would do. The label is the only
thing that said the latter.

iOS centres a native title once a `headerRight` exists — the constraint that
forced `index` and `shoots` to draw their own headers. Acceptable here (a client
name is short), but it is the thing to check first on device.

### New on this screen

- **«Вихідні файли:» / «Готові файли:»** — `US-024` and `US-025` on the creator's
  own screen for the first time; until now only the link view rendered them.
  Reuses `FileSection`, which already handles the null case. New keys
  `sourceFilesSection` / `finishedFilesSection`, kept separate from
  `rawFiles`/`finishedPhotos`, which are what a crew member or client reads.
- **A reference belongs to a group.** Migration
  `20260830120000_reference_category.sql` adds a nullable `category text` to
  `shoot_references`; `Reference` carries it; `addLinkReference` and
  `addImageReference` take it. The section renders the frame's groups, each with
  its count, its tiles, its own «+» and a chevron when truncated.
- **No category picker, and that is the point.** The frame gives every group its
  own «+», so the group you add into *is* the choice — nothing needs a label, so
  no copy is invented. A pasted link at the bottom of the section files
  ungrouped.
- The references page (`references.tsx`) takes an optional `category` param, so
  the chevron does not lead to an unfiltered list. No filter UI; unreachable
  except through that chevron.

### Tokens, from the frame

Four scales in `global.css` / `tailwind.config.js`, same provenance as `--card`:

| Scale | Values | Note |
|---|---|---|
| `client` | `#241C33` / `#EEE7FB` / `#8B6FD1` | §5.7's client purple, which the theme reset had flattened to grey |
| `link` | `#8FB6FB` | §3.1 names «посилання» as one of three colour meanings; the reset dropped the scale |
| `pending` | `#332510` / `#F0C17E` / `#D99A3D` | the «Очікує» pill — the one **bordered** chip in the app, as drawn |
| `confirmed` | `#59B55F` | **closes C-1**: `ResponsePill`'s confirmed had been borrowing `status-finished`, which the §3.1 re-toning turned pink |

### Also changed on the way

- `formatDayMonth` moved into `src/features/shoots/date.ts`. It existed as two
  identical private copies (`formatDay` on home, `formatDayLabel` on the list)
  before this screen asked for a third.
- `SectionHeader` takes an optional `note`, for the frame's «3 учасники» where
  `count` renders a bare number.
- `ReferenceGrid`'s tile is **84px**, down from 96 — the frame's size for every
  tile. It also takes a `trailing` node so a group's «+» wraps in the same row as
  the thumbnails. `LinkReferenceGrid` is separate and untouched.
- `VisibilityNote` draws a lucide eye instead of 👁, and the location a lucide
  pin instead of 📍. Its own comment had said swapping it was one line.
- **The two crew-row controls are the frame's icon buttons** (nodes `1:95`,
  `1:99`): 32pt circles on `muted`, 6pt apart, with 15px glyphs at stroke 1.8.
  The glyphs were identified from the exported assets' own path data — a chain
  **link**, and a **trash** can with a lid line, a handle and a tapered body but
  no inner lines, so `trash` rather than `trash-2`. `CopyLink`'s copied state is
  the frame's green circle with Material's `ic:round-done` at 20px, which is what
  node `1:141` actually draws.

  **One cost, deliberate:** the frame strokes the trash glyph `#FAFAFA`, the same
  white as the copy icon, where ours was a red ✕. Followed as drawn, but colour
  was the only thing marking that button as the destructive one at a glance. The
  confirmation is still the guarantee.
- The screen carries **five** section headings, all `SectionHeader` with the
  frame's colon: «Клієнт:», «Команда:», «Референси:», «Вихідні файли:», «Готові
  файли:». The frame draws no «Клієнт» heading — it opens straight with the card
  — and the owner asked for one anyway (2026-08-30), so the headings read as one
  set. A departure from the frame, in the frame's own style.

### Needs the owner's answer

| # | What the frame does | Consequence as built |
|---|---|---|
| S-1 | A **«Нотатки:»** section with production notes («Клієнтка хоче мʼяке денне світло…») and «Бачить лише команда, клієнт не бачить» | **Not built — there is no field for it.** `Shoot` has `location_note` (directions, which IS the access note above) and `CrewMember.note` is per-person. A shoot-level note is a new column, an edit-screen field and a link-gateway decision — i.e. a story, not a restyle. **This was missed when the work was scoped; flagging it rather than inventing a column** |
| S-2 | An **«Очікує»** pill on the client card | A client has no response state anywhere. `CrewMember.response` exists; a client's does not. The `pending` scale is in the palette and unused until one does |
| S-3 | **Three** location photos and a «+» | `Shoot.locationAttachment` is one image or video (`US-018` AC-2). One tile renders; the rest would be a schema change |
| S-4 | A **«Маршрут»** link under the address | Derivable from the address, but no story asks for it |
| S-5 | **«Скопіювати посилання для всіх»** at the foot | New feature. Per-person `CopyLink` exists; a copy-all does not |
| S-6 | **«Незабаром: перетягуйте сюди…»** boxes under each file section | Copy advertising a feature that does not exist and is on no backlog |
| S-7 | Reference groups named **«Світло» / «Пози» / «Стиль»** | Built, from the frame's own copy — `referenceCategories` in both dictionaries. **No story supplies these three, or says whether the list is fixed.** The column is `text`, not an enum, so the list can move without a migration |
| S-8 | Crew avatars as **pastel circles with person emoji** | Still initials — open question **F-4**. The emoji is picked by hashing initials, so it asserts a skin tone, gender and age the person never gave |
| S-10 | Neither the frame nor the screen has a **reference add row** any more (owner, 2026-08-30) | The URL input, the gallery button and the «Додати» button are gone; adding happens through each group's «+», which picks from the gallery. **`US-003` AC-1's pasted-link half now has no UI at all** — a link reference cannot be created from the app. The API (`addLinkReference`), the validation (`isValidReferenceLink`) and the `invalidLink` message are all still there and still tested; only the way in is missing. Also: an image can now only be filed into a NAMED group, since the ungrouped «+» went with the row |
| S-9 | The crew card has **no response indicator** — name, role, contact, two buttons, and nothing saying whether the person accepted | `ResponsePill` is kept anyway, beside the two buttons. `US-008`'s response is the answer to the question the «Команда» section exists for. The frame's green circle is the copy button's **copied** state (node `1:141` is named «Скопіювати посилання» and draws `ic:round-done`), not a confirmation — so nothing in the frame replaces the pill. **If the pill should go, the response needs somewhere else to live first** |

---

## `--card` comes from the Figma file (owner, 2026-08-30)

The first value taken from Figma rather than from `design-guidelines.md` or the
stock RNR file. Read off the shoot-detail frame's crew card (node `1:79`) through
Figma Desktop's Dev Mode MCP server, now wired into this project:

| | Figma | Was | Now |
|---|---|---|---|
| card fill | `#1F1F22` | `--card` = `0 0% 3.9%`, identical to `--background` | `--card` = `240 5% 13%` |
| card border | `#27272A` | `--border` = `0 0% 14.9%` (`#262626`) | unchanged — indistinguishable |
| card text | `#FAFAFA` | `--card-foreground` = `0 0% 98%` | unchanged — already exact |

**Why it matters beyond looks.** Twice on 2026-08-29 a card was found to have no
edge, because stock dark gives `--card` and `--background` the same value; the
calendar card and the date picker's sheet both had a border added by hand to
compensate. The Figma file resolves it at the token: the card lifts *and* is
bordered.

`get_variable_defs` returned `{}` — the frame uses raw hexes, no Figma variables,
so there is nothing to sync against. The tint (hue 240 at 5%) is the file's: that
frame is built on Tailwind's **zinc** scale — its `#27272A` is `zinc-800` exactly
— where this theme is RNR's pure-neutral. Kept as drawn rather than flattened to
`0 0% 13%`, so the value can be traced.

**Knock-on, fixed:** two segmented controls drew their active segment with
`bg-card` on a `#262626` track (`AuthScreen`, `ShootCalendar`). That only read
while `--card` was the page colour; both now say `bg-background`, which is what
they meant.

### Needs the owner's answer

| # | What Figma does | Consequence as built |
|---|---|---|
| ~~F-1~~ | The crew card carries a **1px `#27272A` border** | **Answered yes, 2026-08-30.** Every `Card` variant now draws `border-border` — `hero`, `row`, `block` and `client`; `default` always did. The file's note reversed with it: "none of them draws a border" was true while cards were white. On `client` the border is invisible today, `--secondary` and `--border` holding the same value; declared anyway so the variant does not differ in shape |
| F-2 | Crew phone and `@handle` are **`#8FB6FB`**, a link blue | No token for it. §3.1 names *посилання* as one of the three things colour may mean, and the theme reset removed that scale. Those links render unstyled today |
| F-3 | The «confirmed» crew button is **green `#59B55F`** | `ResponsePill`'s `confirmed` maps to `status-finished`, which the re-toning made **pink**. Figma answers open question C-1: it should be green |
| F-4 | Crew avatars are **pastel circles with person emoji** (`#F6ECD9`, `#FBE4EA`, `#E6F4DF` — three of `calendar-ux-variants.html`'s `AVATAR_PALETTE`) | Still initials. The objection stands: the emoji is picked by hashing initials, so it asserts a skin tone, gender and age the person never gave |

---

## Status colours come from the design system (owner, 2026-08-29)

Amends the theme reset below, which had left the two shoot-status triples at the
stock file's `.dark` values — amber for `new`, green for `finished`. Those are not
what any mockup draws, and the home screen's next-shoot card made it visible: its
stripe and countdown chip are `#378ADD` and `#E6EEFC`/`#2A5BB0` there.

`design-guidelines.md` §3.1's triples now hold instead. They needed no new token
names, because the shape already matched — the table's `bg`/`fg`/`solid` are this
app's `-foreground`/base/`-border`:

| Status | Was (stock `.dark`) | Now (§3.1) |
|---|---|---|
| `new` | amber | `planned` — `#2A5BB0` / `#E6EEFC` / `#378ADD` |
| `finished` | green | `done` — `#B23A5E` / `#FBE4EA` / `#D4537E` |

The system's third status, `progress` (green), is **not** carried: the product has
two statuses (`US-020` AC-2). `global.css`'s "stock and nothing else" note is
amended to say the status slots — and only those — come from §3.1.

### Needs the owner's answer

| # | What changed under it | Consequence |
|---|---|---|
| C-1 | `ResponsePill`'s `confirmed` tone is `status-finished`, which was green and is now **pink** | A crew member who confirmed is shown a pink «Підтвердив» chip. The file's own comment already predicted this: pink for "confirmed" reads oddly, and the system's unused `progress` green is the obvious candidate — but that means carrying a third triple no status uses. **Not changed without an answer.** |
| C-2 | The home header's avatar fallback is `bg-status-new`, a placeholder circle borrowing a status colour | It goes from near-black amber to mid-blue, so the "profile still loading" circle is now conspicuous. It should probably be `bg-secondary` like the calendar screen's was — but that is a visual change no mockup covers |

---

## Theme reset to React Native Reusables' stock dark (owner, 2026-08-29)

**`ADR-017` is superseded.** The dark-frame design system — its palette, its
warm neutrals, its white-cards-on-black inversion — is removed. `global.css` now
holds RNR's `.dark` block verbatim, promoted to `:root` so it is the app's one
theme rather than a variant something switches into.

**The structural change matters more than the colours.** `ADR-017` inverted the
usual arrangement: a near-black *frame* with content on WHITE cards. RNR's dark
theme is conventional — `--card` is the same near-black as `--background`,
separated by a border rather than by brightness. Every surface written to sit
"on white" had to be re-pointed at the dark pair. That was 162 class uses across
34 files.

### What was removed, and what each became

| Removed scale | Now |
|---|---|
| `screen`, `screen-raised/chip/segment/deep` | `background`, `secondary`, `muted` |
| `onDark`, `-secondary`, `-muted`, `-empty`, `-border`, `-borderStrong`, `-chip` | `foreground`, `muted-foreground`, `border`, `secondary` |
| `surface`, `surface-alt`, `surface-hair` | `card`, `muted`, `border` |
| `ink`, `ink-muted`, `ink-icon` | `card-foreground`, `muted-foreground` |
| `cta`, `cta-foreground` | `primary`, `primary-foreground` — stock dark `primary` is already light-on-dark, so §3.5's inverted CTA comes free |
| `client-*`, `private-*` | `secondary` / `secondary-foreground` |
| `warning-bg/fg/ring` | `secondary`, `secondary-foreground`, `destructive` |
| `link`, `link-onDark` | `primary` |
| `notify-dot`, `avatar-header`, `online`, `chip-on-dark` | `destructive`, `secondary`, `primary` |
| `AVATAR_TINTS` + `avatarTint()` | one `secondary` surface for every avatar |
| radii `xl` / `2xl` / `3xl` (14/16/20) | stock `sm`/`md`/`lg` from `--radius` |

**A real loss, worth stating plainly.** Access level was the one thing this
product colour-coded: purple for the client, purple for owner-only, amber for a
waiting crew member and for a shoot booked too close to another. All of that is
now the same grey chip, distinguished by its words alone. `RoleChip`,
`OwnerOnlyTag`, `VisibilityNote` and the conflict row still exist and still say
the right thing; they no longer *show* it. If any of it should come back, it
comes back as a deliberate addition to the stock palette, not as a revival of
the design system.

### Kept deliberately

- **The shoot-status tones.** They predate `ADR-017` and are the `.dark` values
  from the same stock file. RNR has no slot for a shoot's status and `US-020`
  needs two. Names reverted to the originals (`status-new`,
  `-border`, `-foreground`).
- **The type scale** (`text-body`, `text-title`, …). Not stock, but it carries
  no colour and no visual identity, and it is used across 33 files — removing it
  is churn, not a theme reset. Say if it should go too.
- **The `<alpha-value>` fix** in `tailwind.config.js`. That was a bug, not a
  theme: without it every `active:`/`hover:` opacity modifier in RNR's own
  components is silently dropped.
- **Haptics and press states.** Behaviour, not palette.
- `elevation.ts` — still used by seven files for cross-platform shadows.

### Verified

Stock background `#0A0A0A`, stock muted `#A3A3A3`, cards now dark, no removed
class surviving anywhere in the rendered DOM, zero console errors.

**Not verified: the text colour inside an input.** The check read
`rgb(156, 163, 175)` where `text-foreground` is the applied class; that is most
likely the placeholder path on web rather than the text colour, since the field
was empty — but it was not confirmed. **Worth a glance on the device**: type
into a field and check the text is light.
