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
## «Мої контакти», from `Contacts.dc.html` (owner, 2026-09-04)

New: `app/(app)/(tabs)/contacts.tsx`, `app/(app)/contact/new.tsx`,
`app/(app)/contact/[id]/edit.tsx`, `src/features/contacts/ContactForm.tsx`,
`src/features/contacts/directory.ts`, `src/components/RoleChip.tsx`. Moved:
`contact/[id].tsx` → `contact/[id]/index.tsx`. Touched: both contact and client
APIs, `PublicProfile`, `DestructiveAction`, `Toast`'s caller list,
`ShootFormFields`, the add-crew screen, `BottomNav`, the tabs layout, the app
stack, both dictionaries.

This is the tab that shipped **drawn and inert** with the bottom navigation one
commit ago, and the «Редагувати / Видалити контакт» pair deferred from the
2026-09-04 profile pass. Both were waiting on the same question.

### The question, and the answer that removed a migration

The artboard groups people under **«Клієнти»** and **«Команда»**, carries a
`kind` on every person, and offers a «Тип контакту» toggle on its form. Our
`contacts` table holds crew only, so the obvious reading was a new column.

It is not needed: **the two groups are already two tables**, both
`creator_id = auth.uid()`, both soft-deletable, both carrying a name, a phone,
handles and a private note.

| Artboard group | Table | Note column |
|---|---|---|
| «Клієнти» | `clients` (`ADR-018`) | `notes` — `US-028` AC-3's between-shoots notes |
| «Команда» | `contacts` (`ADR-003`) | `note` — about the person, not the job |

So the screen is a union of two reads (`src/features/contacts/directory.ts`),
the filter chips choose which table(s) to show, and «Тип контакту» chooses which
one a save writes to. No migration, and nobody is duplicated. Owner's decision.

### Decisions

| # | Question | Answer |
|---|---|---|
| K-1 | Where do the two groups come from? | **The union above** (owner). A `kind` column would have duplicated every client who already exists as a row |
| K-2 | A row's destination — `client/[id]` is still `US-028`'s «coming soon» stub | **«Публічний профіль» for both kinds** (owner), as the artboard links it. That screen now has a **third reader**: `kind: 'client'`, with the owner's own subline «Дані клієнта з ваших зйомок». It deliberately does not say «публічні» — nothing about a client is published to anybody |
| K-3 | Deleting a client blanks its name on every shoot | **Offered only when the client has no shoots** (owner). See below — this is the sharpest thing in the pass |
| K-4 | How much of the form? | **Create and edit, both kinds** (owner), which is what `updateClientProfile` is for |

### Deleting a client, and why the control comes and goes

`SHOOT_COLUMNS` reads a shoot's client through `clients(name, phone, …)` — a
PostgREST join under the clients SELECT policy, and **that policy carries
`deleted_at is null`**. Soft-delete a client who has shoots and the join returns
nothing for every one of them, so `clientName` falls back to `''`: the home
card, the calendar rows, the shoot detail and the edit form all lose the name.
The **link views would keep showing it**, because the gateway reads with the
service role and bypasses RLS — so the creator's app and the link they sent
would disagree about who the shoot is for.

That is the opposite of what the artboard's own dialog promises. So «Видалити
контакт» appears on a crew contact always — `crew_members` rows are different
rows, which is what the contacts migration meant by making the promise true by
construction — and on a client only at `shootCount === 0`.

**The absence is silent.** No copy explains why the button is missing on a
client with shoots, because none exists and inventing it is rule 1. Say the word
if it should carry a line.

`soft_delete_client` has existed unused since the `ADR-018` migration, written
"so that `deleted_at` is reachable at all". This is its first caller. Making the
promise true for a client WITH shoots is a migration of its own — a name stored
on the shoot, or a policy that lets the join see removed rows.

### Not followed

| # | What the artboard does | Why not |
|---|---|---|
| K-5 | Role chips are its own **six** («Оператор» among them) | **`ROLES_UK`'s nine**, following the 2026-09-03 decision to take `Edit Profile.dc.html`'s list verbatim. These are values written to a `role` column and read back on the Ukrainian-only link views. «Оператор» is therefore not offerable — the list has «Відеограф» — and «Інша роль» is here for exactly that gap |
| K-6 | «Тип контакту» is editable on an existing contact | **Shown and disabled when editing.** Moving a saved person between the two is moving a row between tables, and the delete half of that blanks shoots (K-3) |
| K-7 | A client's second line is a role («Портретні зйомки») | `clients` has no role column — a client is not cast on a shoot, they are who it is for. The row shows **the shoot count** instead, which is the line the shoot form's client picker already shows for the same rows: existing copy rather than invented copy. The profile card drops the line entirely rather than repeating it. **The owner then asked for the count on crew as well** — see below |
| K-8 | The delete confirmation is an in-page dialog | `useDestructiveConfirm` — a real iOS alert, the machinery `US-019` and `US-022` use. R-1's answer applied again. The hook **gained a `message`** for the artboard's explanatory sentence; every existing caller is unchanged |
| K-9 | The list CTA sits on a gradient fade | Still not built, on this screen as on the calendar and the shoot form. It needs `expo-linear-gradient`, which is not a dependency (C-10) |
| K-10 | «Нотатки бачите тільки ви — вони не показуються **контакту**» | `crewNotesPrivate` already says «…**учаснику**». Reused rather than the app carrying two near-identical sentences |

### The shoot count, on both halves (owner, 2026-09-04)

A crew row reads «Фотограф · 6 зйомок» — the role, then the same line a client
gets. Asked for after the screen was first built, on the grounds that it answers
the same question for either kind of person.

A client's count rides along on `listClients` as a `shoots(count)` aggregate over
a foreign key. **A crew contact has no such key:** `ADR-003` makes a person on
three shoots three unrelated `crew_members` rows, matched to their directory row
by name-plus-contact. So `countShootsPerContact` reads those rows and counts
**distinct shoot ids** per identity — distinct because nothing stops the same
person being added to one shoot twice, and "4 shoots" must not become 5.

**Both filters rule 3 would ask for are already in the policy.**
`crew_members_via_shoot` is `removed_at is null AND exists(shoot … creator =
auth.uid() AND deleted_at is null)`, so somebody taken off a shoot stops being
counted for it and a deleted shoot stops counting for anyone — without a filter
written in the query, and matching what a client's aggregate already does.

Two things worth knowing about it:

- **Its failure is not the screen's.** A null leaves crew rows showing the role
  alone, the way the calendar's rows survive a failed avatar-stack query. It is
  a third request for one line of text.
- **A miss is possible.** The key is `name|phone ?? email ?? ''`, so a crew row
  carrying a phone will not match a contact holding only an email. Backfilled
  contacts cannot disagree — the migration derived them from these rows with
  this key — and a hand-made contact has no crew rows to count.

**0 is shown, not hidden**: «Візажист · 0 зйомок» on somebody entered by hand is
true, and it is the rule the client picker has always followed for a client with
no shoots.

### Copy

**One word repaired.** The artboard's delete dialog reads «Зйомки, де він уже
**додан**, залишаться без змін», which is not a form of «доданий».
`deleteContactExplain` ships «доданий». Flagged rather than shipped as drawn —
the precedent (H-12) is to take copy verbatim, and a broken word seemed the
wrong place to start applying it.

**One string not added.** The artboard's new-contact hint is
`contactWillBeSaved` plus the words «до зйомки»; the existing key is reused.

Everything else is the artboard's own text. Reused rather than duplicated:
`name`, `phoneField`, `instagramLabel`, `notesSection`, `crewRoleOnShoot`,
`optionalSuffix`, `crewPhonePlaceholder`, `crewInstagramPlaceholder`,
`nameRequired` («Вкажіть імʼя», which is the save button before a name is
typed), `saveChanges`, `changesSaved`, `crew` and `clientRole`.

### Two writers that deliberately do not write a column

- **`updateContact` never touches `email`.** It is the crew-matching key
  (`match_contact_to_user`), it was backfilled from `crew_members`, and the form
  has no field for it — so a save must not blank it.
- **`updateClientProfile` never touches `telegram`**, for the same reason: the
  form does not draw it and the shoot form is where it is set.

`updateClientProfile` is also **separate from `updateClient` on purpose.** That
function excludes the name because a shoot form must not rename a client with
cross-shoot identity, and its own note ends "renaming belongs on the client's
own profile (`US-028`)". This form is that place, arriving as «Мої контакти»'s
edit screen rather than as the client profile. Keeping two functions means the
shoot forms cannot acquire the power to rename by accident.

### A duplicate name updates instead of inserting

`createContact` cannot create a second row for somebody already in the book:
`contacts_identity_idx` is unique on (creator, casefolded name, phone-or-email)
where `deleted_at is null`, so an insert would fail the constraint. It updates
the existing row instead — the only behaviour the schema permits.

**Nothing tells the creator they already knew that person.** No copy exists for
it, so nothing is said; the toast still reads «{name} додано до контактів». A
question, not a decision.

### Reuse, since two controls were about to be drawn twice

`RoleChip` and `FieldLabel` were local to the add-crew screen. Both are now
shared — `src/components/RoleChip.tsx` and `ShootFormFields`, the latter having
gained the `optional` prop that put «— необовʼязково» in the local copy. The
add-crew screen imports both and lost 1,078 characters of duplicate.

### Verified

`tsc --noEmit` clean. `expo export -p web` builds and emits the four new routes
(`/contacts`, `/contact/new`, `/contact/[id]`, `/contact/[id]/edit`); the
directory restructure left `/contact/[id]` at the same URL, so the shoot
detail's «Профіль учасника» link is unchanged.

**No migration in this pass** — nothing to `db:push`.

**The acceptance suite was not run** (standing instruction). Nothing it drives
moved; the add-crew screen is the only existing screen whose source changed, and
only its imports did.

**Not verified on a device.** The screen is behind auth, and every write here is
new: creating a contact by hand, editing either kind, and both deletes have
never run against the real database. Worth exercising in this order — create a
crew contact, edit it, delete it; then a client with no shoots, and confirm a
client WITH shoots offers no delete at all.

---
## The bottom navigation, from `Home.dc.html` (owner, 2026-09-04)

New: `src/components/BottomNav.tsx`, `app/(app)/(tabs)/_layout.tsx`. Moved into
that group: `index`, `shoots`, `profile`. Touched: `app/(app)/_layout.tsx`,
`src/components/Toast.tsx`, both dictionaries, and the six hrefs that pointed at
the three moved routes.

This is the deferral of 2026-09-03 closed — «ignore navigation which appeared at
the bottom, we will implement it later, separately». All four artboards that
carry it (`Home`, `Calendar`, `Contacts`, `Edit Profile`) draw **the same bar**,
which is what makes it a navigator rather than a component pasted four times.

### What the artboard specifies

| | Value |
|---|---|
| container | `bg-background`, `border-border` top hairline, `padding:7px 8px` + the safe area |
| item | `flex:1`, `min-height:46`, radius 9, a 21px icon over a 10.5px label, 4px apart |
| active | `#fafafa`, weight 600, `aria-current="page"` |
| inactive | `#71717a`, weight 500 |
| height | 7 + 46 + 22 = **75** — which is where `Calendar.dc.html`'s `bottom:74px` CTA comes from |
| knock-on | Home and Edit Profile end at `padding-bottom:114`, Calendar at `166`, and **every toast moves from `bottom:60` to `bottom:96`** |

The **22px is the artboard standing in for the home indicator**, so it becomes
`insets.bottom` (34pt on the 402×874 frame it is drawn at) and survives only as
the fallback for a frame that reports no inset — the web export, an older device.

`react-navigation`'s bottom tabs lays screens out as a flex child **above** the
bar rather than underneath it, so each screen keeps the artboard's padding *less
the 75*: home `pb-10`, profile `40`, calendar `91`. The three roots therefore
**stop applying `insets.bottom` themselves** — the bar owns the safe area now,
and leaving it in would have pushed the calendar's CTA 34pt up into the list.

### Decisions

| # | Question | Answer |
|---|---|---|
| N-1 | A real tab navigator, or the bar as a component on three screens? | **`Tabs` from `expo-router/js-tabs` with a custom `tabBar`** (owner). Each tab keeps its scroll position and state, the bar is mounted once, and every pushed screen covers it by sitting in the parent stack. A route group, so **no URL moved**: `/`, `/shoots` and `/profile` still export to the same three files, which is what keeps `public/_redirects` and the theme playground's manifest valid without a line changing. **Not** the default `Tabs`, which is now `@expo/ui`'s SwiftUI bar — NativeWind cannot reach that, and this bar is hand-drawn monochrome |
| N-2 | The tab roots still draw their old back controls. Keep them? | **Keep all three, as drawn** (owner). `Calendar.dc.html` still has its chevron, `Contacts.dc.html` its «Головна», `Edit Profile.dc.html` its «Скасувати» — beside the bar that made them redundant. Each goes to the Головна tab. The calendar's is drawn with **no handler at all**, so where it goes was ours; home is what the same artboard's Contacts sibling links its own back control to |
| N-3 | «Контакти» points at a screen that does not exist | **Four tabs, «Контакти» inert** (owner) — the precedent of 2026-09-02 for controls whose destination does not exist. See below for what the screen behind it actually needs |

### Not followed

| # | What the artboard does | Why not |
|---|---|---|
| N-4 | Inactive tabs are `#71717a` | **`muted-foreground` (`#a3a3a3`)** — the greyscale has nothing at `#71717a` and the unselected tabs therefore read a step brighter than drawn. The alternative is a new token for one component, which is what `--border-strong` cost. **Say if it is worth one** |
| N-5 | The label is 10.5px | `text-micro` (10px). The scale has no half step, and the earlier passes rounded down (`12.5 → text-label`, `13.5 → text-body-sm`) |
| N-6 | A tab tints on hover | `active:opacity-70`. The artboards give a tab only a hover *colour*; a background fill would invent a surface the design has nowhere else |

### What «Контакти» is waiting for, and it is not a tab

`Contacts.dc.html` is two full screens: a search over people grouped **«Клієнти»
/ «Команда»** with three filter chips, 64px rows into «Публічний профіль», a
pinned «+ Новий контакт», two empty-state variants — and a create/edit form with
a type toggle, role chips, and a «Нотатки бачите тільки ви» note. Plus `?edit=`
and `?delete=`, the two pieces deferred on 2026-09-04.

**It needs a column that does not exist.** `contacts` is the crew address book
backfilled from `crew_members`; clients live on `Shoot.client*` and
`client/[id]`. The artboard merges the two into one directory, adds manual
contact creation (nothing creates a contact today except adding crew to a
shoot), and carries a **third role list** — six here against the profile
artboard's nine and `ROLES_UK`'s five. That is a migration, an amendment to
`US-005`/`US-029`, and a story. Not a tab.

So a quarter of the app's main navigation is dead until that pass. It is the one
thing on this bar that promises something untrue.

### Smaller things

- **`Toast` gained a `bottom` prop.** It renders through the root `PortalHost`,
  which sits outside every navigator — so it cannot discover that a bar is in
  the way, and at its old `bottom-8` it would have appeared *under* the bar on
  the profile tab. The screen passes `bottomNavHeight(insets.bottom) + 21`, which
  is the artboards' `bottom:96` over a 75px bar. Default is 32, exactly what
  `bottom-8` was, so no other caller moved.
- **Profile's «Скасувати» goes to the Головна tab** when there is nothing to
  discard, not `router.back()` — a tab root has nothing to pop, and the
  artboard's own handler toasts «Назад до головного». With unsaved changes it
  still opens the «Скасувати зміни?» sheet, which is the work it actually does.
- **The calendar's chevron does not use `router.back()`.** A tab router keeps a
  history of visited tabs, so `back()` would return to whichever tab was last
  focused — a chevron landing somewhere different each time is worse than one
  that always goes home.
- **Four new dictionary keys**, `navHome` / `navCalendar` / `navContacts` /
  `navProfile`. `navCalendar` and `navProfile` read the same as `calendarTitle`
  and `profileTitle` today and are still their own keys: a 10px tab label and a
  screen title are different copy slots, and the bar's four words should come
  from one place.
- **The profile is now reachable twice** — the avatar on home and the «Профіль»
  tab. `US-016` AC-2 names the avatar, so it stays; the tab is the sturdier of
  the two if that is ever revisited.

### Verified

`tsc --noEmit` clean. `expo export -p web` builds, and **`dist/index.html`,
`dist/shoots.html` and `dist/profile.html` are still at those paths** — the route
group changed the file tree, not the URLs, so `scripts/theme-playground/seed.mjs`
and `public/_redirects` need no edit. No new dependency: `expo-router/js-tabs`
ships with expo-router and neither it nor its bar touches gesture-handler.

**The acceptance suite was not run** (standing instruction). Two notes for
whoever does: the suites navigate only to `/login` and click through from there,
so nothing they drive moved — and `us014-check.mjs` asserts the profile screen
contains «Профіль», which the tab label now also satisfies. It still
discriminates, because the label is dictionary copy and reads "Profile" on
English, but it is a weaker assertion than it was.

**`theme-dist/` is stale** — three of its twenty frozen screens now have a bar.
Re-run `npm run export:web` then `npm run theme:freeze`.

**Not verified: the bar on a device.** It has not been rendered — the three tab
roots are behind auth and seeding a session writes to the shared Supabase
project. The two things to look at first are the safe-area padding under the
labels and whether the calendar's CTA sits flush on the bar as the artboard
draws it.

---
## Link preview copy, second pass (owner, 2026-09-03)

`app/s/[token]/index.tsx`, `src/components/ResponsePill.tsx`, both dictionaries.

A copy-level diff against `Shoot Link Preview.dc.html` rather than a rebuild —
the screen was aligned to the same artboard on 2026-08-31 and its structure still
matches. Five differences were real; two more were found and deliberately not
built.

| | Artboard | Was |
|---|---|---|
| The reader's own unanswered row | «Ваша черга» | «Очікує», like everyone's |
| Anyone else's unanswered row | no badge at all | «Очікує» |
| Declined | «Відмова» | «Відмовлено» |
| ~~The reader's own role~~ | «Гафер · це ви» | **Reverted same day** (owner): the «ВИ» badge beside the name already says whose row it is, and saying it twice on one row is noise. `itsYouSuffix` deleted |
| Crew heading | «3 · 2 підтвердили» (crew) / «3 людини» (client) | a bare `3` for both |

### Two of those were a day old, and mine

`responseDeclined` became «Відмовлено» earlier today, and `ResponsePill` learned
to hide the pending chip. **`ResponsePill`'s only caller was the detail screen**,
and the link view draws its own badges from the same three keys — so the two
screens spent the day disagreeing about the declined word and about whether an
unanswered row shows anything.

The link view uses `ResponsePill` now. One control decides the shape, the tick
and which states earn a chip, and the pair cannot drift again. `showPending` is
the one thing the link view needs beyond it: the reader's own row, and only that
row, carries a chip while unanswered.

«Відмова» replaces «Відмовлено» on both, which reverses this morning's choice —
both avoid the gendered «Відмовився» that started it, and the artboard settles
which.

### The location block is an address and one copy icon

Owner, 2026-09-03, on seeing it deployed. It was two full-width buttons —
«Маршрут» and «Копіювати адресу» — where the artboard draws the address with a
single 44pt copy icon beside it.

**«Маршрут» worked here.** On the creator's screen the same button was an inert
stub and deleting it lost nothing (S-4); on the link surface it opened Google
Maps on the address. So an anonymous reader — the audience least likely to know
where they are going — loses the one-tap route. The artboard's own `onRoute`
survives in its logic with no markup calling it, the same dead-value pattern as
the missing save button on `Edit Profile`, so this is the drawing dropping a
control rather than a considered removal. **Restoring it is four lines.**

`uk.route` had one consumer, this button, and is deleted with it.

**The artboard also puts a venue NAME above the address**, and there is nothing
to render: `location_name` is deliberately not on the link surface (migration
`20260903120000`). Unchanged.

### Two gateway bugs the deployed link surfaced

Both found by looking at the real thing, and neither was a design question.

- **«08:00:00 – 11:00:00».** The gateway handed Postgres's `time` through
  untouched. `toShoot` trims it to `HH:MM` for the creator's side and always
  has; the gateway was the one reader that never did, so **every link view has
  shown seconds** since times reached that payload on 2026-08-31. Trimmed at the
  source, in a `trimTime` helper both audiences use, rather than in the screen —
  no reader should have to know the column's precision.
- **A client's link had no times at all.** `ClientLinkPayload` has declared
  `startTime` / `endTime` since 2026-08-31 and the client SELECT has always
  fetched the columns, but the object built from that row **skipped both**. The
  declaration said `string | null`, the runtime value was `undefined`, and
  TypeScript could not see the gap because the payload crosses the network as
  JSON. `US-030` gives a client the times exactly as it gives them to crew.

The second is the more instructive one: a type that describes a payload built by
hand, in another process, is a statement of intent rather than a check. The
first `US-030` pass added the field to the type and to one of the two builders.

### The date line reads «Субота, 19 вересня 2026»

Weekday first, and a year — `formatWeekdayDayMonthYear`, beside the existing
`formatDayMonthWeekday` («19 вересня, пʼятниця») rather than replacing it. They
answer different questions: a creator knows roughly when their own shoot is and
wants the date; someone opening a link may be reading weeks ahead, and the day
of the week is what decides whether they can come. The weekday keeps its capital
because it opens the line here.

### The organizer card reaches the client link

Owner, 2026-09-03. It rendered for crew only — not because the screen gated it
(`{payload.organizer ? … }` never checked the audience) but because
**`clientPayload` never set the field**. `ClientLinkPayload` has declared
`organizer: LinkOrganizer | null` all along. That is the third instance tonight
of the same shape: a payload type describing an object assembled by hand in
another process, where a missing key reads as `null` and nothing complains.

It is **the first thing from `users` a client receives** — name, role, phone,
Instagram and Telegram. `ADR-018`'s note that the gateway "sends a client
nothing from `users`" no longer holds.

**And it makes a label on the profile screen false.** `socialSeenByCrew` reads
«Команда бачить ці контакти в деталях зйомки»; a client sees them now too, so
the sentence under-reports its audience — the wrong direction for a visibility
label to be wrong in. **The copy has not been changed**, because the replacement
is a decision rather than a correction: «Команда й клієнт бачать…» promises
something different from what the photographer agreed to when they typed the
handle. **Needs the owner.** The comment at the field says so in place.

A client reaching their own photographer is the most ordinary thing in this
product, and the shoot is theirs; what widened is the handles rather than the
fact of contact.

### `clients` reaches the link surface for the first time

Owner, 2026-09-03, asked for the artboard's «Зйомка з Марією Литвин · 3 години»
on **both** audiences, and for the «Клієнт» section the artboard puts under
«Додати в календар».

**`ADR-018`'s Visibility note recorded that nothing from `clients` had ever
crossed to an anonymous reader.** That is no longer true. Both payloads now
carry `client: { name, instagram }`, joined through `shoots.client_id`.

- **The name** goes to both, because both are shown the meta line.
- **The section** is crew only, as the artboard gates it (`showClient: isTeam`)
  — a client has no use for a card about themselves — and it is where the handle
  is read.
- **`US-007` AC-1 needs amending.** It enumerates what a crew member sees — the
  date, the location, the references, the crew list — and the client is not on
  that list. The story is narrower than the screen now.
- `US-026` is untouched: a client's payload still has no `notes` key, and the
  handle a client receives is their own.

The artboard is inconsistent here and it is worth knowing which half was
followed: its `shootTitle` is gated `isTeam`, while `shootMeta` carries the
client's name unconditionally. The unconditional one was taken, on the owner's
word.

### «3 години», spelled out

The link view writes the duration in full, declined — «1 година», «2 години»,
«5 годин» — where the creator's screens keep `formatDuration`'s «3 год». The
reader here does not use this app daily and the line has the width.

`durationWords` is local to the screen rather than in `date.ts`: the pluraliser
lives in `features/shoots/home.ts`, and `home.ts` already imports `date.ts`, so
putting it there would close a cycle.

### «Команда», and references grouped by category

Two more from looking at the deployed page (owner, 2026-09-03).

**The crew section is «Команда»**, where it read «Хто на зйомці». Its own key
still — the creator's «Команда» and this one agree today and would drift the
moment either is reworded (`accessDetailsLabel`'s rule).

**References group by category**, as the artboard draws: a label and a count
(«Світло · 3 фото») over a row of 58pt tiles, replacing one flat grid of 96pt
ones. `reference.category` reaches the link surface for the first time — a label
the creator typed, neither a note nor a contact, so `ADR-013`'s split does not
divide on it.

**Most shoots will see no grouping at all, and that is correct.** The column is
nullable and `20260830120000` deliberately did not backfill it — "assigning them
a category, even a plausible one, would be writing data" — so every reference
created before that migration is uncategorised. Those render as a headingless
row, which is the flat grid this replaced. **Naming that group would mean
inventing a word for "the ones nobody sorted"**, so it has no heading, and it
sorts last: a heading followed by headingless tiles reads as a mistake, where
tiles followed by headed groups reads as a list.

### The Instagram mark is drawn now

`src/components/ui/instagram-icon.tsx`. lucide ships no `instagram` glyph at
this version, so every field collecting a handle stood in `at-sign` — «@» — and
that reads as "a handle" rather than as Instagram, with Telegram's paper plane
beside it looking like the only branded one. The artboards draw the real mark as
inline SVG; `react-native-svg` is a direct dependency, so it is drawn.

**Shaped as a lucide icon rather than beside one.** It takes `LucideProps` and
forwards a ref, so it goes through `Icon` like any other and inherits the
`cssInterop` that compiles `className` into `style` — which is what lets
`react-native-svg` resolve `currentColor`. Standing it next to `Icon` would have
meant a second interop registration and two ways to colour an icon.

Applied everywhere the stand-in was: the link view's client section, the
profile's Instagram row, and `PersonSheet` (whose component is dead but whose
glyph would have been wrong the day it came back).

### How this was missed, which matters more than the button

Tonight's copy pass diffed **one way**: every string the artboard draws, checked
against the dictionary. That finds copy we lack. It cannot find controls we draw
that the artboard does not — «Копіювати адресу» was in both, so the row passed,
and «Маршрут» was never looked at because nothing in the artboard mentions it.

The reverse pass — ours against the artboard — has not been run on this screen.
Anything else this screen renders that the drawing dropped is still there.

### Not built, and why

- **«Нагадаємо за день до зйомки»** — the confirmed card's subtitle. It promises
  a reminder, and **nothing sends one**: there is no notification mechanism in
  this product, recorded three times now (H-5, M-3, `app/(app)/index.tsx:82`).
  This is the app making a commitment to someone outside it that it cannot keep,
  which is worse than a missing sentence.
- **«Дарина отримала відповідь»** — gendered past tense against an organiser
  whose gender nothing holds. **L-2**, already settled with neutral wording.

L-1 («Діє до…»), L-3 («чекає відповідь до…») and L-4 («KULT Studio») are all
still in the artboard and still undisplayable — no expiry column by design
(`ADR-014`), no deadline anywhere, no studio column.

### `ADR-013` is untouched

Nothing here changes what the gateway sends. The badges stay behind
`isCrew && 'response' in member`, the notes block behind `isCrew`, and the new
crew heading uses the confirmation count for a crew reader and a plain people
count for a client — the same `US-026` line the badges follow (L-5). The
reference grouping the artboard draws is still **not built**: it would need
`category` in the anonymous payload, which is a widening and the owner's call.

---

## Removing a crew member confirms again (owner, 2026-09-03)

`app/(app)/shoot/[id]/index.tsx`.

**`US-022` AC-2 is marked *required*** — "an accidental tap must not silently cut
someone out", and *nothing is removed* until the creator confirms. The «Команда»
tab removed on a single tap and offered four seconds of undo instead, which
removes first and asks after. The comment on the button asserted that AC-2
accepted the trade. It does not.

`confirmRemoveCrew` («Видалити цю людину зі зйомки?») already existed, so nothing
was invented; it goes through `useDestructiveConfirm`, the same hook the shoot's
own cancellation and the reference removal use — a real iOS alert on device.

**`Shoot Detail v3` draws no confirmation here**, so this is a deliberate
departure from the artboard in favour of the story.

### The undo toast stays, and is now belt-and-braces

AC-2's Out of scope calls re-adding someone "just `US-005` again, **no special
undo flow**", so the toast was never what the story asked for. It is kept behind
the confirmation because losing a colleague from a shoot is worth two chances —
not because AC-2 wants it. Worth knowing there is still a four-second window
where the row is hidden and the row is not yet deleted.

### A test that has been failing, and now should not

`us022-check.mjs` asserts «AC-2 removing asks for confirmation» and drives the
dialog's «Скасувати» and «Видалити». It has been failing since the confirmation
was dropped. It addresses the trigger as `[role=button][aria-label="Видалити"]`,
which the rebuilt row did not set — the button carried its word as text only —
so `accessibilityLabel` is set explicitly now.

---

## One role list, from `Edit Profile.dc.html` (owner, 2026-09-03)

`src/i18n/uk.ts` and `app/(app)/shoot/[id]/crew/add.tsx`.

`ROLES_UK` is the artboard's list verbatim — **nine**, where it was five:

    Фотограф · Відеограф · Стиліст · Hair стиліст · Візажист
    Гафер · Модель · Асистент · Продюсер

Every pass until now had kept the five, on the grounds that these are stored
values the glossary confirms rather than labels the artboards get to set (C-4's
sibling, logged three times). The owner has now taken the artboard's list, so
that reasoning is retired.

### «Менеджер зйомок» is gone, and it was glossary-confirmed

`US-001` defers the list to "the glossary's confirmed roles as the starting
list", and the glossary confirms makeup artist, stylist, gaffer and **shoot
manager**. The artboard has no equivalent, so taking it verbatim drops one.

- **Existing rows keep it.** `users.role` and `crew_members.role` are `text`,
  and every screen renders what it finds. Nobody's stored role changed.
- **It resolves to «Інша роль» where an unknown value is handled** — the profile
  opens the chip set on «Інша роль» with the stored text beside it, and so does
  registration. The value survives a round trip through either form.
- **Nobody can choose it again**, and a saved contact carrying it re-adds fine,
  because picking from «Мої контакти» passes the stored role straight to
  `addCrewMember` without touching the chips.

**`US-001` and the glossary need amending, or the role needs adding back.**

### «Інша роль» is on all three forms now

Registration and the profile have had it since 2026-08-31. The **new-crew form
was the one place a role had to come from the list** — which meant a crew member
could be given a job the person filling the form could not name. It now has the
same escape: the chip opens a free-text field, `resolvedRole` writes whatever
was typed, and the CTA stays dim until something resolves, so the button cannot
look ready and then refuse.

No test asserts «Менеджер зйомок»; the fixtures use Фотограф, Стиліст, Гафер and
Візажист, all of which survive.

---

## «Публічний профіль», and the contacts directory behind it (owner, 2026-09-04)

Migration `20260904100000_crew_contacts_directory.sql`,
`src/features/contacts/api.ts`, `src/features/contacts/PublicProfile.tsx`,
`app/(app)/public-profile.tsx`, `app/(app)/contact/[id].tsx`, plus the two stubs
it makes live and `src/features/crew/api.ts`.

`Public Profile.dc.html` needed something to profile, and that turned out to be
the whole story: **the artboard's «Учасник» mode is a contacts screen.** Its
back, edit and delete all point at `Contacts.dc.html`, and its delete dialog
promises to remove somebody from «Мої контакти» while leaving their shoots
alone. None of that was possible — «Мої контакти» deduplicated `crew_members` in
memory and `PastCrewMember.key` was synthetic, with its own comment saying "these
are not rows of their own". The owner chose to build the directory.

### `contacts` — `ADR-003`'s deferred crew directory

That ADR ruled out a searchable two-sided marketplace with visible
availability. This is not that: it is one photographer's private address book,
`creator_id = auth.uid()` on every policy, in no link payload, populated by
their own work. Which is the fallback the owner named in the same conversation.

**`US-005` and `US-029` need amending** — adding a crew member now also lands
them in a directory neither story describes.

| Decision | |
|---|---|
| **The note is a new column** | `crew_members.note` is per-shoot — "brings their own kit on this one" — and somebody on three shoots has three. The artboard's «Нотатки» card is about the person, so `contacts.note` is its own field. The backfill deliberately copies **no** note: the newest one would be presented as a fact about the person |
| **Backfilled in the migration** | Replaying the same dedupe `listPastCrew` did, so nobody's list changed on the way across. Without it the table ships empty — the cold start `ADR-003` was decided to avoid, reintroduced by the fix for it |
| **Two rule-3 filters deliberately absent** | The backfill checks neither `crew_members.removed_at` nor `shoots.deleted_at`, because `listPastCrew` never did: the list people see today includes someone removed from one shoot. Both are right for an address book — being taken off a job does not make you a stranger — and filtering would silently shrink every existing list. Rule 3 exists so a removed person cannot reach a live shoot; nothing here reaches one |
| **Soft delete** | `ADR-014`. It also makes the artboard's promise true by construction: deleting a contact cannot touch a shoot, because they are different rows |

`listPastCrew` reads the table now and its callers are unchanged — except that
`key` is a real id, which is the whole reason a contact can be opened at all.

### The screen

Read-only, two readers. **self** from `users`, reached from the profile's
«Переглянути публічний профіль»; **contact** from `contacts`, reached from a
crew row's «Профіль учасника». Both stubs had been drawn and inert since
2026-09-02.

- **No «KULT Studio»** — the role line is the role. No studio column anywhere
  (P-3, L-4).
- **No email row for a contact.** Not an omission: the artboard's own note says
  «Email та налаштування акаунту приховані від інших», and this screen is what
  others see. The account holder sees their own, where the reader and the
  subject are the same person.
- **The «Контакти» card disappears when empty**, which a contact can now be —
  the crew form's contact field became optional on 2026-09-03.
- **A crew member need not have a contact.** They may predate the backfill, or
  their contact may have been deleted. The row sends `by-identity` with what it
  knows; the screen resolves on the same key `upsertContact` matches, and falls
  back to those params rather than dead-ending. Finding the contact is what puts
  the note on screen.

**Deferred:** «Редагувати контакт» and «Видалити контакт», to a
`Contacts.dc.html` pass where the list, edit and delete belong together. The
directory ships readable and self-populating, not yet editable.

### A bug this uncovered

`addCrewMember` still refused a crew member with neither phone nor email —
`US-005` AC-2's guard, ahead of the CHECK constraint. **Both were supposed to go
on 2026-09-03** when the owner made the contact optional; the constraint did and
this did not. So the form offered an optional field and the insert returned
`null`, and the screen reported «Не вдалося додати учасника» on a row it was
right to accept. Removed.

---

## One form for creating and editing a shoot (owner, 2026-09-03)

`src/features/shoots/ShootForm.tsx` is new; `app/(app)/new-shoot.tsx` and
`app/(app)/shoot/[id]/edit.tsx` are wrappers around it. 1409 lines became 652.

The owner asked for the create form to serve both, with **the edit form's fields
replaced wholesale**: "reuse New Shoot for Edit Shoot, dont save nothing from
Edit Shoot form, all fields exactly as on New Shoot Form."

**A concern was raised first and overruled**, which is the right record to keep.
The objection was that the two screens differ in seven places — the client
control, `US-029`'s phone-match dialog, status, files, attachment, past dates
and which API saves — and that one component gating all of them is what
`MonthPicker`'s own docblock warns about: "One component doing both would be a
pile of flags." Taking the fields as well as the frame is what made it tractable:
four of those seven differences went away with the sections that carried them,
and `mode` now decides four things — what loads, whether the past is pickable,
which API the save calls, and two words.

### Two features have no way in any more

Both were checked before deleting and both are deliberate (owner, 2026-09-03,
asked explicitly and answered "drop both — exactly as asked").

| Feature | State |
|---|---|
| **`US-020` — a shoot's status** | **Cannot be changed anywhere.** `setShootStatus` has no caller. The value is still *displayed* — `StatusPill` on the detail screen and in the list — so a shoot shows a status nobody can move |
| **`US-018` AC-2 — the location attachment** | **Cannot be set.** `uploadLocationAttachment` has no caller. Rows that already have one still render everywhere, including on the link surface; nothing can add another |
| `US-024` / `US-025` — the file links | **Lost nothing.** They are edited in place on the «Матеріали» tab (S-25, earlier today) |

Both stories need amending, or the two controls need re-homing — status onto the
«Деталі» tab where it used to be a pill, and the attachment onto «Матеріали»
where media already lives. Neither is done.

### A third thing went quietly, and is worth a decision

**The edit form no longer warns about unsaved changes.** It had dirty tracking
and a discard dialog; the create form never did, and "all fields exactly as on
New Shoot Form" took it. Tapping «Скасувати» now discards silently.

That is a worse trade on edit than it would be on create: a create form
abandoned loses something you never had, an edit form abandoned loses a change
to something real, and one field among nine can be edited without the loss being
obvious. `discardChangesTitle`, `discardChangesBody`, `keepEditing` and
`discardChanges` are deleted with it. Restoring the guard is ~20 lines and does
not reintroduce a field.

### «Клієнт не бачить» is a sentence in a box now, on both forms

Owner, 2026-09-03: make the shoot's notes field match the crew form's. It was an
outline `Badge` beside the «Нотатки» heading — a tag shape doing a sentence's
job — and is now the eye-and-text box under the field, which is what
`Shoot Detail v3` draws on the crew form.

**`VisibilityNote` already existed for exactly this** (`src/components/Visibility.tsx`)
and had **no callers**; the crew form was carrying a hand-rolled copy of it from
earlier today. Boxing the component and pointing both screens at it removes the
duplicate and gives a dead component its job back. `Badge`'s import went with it.

**The wording is unchanged, deliberately.** The crew form's box says who *does*
see the note as well as who does not; the shoot's note has a different audience —
crew receive it, where a crew member's own note reaches nobody — so the same
sentence would be wrong here and a new one is a copy decision. «Клієнт не бачить»
stays as it was, and is still true by construction: `shoots.notes` is selected
for `crewPayload` and never for `clientPayload`.

### The client name is a plain input — `US-029`'s search is gone

Owner, 2026-09-03. «Ім'я клієнта» was `ClientField`: a debounced search over
existing clients, a floating suggestion list through the `PortalHost`, and a row
that filled the form with the picked client. It is a plain `Input` now.

**What it costs.** `ADR-018` made the client a row so that a client has an
identity across shoots. The search was how a second shoot for «Марія Литвин»
attached to the same row; without it, **a name typed twice is two client rows**,
and the client's history splits silently. `US-029` AC-1 through AC-3 — search,
no-match, and picking a client to fill the form — describe a control that no
longer exists and need amending.

**The phone match is untouched**, and is now the only thing joining a shoot to
an existing client: AC-4/AC-5's «цей номер належить…» dialog still runs on the
phone field, and accepting it links the shoot and fills the name. Worth knowing
that half of `US-029` survives, because it is easy to assume the whole story went
with the search.

**Editing the name still moves the shoot rather than renaming the client.**
`submit` keeps the linked client only while the typed name still matches it —
the edit screen's rule before the merge, unchanged, and the reason the loader
still fetches the real client row. What is new is that creating a shoot now
takes the create-a-client path every time.

`ClientField` and `searchClientsByName` have no callers. Both are kept rather
than deleted: the edit screen's own search was "parked for a discussion, not
deleted" on 2026-08-31, and this is the same feature going the same way.

### A mislabel this surfaced

`app/(app)/shoot/[id]/index.tsx` labels the **play** button for an existing
location video with `t.attachVideo` — «**+ Відео**». A plus on a control that
opens a video was always wrong; it is worse now that nothing can add one, since
the label promises exactly the thing that no longer exists. It predates this
change and is **not fixed**: the right word is a copy decision. `attachImage`
went with its button; `attachVideo` survives only on this mislabelled control.

### Also now dead

`src/components/DateField.tsx` has no caller — the range grid replaced its last
use this morning. Kept as a primitive rather than deleted, the same call
`ui/progress.tsx` got (H-18).

### Verified

`tsc --noEmit` clean; `expo export -p web` builds. **Not run:** the acceptance
suite, and no screen was exercised — `us030-check.mjs` drives `#date`,
`#start-time` and `#end-time`, ids that have not existed since `4a8d8bf`, so it
was already failing before this.

---

## «Новий контакт» aligned with `Shoot Detail v3.dc.html` (owner, 2026-09-03)

`app/(app)/shoot/[id]/crew/add.tsx` and both dictionaries.

Most of the form already matched v3's `isInvite`: the field order, the role
chips (36pt, radius 8), the trailing «Контакт збережеться в системі…» line, and
both CTA labels («Зберегти й додати» / «Зберегти», «Додати до команди (N)» /
«Виберіть учасників») are the same strings the artboard computes. Three gaps.

### The note now says who can read it

v3 puts an eye icon and «Нотатки бачите тільки ви — вони не показуються
учаснику.» under the notes field. Built as drawn.

**It is true by construction rather than by the label.** The link gateway
selects `crew_members.note` for **nobody** — not a client (CLAUDE.md rule 2,
`ADR-013`) and not a crew member either, because `US-023` is not built. So the
box reports what the gateway does, which is the only kind of privacy claim worth
putting on a screen.

**`US-023` would falsify it, and that is the thing to remember.** That story
hands a crew member the crew list **with** notes. The day it ships,
«не показуються учаснику» becomes a lie — so the copy has to move in the same
change, not after it. A grep for `crewNotesPrivate` is the reminder.

### Smaller

- **The notes placeholder** was «напр. привозить свій набір» — one example of a
  note — and is now v3's «Особливості, побажання, що варто врахувати», which
  asks for the substance instead.
- The textarea's minimum height goes 80 → 88, as drawn.

### «Мої контакти» leads with the people already on the shoot

Owner, 2026-09-03. `listPastCrew` hands contacts over most-recent-first;
`filterContacts` now partitions that list — already on this shoot, then everyone
else — and recency survives inside each group. A partition rather than a sort,
so an unstable comparator can never shuffle the recency order underneath it.

**It puts the unpickable rows first.** A contact already on the shoot is shown
dimmed with «У команді» and cannot be selected, so the top of the list is now
things you cannot act on. That is the intent — "who is already here" answered
before "who else could be" — but on a long list it pushes the rows you came to
tap further down, and it is worth revisiting if the contact list ever grows past
a screenful.

### Not followed

| # | What v3 does | Why not |
|---|---|---|
| S-28 | «Телефон — необовʼязково» | ~~Not followed.~~ **Followed** (owner, 2026-09-03) — see below. It deletes an acceptance criterion |
| S-29 | No Telegram field | Ours keeps it (owner, 2026-08-31; migration `20260831140000`). The gateway still does not send it where it does send `instagram` — the safe default, logged then and unchanged |
| S-30 | No note image | Unchanged: `US-005` collects an image with the note and the way in is still missing, though the column, the gateway's `noteImageUrl` and the crew link view all still work for rows that have one. Same shape as S-10 |

### The contact became optional, and that deleted `US-005` AC-2

The field was «Телефон або email» and **required**; v3 draws «Телефон —
необовʼязково» and the owner asked for it as drawn. It is not a restyle:

- **`US-005` AC-2 is marked *(required)*** and says "When neither a phone number
  nor an email is provided (an Instagram handle alone is not enough) — then
  saving is blocked and the creator is asked for a phone number or email."
  **It has to be amended in the discovery repo**, and the whole criterion goes:
  there is no weaker version of "saving is blocked" once the field is optional.
- **`crew_members_contact_required` is dropped** (migration
  `20260903140000_crew_contact_optional.sql`). Without that, an optional field
  would have produced a rejected insert — a failure at save rather than a soft
  one.

**What it costs.** `match_contact_to_user(email, phone)` is the only route from
a manually-entered crew row to a registered account, and it keys on exactly
those two columns. A crew member saved with neither can **never** be matched —
`US-009`'s whole mechanism, the only reason a crew member would ever register,
is silently unavailable for that person. Nothing warns anyone.

**The label no longer says an email is accepted**, though the field still takes
one: `splitContact` routes by the `@` and `keyboardType` stays `email-address`.
That is the artboard's wording. The quiet cost is that fewer people will think
to type an email, which is one of the two things matching keys on.

**Reversible only while no contactless rows exist.** Re-adding the constraint
later means deciding what to do with every row already saved without one.

`hasContact` and `contactRequired` are deleted — AC-2's rule has nothing left to
enforce. `crewContact` («Телефон або email») survives as its own key because the
shoot's client field still uses it.

### Verified

`tsc --noEmit` clean. **The acceptance suite was not run** (standing instruction),
and **`us005-check.mjs` changed shape**: its three AC-2 checks asserted the
refusal and now assert the inverse — a crew member with a handle and no contact
saves, and the database accepts a row with neither. The migration is **not
applied**; `npm run db:push` is needed before either behaviour is real.

---

## Shoot detail + edit against `Shoot Detail v3.dc.html` (owner, 2026-09-03)

`app/(app)/shoot/[id]/index.tsx`, `src/components/ShootDetailHeader.tsx`,
`app/(app)/shoot/[id]/edit.tsx`, `src/components/ReferenceGrid.tsx`,
`src/components/PersonSheet.tsx`, both dictionaries.

The artboard is **five screens**, not one — `isDetail` with three tabs,
`isEdit`, `isAdd`, `isContacts`, `isInvite`. Scoped to the detail screen and the
edit screen (owner, 2026-09-03); add-crew, contacts and invite are the add-crew
flow and have their own entry.

### Two things wrong with the artboard, found on the way in

**v3 had already deleted client view's entry point.** `enterClientView` and
`menuOpen` survive in its logic but **nothing in its markup references either** —
the ⋯ menu is gone from the header and an empty div sits where it was. So the
`clientView` banner and the `showPrivate` / `showNotes` gating are leftovers of a
feature whose way in the artboard had already removed. The owner's separate
removal (committed as `1acd054`) agrees with it rather than contradicting it.

**Its Materials CTA renders an empty white bar.** `showCta` is
`st.tab === 'Матеріали'`, but `ctaByTab` defines only a `'Деталі'` entry, so
`cta` falls through to `{ label: '', action: noop }` on the one tab that shows
it — while «Скопіювати посилання для всіх», defined for «Деталі», never appears
at all. The keys look swapped. **Not followed either way**: this tab keeps its
own «Додати референс або файл», which is a real action, and a group copy-link is
still a feature that does not exist (S-5).

### Decisions

| # | Question | Answer |
|---|---|---|
| S-19 | v3's header has no ⋯ menu and no subline | **Both removed.** The menu's two items are v3's two full-width buttons at the foot of «Деталі», so nothing is lost, and the date and time the subline carried are the card's own rows. The title moves left of centre — there is no second button left to centre it against |
| S-20 | The client's contacts | **Moved into the shoot card** on «Деталі», out of the «Команда» tab's «Клієнт» section, which v3 does not have. The **«Лише власник» badge went with them**: the fact it stated is unchanged and was never enforced by the label — the gateway's `ShootRow` has never selected the client's contact (`ADR-018`). A badge on the creator's own screen was a rehearsal of a guarantee made elsewhere, which is exactly why client view went |
| S-21 | v3 expands a crew row in place | **Built, and `PersonSheet` is retired.** The sheet showed the same four things over a backdrop that hid the list; an expanded row keeps the person among the others, which is what makes «2 з 4 підтвердили» above them legible while you work through them. The confirmation count is that heading now rather than a «Команда» row two tabs away |
| S-22 | «Профіль учасника», and the avatar as a link to the same place | **Drawn and inert.** There is no participant-profile route — `app/(app)/` has `client/[id]` and nothing else — and `Client Profile.dc.html` / `Public Profile.dc.html` are their own artboards and their own story. Follows the precedent the owner set on 2026-09-02 for controls whose destination does not exist. The **avatar is not a link**: a second dead link to the same missing screen adds nothing |
| S-23 | «Скасувати зйомку» on the edit screen | **Moved to the detail screen**, where v3 puts it beside «Редагувати зйомку». v3's edit screen carries no destructive action at all, which is the better arrangement anyway: it used to sit one divider below «Зберегти», inside the form for editing the shoot you were cancelling |
| S-24 | Reference tiles | **A three-column grid of square tiles**, where this was a wrapping row of fixed 84pt ones. A tile is ~118pt on a 402pt frame and the row always divides evenly. `ReferenceGrid` is shared, so `shoot/[id]/references.tsx` follows |

### The client's link, on the «Деталі» tab

`Shoot Detail v3.dc.html` gained a «Запрошення на зйомку» row after this screen
was built against it (owner, 2026-09-03). It sits at the foot of the shoot card,
inside `showPrivate`, under the client's contact rows — a full-width centred
control with a link glyph.

Built there. It is `US-027`'s share reached from the client rather than from a
menu, which makes "copy this person's link" one gesture wherever the person is
on screen: the «Команда» tab already gives each crew member the same control.
`clientLinkToken` needed nothing — the retired `PersonSheet` used it, so no new
token path exists.

**Labelled «Запрошення на зйомку»** — the artboard's word, applied to the crew
rows in the same change (owner, 2026-09-03). One key, `copyPersonLink`, so the
two cannot diverge.

**S-26 is withdrawn, and the reasoning behind it was weak.** It argued the
glossary confirms «посилання» for *link* and so the control had to say it. The
glossary rule forbids the loanword «лінк» as a **synonym** for посилання;
«запрошення» is not a synonym for link at all — it names the thing being sent,
which happens to contain one. `AccessLink`'s vocabulary is untouched:
`copyLinkTitle` («Скопіювати посилання») is still the crew row's accessibility
label, and the entity is still a *посилання* wherever it is discussed.

### `US-019` AC-2's confirmation did not exist, and now does

The ⋯ menu's «Скасувати зйомку» called `deleteShoot` **on a single tap**. Its own
comment claimed "the confirmation is `US-019` AC-2's and is kept";
`DropdownMenuItem` has never had one and takes only a `destructive` flag that
changes its colour. AC-2 is *required*, so the screen has been in breach since
the menu was built.

It goes through `useDestructiveConfirm` now — a real `UIAlertController` on
device, a dialog on web — the same hook `US-022`'s crew removal and the
profile's account deletion use. A full-width button is easier to hit than a menu
row, so this was not optional.

**«Скасувати зйомку» is still a rename, not a new action.** It soft-deletes the
row and revokes every link on it (`ADR-014`). Nobody is notified; the handoff's
«Команда й клієнт отримають повідомлення про скасування» is not built, because
nothing sends it.

### Smaller alignments

- **The duration moved into the «Час» row** as a dimmer suffix — «09:00 – 12:00
  · 3 год» — where it was a «Зйомка · 3 год» subtitle under the title. One row
  carrying two facts rather than a duration stranded above the rows.
- **The location card has no buttons.** «Маршрут» went first — drawn as
  designed and doing nothing when tapped, a stub the owner asked for on
  2026-08-30 — and «Копіювати адресу» followed (S-27). Which map app, and what
  `maps:` does on the static web export, remain the unanswered questions behind
  «Маршрут» (S-4). `LocationCard` no longer takes an `onCopied`, and neither
  does `DetailsTab`, which only passed it through.
- **The location card leads with the venue name.** `location_name` from
  yesterday's migration finally has a reader — the three display lines were
  written, reverted (that file was carrying uncommitted work) and are now back.
- **The «Команда» tab count is crew alone.** It was `crew.length + 1` because the
  tab showed the client too; counting them there now would promise a person who
  is not in the list.
- **The tab is «Команда», not «Люди»** (2026-09-03). v3 labels it that and the
  first pass of this entry had missed it. `tabPeople` keeps its key name on the
  rule `accessDetailsLabel` states — a tab label and the section label it now
  agrees with would drift the moment either is reworded — and because
  `DetailTab`'s `'people'` member and `tabCounts.people` are named for it.
  Renaming three identifiers buys nothing.

### The response chip: only «Підтверджено» now

v3 gates the crew badge on `hasBadge`, true **only when a person has confirmed**
— so a crew member who has not answered carries no chip at all, and the count
above the list («2 з 4 підтвердили») is what reports the shortfall. Built as
drawn: `ResponsePill` returns `null` for `pending`.

The shape changed with it — radius 6 rather than a full pill, `4px 8px`, 11px/500,
and a 12px check inside the confirmed chip.

**`declined` keeps its chip, against the artboard.** v3's fixture crew are only
`confirmed: true | false`, so it never had to decide — but `US-008` defines
three answers, and a refusal is not the same news as a silence. Hiding it would
make a crew member who said no look exactly like one who has not opened their
link, which is the one confusion this row exists to prevent.

**A gender bug went out with the old word.** `responseConfirmed` was
«Підтвердив» — masculine past tense, wrong on «Соломія Дяк» from the day it
shipped, and unfixable in that form because we store one name and no gender.
v3's «Підтверджено» is impersonal, so taking the artboard's word fixes it.
`responseDeclined` had the identical fault and took the same treatment (owner,
2026-09-03): **«Відмовлено»**, about the invitation rather than about the person,
so it needs no gender either. v3 draws no declined chip at all, so that word is
the owner's rather than the handoff's.

### Two things the collapsed crew row no longer shows

Both are consequences of S-21 that the entry above did not call out, and one may
be an acceptance regression.

- **The contact left the row.** It was `role · phone`; v3's collapsed row is
  `p.role` alone, with contacts inside the expansion. `US-005` AC-1 says a crew
  member "appears in the shoot's crew list **with that contact info** and note",
  which now means one tap away — **followed as drawn** (owner, 2026-09-03), on
  the reading that a row you can open is still the list. `us005-check.mjs`
  asserted the number on the collapsed body and now opens the row first.
  **`US-005` AC-1 is worth a word in the docs pass**: it is satisfied by
  navigation rather than by the row, which is a weaker guarantee than it was.
- **«Очікує» is gone**, per the section above. `us005-check.mjs` asserted it was
  shown; `US-005` AC-1 requires no response pill at all, so that was the suite
  over-specifying rather than an AC being broken, and the assertion is removed.
  `us010-check.mjs`'s negative check kept its stale «Підтвердив» literal and now
  names «Підтверджено».

### Not followed

| # | What v3 does | Why not |
|---|---|---|
| S-4 | The «Деталі» block is a sentence with the door code and the guard's number **in bold** | Unchanged. `location_note` is one free-text column and is where a creator writes exactly that sentence, so it renders unparsed. Splitting it into `code` and `security` is a migration and two form fields |
| S-25 | File rows edit their link **inline** — «Копіювати», a pencil, then an input with «Готово» / «Скасувати» | ~~Not built.~~ **Built** (owner, 2026-09-03) — see below |
| ~~S-26~~ | «Запрошення на зйомку» on the expanded row | ~~Kept as «Посилання на зйомку».~~ **Withdrawn 2026-09-03** — the artboard's word is used on the crew rows and the client's row alike. See «The client's link, on the «Деталі» tab» for why the glossary objection did not hold |
| S-27 | «Копіювати адресу» is not drawn | ~~Kept.~~ **Removed** (owner, 2026-09-03). It was kept on the argument that it worked and an uncopyable address is worse than one extra control; the owner overruled it, so the location card now has no buttons at all, exactly as v3 draws it. The address is still copyable where a reader without the app needs it — the link view draws its own «Копіювати адресу» (`uk.copyAddress`), untouched |

### Inline link editing, and the one-column write it needed

The pencil on a file row opened the edit screen; v3 opens the row. Built as
drawn — «Копіювати» beside a pencil while idle, an input with «Готово» and
«Скасувати» while editing, and the link line hidden behind `f.idle` because the
editor is showing the same value.

**It needed a write path that did not exist.** `updateShoot` takes the whole
`UpdateShootInput`, so saving one link from here would have meant re-sending the
client, the date, both times, three location fields and the notes — every one of
them a chance to write back a value the reader never touched, from a screen that
never loaded the form. `updateShootLink(id, field, value)` writes a single
column instead.

**It is deliberately not a general partial update**, and should not become one.
The two file links are a pair of independent scalars that `US-024` and `US-025`
already own, which is what makes a one-column write safe here and unsafe for the
rest of the row. The value goes through the same `normaliseFilesLink` the full
update uses, so nothing can enter by this door in a shape the other one rejects.

Empty clears the link, which is a real thing to want; anything else has to pass
`isValidReferenceLink` and says so in place (`US-003` AC-2's rule, reused rather
than restated). The row patches the screen's `shoot` on success rather than
refetching — a refetch would blink the whole tab for one field.

**«Копіювати» is an icon, not v3's text button** (owner, 2026-09-03). It sits
beside the pencil, and two controls doing the same kind of thing to the same row
read better as a matched pair than as a word next to a glyph — which also stops
the row wrapping once a file title runs long. The word survives as the
accessibility name, so nothing is lost to a screen reader.

The edit screen still owns the same two fields for anyone arriving that way;
this adds a second door, not a replacement.

**Kept although v3 draws none of them**, because each is real functionality with
a story behind it: the «Статус» segment on the edit screen (`US-020`), the two
file links (`US-024`, `US-025`), and the location attachment and its «Фото
локації» tile (`US-018`).

### Worth knowing

- **`PersonSheet`'s component is now dead code.** Its only caller was this
  screen. The module survives because two things in it are still used — the
  `SheetPerson` shape that `copyLinkFor` and `removePerson` take, and
  `handleUrl`, now exported for the client contact rows. Deleting the component
  and renaming the module is a follow-up, not part of this pass.
- `t.route` («Маршрут») is **not** dead despite the button going: the link view
  reads `uk.route` directly at `app/s/[token]/index.tsx:204`. It was removed and
  restored on the way through — a `t.route` grep misses the link surface, which
  is Ukrainian-only and imports the dictionary by name.
- New keys: `crewProfile`. `remove` already existed and is reused for the short
  «Видалити» beside «Посилання на зйомку».

### Verified

`tsc --noEmit` clean; `expo export -p web` builds. **The acceptance suite was
not run** (standing instruction for this phase) — and `us010-check.mjs` asserts
`!body.includes('Позначити як')` and `us021-check.mjs` filters on «Показати
всі» / «Позначити як», neither of which this pass touches. Anything driving the
⋯ menu or the person sheet will need updating; nothing was found that does.

---

## New Shoot, second pass against `New Shoot.dc.html` (owner, 2026-09-03)

`src/components/ShootFormFields.tsx`, `app/(app)/new-shoot.tsx`,
`app/(app)/shoot/[id]/edit.tsx`, `app/(app)/shoot/[id]/index.tsx`,
`src/components/ClientField.tsx`, `src/features/shoots/api.ts`,
`src/features/shoots/home.ts`, `src/features/shoots/date.ts`, both
dictionaries, and migration `20260903120000_shoot_location_name.sql`.

Two structural changes, and both reach past this screen: the time control is
different, and «Локація» is three fields where it was one. `ShootWhenFields` and
the location block are shared with the **edit** screen by construction
(2026-08-30), so both moved together — which is the point of sharing them.

### The time control was replaced, superseding the 2026-08-30 choice

The owner picked variant **2b** of `Time Picker Options.dc.html` on 2026-08-30:
a horizontal rail of half-hour slots, «Інший час» for the platform picker, and a
± duration stepper with the end **derived**. `New Shoot.dc.html` now embeds a
**range grid** — 24 hourly cells, six to a row; tap the start, tap the end —
with a «Скинути» control and a hint line that names the state
(«Торкніться початку» → «Тепер — кінця» → «3 год»).

**Taken as drawn, hourly** (owner, 2026-09-03). Three consequences, all
deliberate:

| # | Question | Answer |
|---|---|---|
| S-13 | The artboard's step is 60, so **09:30 becomes unexpressible** | **As drawn.** Its own `rangePicker(from, to, step)` takes a step and is called with 60; a 30-minute version would be 48 cells over eight rows. A shoot already stored at `09:30` **keeps its value** — nothing rounds it — and the summary line reports the truth, but the grid cannot highlight a cell that does not exist, so the highlight starts at the next full hour. Any tap replaces the pair with whole hours |
| S-14 | The end is entered rather than derived | So a shoot can be missing one again, and both forms validate for it. That **reinstates a refusal 2b had removed** — the log recorded 2b as removing "one of the four ways this form used to be refusable", and this puts it back. `US-030` AC-5 always stored both, so the columns never changed |
| S-15 | 23:00 + one step is 24:00 | Stored as `00:00`, which is an end **before** its start. `US-030` AC-3 is unwritten (02-product/open-questions.md item 14) so nothing forbids it, and the artboard does the same thing (`fmtM(to % 1440)`). The highlight normalises it back to 1440 rather than collapsing to an empty range |

`HALF_HOURS`, `DEFAULT_DURATION_MINUTES`, `durationBetween`, `endOf`, the
`TimeSlot` rail and the `StepperButton` are all gone; so are `timeStart`,
`startTimeRequired`, `otherTime`, `fromRail` and `duration`, which had no other
consumers. `formatMinutes` was split out of `formatDuration` in `date.ts` so the
duration can be formatted from a number instead of round-tripping through two
`HH:MM` strings — which could not express 24 hours at all.

**One departure inside the departure.** The artboard's `durLabel` is
`m < 60 ? m + ' хв' : (m % 60 === 0 ? … ' год' : Math.floor(m / 60) + ' год 30 хв')`
— it hardcodes «30 хв» for every non-zero remainder. Ours prints the real one.
At a 60-minute step the two only differ on a range that came from stored data,
which is exactly the case the artboard's shortcut gets wrong.

### «Локація» is three fields now, and one is a new column

| # | Question | Answer |
|---|---|---|
| S-16 | «Назва» has no column | **`location_name` added** (owner, 2026-09-03; migration `20260903120000`). **No story defines it** — `US-002` and `US-018` need amending. It resolves a conflation rather than adding a concept: `location_address`'s placeholder was literally «Назва або адреса», the location chips put a venue name in it, and the shoot-detail screen offers to open that same value in Maps |
| S-17 | «Деталі» | **`location_note`, unchanged.** It already meant "how to get in" (`US-018` AC-2) and the edit screen already collected it as «Нотатки (як доїхати тощо)». Only the label moved, and the create form collects it now too |

**The new column is NOT on the link surface, and that is the part to check first
if anything changes.** The link gateway is untouched: every `shoots` SELECT in
`link-gateway/index.ts` names its columns explicitly and none names this one,
and the same is true of `crew_shoots()` (20260827100000) and of the ICS export
in `src/features/links/calendar.ts`. So a photographer who fills in «Назва»
today sees it only in the app — no crew member and no client receives it.

That is the same stance `shoots.notes` took (20260830160000) and for the same
reason: **no story says who may see a venue's name**, and the omission is
reversible in the cheap direction. Adding it to `crewPayload`, or beside
`location_address` in the ICS `location` field, is one line whenever a story
asks. Un-shipping it from a payload that already went out is not.

**Nothing displays it yet, so the column is write-only.** The shoot-detail
location card was written to lead with it, above the address — and then reverted
(owner, 2026-09-03): `app/(app)/shoot/[id]/index.tsx` was carrying unrelated
uncommitted work, and three display hunks in that file would have gone into this
commit on top of it. Re-applying them is three lines whenever that file is
clear. Until then «Назва» is collected, saved, and invisible.

**`pastLocations` now reads `location_name`.** The chips have always held a
venue name («Студія KULT») rather than a street address, and the artboard puts
them under «Назва», so they follow the value rather than the column they used to
live in. Consequence: **the chips are empty until names are entered.** Nothing
backfills them, because there is no way to tell which half of an existing
`location_address` was the name.

`overlappingShoots` takes an end instead of a duration, now that the forms
collect one.

### Smaller alignments

- **The client field gets the artboard's error border.** `clientLine` → `#7f1d1d`
  on a refused save; `ClientField` takes an `invalid` prop and uses the same
  `border-destructive/60` `MonthPicker` already uses. The message was there
  before, the border was not — so a reader scrolling back up had nothing marking
  *which* field had failed.
- **The summary bar names today and tomorrow.** «Сьогодні, 19 вересня» /
  «Завтра, 19 вересня», as drawn. `todayWord` / `tomorrowWord` already existed.
- All three location fields carry the artboard's 13/500 label, via a new shared
  `FieldLabel`. The single field had none at all.

### Not followed

| # | What the artboard does | Why not |
|---|---|---|
| S-11 | Weekday row **Sunday-first** | Unchanged. Ukrainian weeks start Monday; same US default leaking through the prototype's `Date` maths as C-3 |
| S-12 | `renderVals` carries `crewChips`, `crewCount`, `moreOpen`, `toggleMore`, `moreHint` | **Still none is referenced in its own markup** — leftovers, exactly as on the first pass. Picking crew at creation time has no column and no story |
| S-18 | The header lets «Скасувати» and «Зберегти» size naturally, with the title on `flex:1` | Ours keeps fixed side slots so the title is centred on the SCREEN rather than on what is left between two labels of different lengths. Same reasoning as the profile header |
| C-10 | The CTA sits on a **gradient fade** | **Still not built**, on this screen as on the calendar. It needs `expo-linear-gradient`, which is not a dependency |

### Verified

`tsc --noEmit` clean; `expo export -p web` builds. **The acceptance suite was
not run** (standing instruction for this phase). **The migration has not been
applied** — `npm run db:push` is needed before either form will save.

### Two suites that were already broken, and one kept working

`us018-check.mjs` drives `#address` and `#location-note`. The refactor would
have dropped both ids, so they are set explicitly on the shared fields — the ids
cost nothing and the assertions keep working.

`us030-check.mjs` drives `#date`, `#start-time` and `#end-time`. **Those ids have
not existed since `4a8d8bf`**, when the first ADR-017 pass replaced that row with
`MonthPicker` plus the rail — `git log -S'id="start-time"'` confirms it. It is a
pre-existing break, untouched here, and fixing it means rewriting what the test
drives rather than what it reads. Its display assertion («09:00 – 12:00») still
holds.

---

## Calendar, second pass against `Calendar.dc.html` (owner, 2026-09-03)

`src/components/ShootCalendar.tsx`, `app/(app)/shoots.tsx`,
`src/components/StatusPill.tsx`, both dictionaries, and two acceptance suites.

**The bottom tab bar is deliberately not built** (owner, 2026-09-03: "ignore
navigation which appeared at the bottom, we will implement it later,
separately"). The artboard's four tabs and the `bottom:74px` they push the CTA
to are out of scope here; see the note at the end of the profile second-pass
entry for what a tab bar costs.

### The grid was the whole gap

| | Artboard | Was |
|---|---|---|
| month cell | `aspect-ratio:1` square, radius 8, 4px gaps, whole cell fills on select | fixed `h-11` row holding a 32pt **circle**, no gaps |
| today | 1px `#3f3f46` border on the cell | **not marked at all** |
| day with shoots | number brightens to `#fafafa`, empty days sit at `#a1a1aa` | every number the same colour |
| dot on a selected cell | inverts to `#18181b` | stayed `muted-foreground` on the fill |
| week mode | shares the weekday header above; cells are `9px 0` rects | weekday letter **inside** each cell, own 30pt circle |

The weekday header sits outside the artboard's `isMonth` / `isWeek` branches, so
it belongs to the card rather than to the month grid. Ours was inside
`MonthGrid`, which is why the week strip had grown a second copy of the letters.
Moving it out removed that duplication.

A month cell is now ~46pt wide on a 402pt frame (346 − 24 of gaps, over seven),
so §6.3's 44pt minimum still holds without the fixed height that used to
guarantee it. **Worth re-checking on a smaller device**: on a 375pt frame it
works out to ~42pt, and the cell no longer has a floor.

### Decisions

| # | Question | Answer |
|---|---|---|
| C-6 | The status badge is a radius-6 rect in the artboard; `StatusPill` was a full pill, and `Badge` already drew the artboard's shape | **`StatusPill` changed globally** (owner). `rounded-md px-2 py-[3px]`, caption/semibold — the two controls agree now instead of one being the last pill-shaped chip. It restyles the **shoot-detail** badge too, and that frame has not been re-diffed |
| C-7 | The artboard labels statuses «Заплановано» / «Завершена»; the app said «Нова» / «Закінчена» | **The artboard's words** (owner). The enum stays `new` / `finished` — CLAUDE.md rule 5 keeps identifiers on the glossary, and only what the reader sees moved. This is `US-020` copy and reaches every screen showing a status: the shoot detail, the home card, the edit screen's segment |

`markNew` / `markFinished` moved with them. Both have had **no consumer** since
the edit screen's toggle became a `Tabs` segment; they are kept in step rather
than removed, and are candidates for deletion.

### Agenda row

- **The avatar rings were the wrong colour.** `AvatarStack` ringed with
  `border-card` (`#1F1F22`) — a leftover from when the row was `bg-card` — while
  the row is `bg-background` (`#0A0A0A`), so every crew avatar carried a halo.
  The artboard writes `border:2px solid {{ s.cardBg }}`, and that value *differs
  per row*: a clash row lifts to `secondary`. The row passes its own surface
  down now.
- **Time column fixed at 48pt**, was `minWidth: 52`. A growing column moved the
  hairline beside it from row to row; the artboard's is one width throughout.
- Spacing to the artboard's: location `margin-top:4`, crew stack `10`, time
  weight 600 rather than bold.
- **Spacing by `gap`, not trailing margins.** A row's `mb-2` added to the next
  group's `mt-4`, so groups sat 24px apart where the artboard has 16.
- `CrewRow` lost its `rounded-[14px]` override — `AgendaRow` beside it is 12,
  and the artboard draws one radius for every row in the list. The claim in that
  component's own comment that it is "the same card as AgendaRow" is now true.

### Three smaller alignments

- **The filter bar's clear is a bare ✕.** C-5 recorded «Показати всі ✕» as
  "built as drawn"; the artboard puts the glyph alone and the words in
  `aria-label`. **C-5 is corrected**: the label is now the accessibility name,
  which is the only reader that needed it beside a row already headed «Зйомки ·
  19 вересня».
- **The empty card lost its button.** It carried an outline «+ Нова зйомка»
  which the artboard's empty card does not have — and the pinned CTA sits a few
  pixels below, so the card offered the same action twice.
- **`+ Нова зйомка`, one space.** It was written `+  ` with two. The home
  screen's identical CTA (`app/(app)/index.tsx`) still has two — one character,
  left alone because that screen is not in this pass.

### Not followed

| # | What the artboard does | Why not |
|---|---|---|
| C-3 | Weekdays are `['НД','ПН',…]`, Sunday-first, `startOfWeek` on `getDay()` | **Unchanged from the first pass.** Ukrainian weeks start on Monday; the artboard's order is a US default leaking through its plain `Date` arithmetic |
| C-4 | Three statuses — `planned` / `progress` / `done` | Two. `shoot_status` is an enum of two and `US-020` AC-2 says there is no way to reach a third. The artboard reserves white for `progress`, so our stripe uses only its two quiet tones |
| C-8 | Weekday letters are **uppercase** | Kept as «Пн Вт Ср» — but **the stated reason was wrong** (corrected 2026-09-03). It said uppercasing would mean "two cases for one dictionary"; `MonthPicker.tsx` **already uppercases the same array**, so the app is already inconsistent and `ShootCalendar` is the odd one out. What actually holds it back is narrower: the weekday literal is what **five** acceptance assertions match on (`us004` ×3, `us014`, `us015`). Aligning it is a deliberate five-line change to those suites, not a side effect of a 10px label |
| C-9 | The week label reads «13 вересня — 19 вересня» | Ours drops the repeated month: «13 — 19 вересня». The artboard formats both ends through one helper that has no same-month case — an artifact of the prototype's arithmetic rather than a drawn decision, same class as C-3 |
| C-10 | The pinned CTA sits on a **gradient fade** (`#09090b 62%` → transparent), no border | **Not built.** Ours stays a solid `background` bar with `border-t`. The fade needs `expo-linear-gradient`, which is not a dependency, and adding one was not part of this ask. One `npx expo install` away |

### Verified

`tsc --noEmit` clean; `expo export -p web` builds. **The acceptance suite was
not run** (still the owner's standing instruction for this phase), so the two
suites edited below are updated but unproven.

### Tests touched, and one that was already broken

`us020-check.mjs` and `us009-check.mjs` match on the status words as literals,
so C-7 required updating them: «Нова» → «Заплановано», «Закінчена» →
«Завершена», in assertions and messages alike.

`us020-check.mjs` also asserts on «Позначити як «Завершена»» — a string with **no
consumer in the app**, since that toggle became a `Tabs` segment. The literal was
updated in step, which leaves the assertion exactly as stale as it already was.
It is a pre-existing break, not one this pass caused, and fixing it means
rewriting what the test drives rather than what it reads.

---

## Profile, second pass against `Edit Profile.dc.html` (owner, 2026-09-02)

`app/(app)/profile.tsx`, a new `src/components/ui/switch.tsx`,
`src/components/LanguageSwitcher.tsx`, `src/features/auth/profile.ts`.

The artboard moved after the 2026-08-31 rebuild. **Four sections were added that
nothing in the repo backs** — «Підписка», «Сповіщення», «Написати в підтримку»,
and a button to a public profile screen that does not exist — and two things the
built screen has were dropped.

### Decisions

| # | Question | Answer |
|---|---|---|
| P-5 | The artboard renders **no save button**. `onSave`, `saveLabel`, `saveBg` and `saveFg` are all computed in `renderVals()` and nothing consumes them; the scroll container's bottom padding shrank from the build's 104px to 40px, so the sticky bar is *gone*, not hidden | **Save moved into the header**, opposite «Скасувати», in the 74px slot the design leaves empty. The sticky footer is deleted. The three states become weight and colour on a header word instead of a filled bar |
| P-6 | The design makes **email editable** — `type=email`, format validation, and «Надішлемо лист на нову адресу — вхід зміниться після підтвердження.» plus an unverified state driven by a new `emailState` prop | **Not built. P-1 stands.** Editing the login means `auth.updateUser`, `double_confirm_changes = true` mails BOTH addresses, and `public.users.email` is the crew-matching key (`match_contact_to_user`). That is a story with a migration, not a restyle. The row stays read-only |
| P-7 | Four sections with no data model, no column and no story | **All four built, UI only** (owner, 2026-09-02: "Do just stub on UI, thats it"). Nothing is persisted and nothing reaches Supabase. Each is marked in the source as a stub |
| P-8 | The **stats row is no longer rendered**, though `stats: [24 Зйомок, 11 Клієнтів, 6 У команді]` is still computed in the artboard's script. The «Переглянути публічний профіль» button sits where they were | **Removed to match**, and `profileStats()` + `ProfileStats` deleted with it — this screen was their only caller. Reverses the "built" half of P-3 |

### Two things in the artboard look like slips, and only one was treated as one

`stats` and the save button are dead in exactly the same way: computed in
`renderVals()`, consumed by no markup. They were resolved in **opposite
directions** — the stats removed, the save button rebuilt in the header — and the
reason is the bottom padding. It dropped from 104px to 40px, which is a
deliberate edit to make room that a sticky bar no longer needs; nothing
equivalent argues that the stats were meant to stay. A screen that cannot save is
not a design, so the button had to go somewhere; the header slot is the one place
the artboard leaves empty.

Worth a glance from the owner all the same: if either reading is wrong, it is
cheap to reverse now.

### What the four stubs actually are

- **Підписка** — one «Тариф · Free» row. Static. No plan concept, no column, and
  billing contradicts `architecture.md` Stage 1's $0 development.
- **Сповіщення** — «Нагадування про зйомку» and «Нові підтвердження», two
  switches on local `useState`. Not persisted, so they reset every launch. There
  is no `expo-notifications`, no push-token table and no sender.
  `app/(app)/index.tsx:82` already recorded that the mockups imply a notification
  system with no table behind it; this is the same gap, now with a control on it.
- **Написати в підтримку** — a row. No support address exists anywhere in the
  repo, so it opens nothing.
- **Переглянути публічний профіль** — a button to `Public Profile.dc.html`, which
  is its own artboard and its own story. No route.

**No new switch existed.** `src/components/ui/` had checkbox but nothing
toggle-shaped, so `switch.tsx` is new, built to the artboard's spec (42×26 track,
22px knob, 160ms).

### Smaller departures

- **The «Це ваш логін. Щоб змінити — напишіть нам.» note is gone** (owner,
  2026-09-02), and with it the `emailIsLogin` key in both dictionaries and
  `ProfileRow`'s `note` prop, which had no other caller. This **supersedes
  P-1's answer**, which was the read-only row *plus* that copy. The row is now
  read-only and silent about why: closer to the artboard, which carries no such
  line, but the reason a photographer cannot edit their own login is no longer
  anywhere they can read it. If anyone asks, that is why.
- **The role chips are now nine** in the design (adding Відеограф, Hair стиліст,
  Модель, Асистент, Продюсер) against `ROLES_UK`'s five. Kept at five, on the
  precedent already set for this control: they are stored values read back on
  every surface, and the glossary confirms the list. This is the second time the
  artboard's role set has grown — worth confirming the glossary has not moved.
- **«KULT Studio» is back** in the subtitle (`displayRole` concatenates it).
  Still no studio column; **P-3 stands** and the subtitle is role-only.
- **«Вийти з акаунту» is muted grey in the design**, not the destructive red the
  build used. Followed — delete is now the one red thing on the screen, and two
  competing reds was always the weaker read.
- **«Видалити акаунт» moved into the Налаштування card** as its last row, red
  text with a red chevron. Only the trigger changed; it still wraps
  `DestructiveAction`'s real iOS alert.
- **Rows gained leading 18px icons** and tint on focus (`#121214`) and error
  (`#1c1011`).
- **«Мова» moved** out of Акаунт into the new Налаштування card and became a
  segmented UA/EN control with a live sample line («Українська · 19 вересня,
  09:00», from `src/features/shoots/date.ts`). **P-2 still stands** — the
  switcher exists nowhere else, so it survives regardless of where the artboard
  puts it.

### Still open

- **A-6, sharpened again.** The artboard's footer says «LUNA CRM · версія 1.0»
  where `app.config.ts:11` says `0.1.0`. The version is now rendered from
  `expo-constants` so it cannot drift, but the wordmark is a judgement call: the
  handoffs have now spelled the product **five** ways, and the artboard's own
  toast adds «Тарифи LunaCRM» to «LUNA CRM». One spelling needs picking.
- **What the stub rows do on tap.** The artboard toasts. Built **inert**, and
  nothing toasts: a toast naming a feature that does not exist is worse than a
  row that does nothing.

  They were first built without chevrons too, on the reasoning that a chevron
  promises navigation. **Overruled by the owner, 2026-09-02** — «Тариф» and
  «Написати в підтримку» carry their chevrons as drawn, and «Написати в
  підтримку» is no longer dimmed. The stubs now *look* finished and are not, so
  the gap is invisible on the screen and lives only here and in the source
  comments. Worth remembering when someone taps one and nothing happens.

  Still dimmed, and not raised: the «Переглянути публічний профіль» button
  carries `opacity-60` for the same reason the support row used to. Say if it
  should come up to full strength as well.
- **Whether the Сповіщення toggles should survive a relaunch.** They do not.
  Local state that resets reads as a bug; persisting it implies a preference that
  changes nothing. Neither is right until there is a sender.
- **`socialSeenByCrew` kept**, though the artboard drops it. It is the only place
  the UI tells you who sees your handles, which is an `ADR-013` fact rather than
  decoration.
- **The «Незбережених змін: N» counter kept**, though the artboard drops the text
  while keeping the flex wrapper that held it. With Save now a quiet header word
  rather than a full-width bar, the counter does more work than it did.

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
| C-5 | The filter bar's clear reads **«Показати всі ✕»** | ~~Built as drawn.~~ **Corrected 2026-09-03** — the artboard draws the ✕ alone and carries «Показати всі» in `aria-label`, so the words were never visible text. The clear is a bare glyph with that accessibility name now. `allShoots` («Всі зйомки»), the older label on the pill this replaced, remains unused |

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

---

## 2026-09-04 — Colour returns, from `shadcn-theme.css`

**Source:** `~/Desktop/shadcn-theme.css` + `~/Desktop/THEME-HANDOFF.md`, the
Claude Design export of the design project's own `theme.css` remapped onto the
shadcn dictionary. Owner's instruction.

This **reverses the monochrome passes of 2026-08-29 and 2026-08-30** recorded
above, including the loss those entries called "real, worth stating plainly".
Access level is not what comes back — the client purple and the owner-only
purple stay gone — but shoot status, response, links and avatars are coloured
again.

### The vocabulary, narrower than ADR-017's

| Meaning | Tokens |
| --- | --- |
| «Запланована» | `--info` / `--info-bg` / `--info-border` (blue outline) |
| «Завершена» | `--danger-soft` / `--danger-bg` / `--danger-border` (red outline) |
| «Сьогодні» | `--accent-solid` (solid blue fill, no border) |
| «Очікує» | `--warn` / `--warn-bg` / `--warn-border` (amber) |
| «Підтверджено» | `--success` / `--success-foreground` (solid green) |
| Links, active tab | `--link` / `--link-hover` |
| Avatars | `--chart-1…5` + `--tint-foreground`, hashed by name |

`--destructive` is unchanged and stays the colour of an *action* that destroys
something. `--danger-*` is a state that has ended. Do not merge them.

### Adapted, not copied

The handoff targets a Next.js/Tailwind-v4 project — `app/globals.css`,
`@theme inline`, `<html class="dark">`. None of those exist here.

1. **oklch → HSL.** NativeWind's CSS-to-RN pass rejects `oklch()` outright
   (`parseDeclaration.js`, "Invalid color unit") and returns `undefined`, which
   styles nothing and reports nothing. Every value was converted once; each
   token carries its `oklch()` original in a comment so it can be re-derived.
2. **`@theme inline` → `theme.extend.colors`.** Tailwind v3 has no `@theme`.
   The class names come out identical, which is what the handoff specifies.
3. **No `.dark` block.** One theme on `:root`; nothing applies the class.
4. **`--border-strong` kept** (14 files use it), valued from the design
   project's `theme.css`. **`--sidebar-*` dropped** — no sidebar exists.

### The one trap this theme sets

**`--secondary` now equals `--card`** (`#121214`). A `bg-secondary` fill on a
`bg-card` surface is invisible. Two things moved because of it:

- `Badge`'s `muted` variant → `bg-accent` (`#18181B`).
- `Card`'s `flat` variant → `bg-card`. It was `bg-background`, which worked
  while the two were a few points apart in the zinc scale; they are 4.7 points
  apart now and a flat card would have been the only surface with no fill.
  `flat` now means *no shadow*, not *no fill*.

`Avatar` was `bg-secondary` too and would have hit the same wall; it takes a
hashed pastel tint instead, which is what ADR-017 had before 2026-08-29.

### Shape

**Buttons and badges are pills** — `rounded-full` on every `Button` variant and
size, on `Badge`, `StatusPill` and `ResponsePill`. This reverses the owner's
2026-09-03 move to radius 6 that matched `Calendar.dc.html`. `--radius` is
`0.875rem` (14px) and governs cards and sheets only.

### Verified

`tsc --noEmit` clean. Tailwind compiles and all 17 new classes resolve to
`hsl(var(--token) / <alpha-value>)`; opacity modifiers (`bg-primary/90`) still
emit, so RNR's press states are intact.

**Not verified: anything on a device or in a browser.** The contrast pairs this
theme introduces have not been looked at — in particular `--warn` on
`--warn-bg`, `--info` on `--info-bg`, and the dark `--tint-foreground` initials
on the five pastel avatars. Worth a pass through `npm run theme`.

### Home screen re-diffed against `Home.dc.html` (same day)

Three fidelity bugs the theme change exposed:

1. **The two buttons were not pills.** «Нова зйомка» and «Переглянути календар»
   passed `rounded-lg` in their own `className`, which `cn()` merges last, so
   they overrode `Button`'s `rounded-full` and kept a 14px corner. The artboard
   draws both at `border-radius:999px`. Removed. These were the **only two**
   `Button` call sites in the app overriding the corner — everything else that
   sets `rounded-*` is a `View` or a `Pressable` tile, which is correct.
2. **«Наступні зйомки» had no gap.** It was one `Card` with `border-t` between
   rows; the artboard draws each shoot as its own `radius:12px` card in a
   `gap:8px` column. Each `UpcomingRow` is now its own card.
3. **The upcoming row's press was invisible.** `active:bg-secondary` on a
   `bg-card` surface, and those two tokens are now the same value. Moved to
   `active:bg-muted`, which is the artboard's `--surface-soft` — a step
   **darker** than the card. This design presses down, not up.

**Open, and bigger than this screen:** `active:bg-secondary` appears at 43 call
sites across 18 files. On `bg-background` it is still a visible press; on any
`bg-card` surface it is now a no-op. They have not been audited one by one.

### The status badge, and the word on it (same day)

**Style.** `UpcomingRow` on the home screen drew the status as a neutral outline
`Badge`. That was right under the monochrome theme — the design gave every row
the same chip, and a fill on a list where every row says one word is noise — but
`Home.dc.html` does not draw it neutral:

```
background:var(--info-bg);border:1px solid var(--info-border);color:var(--info)
```

That is the blue «Запланована» chip, and `StatusPill` now renders exactly it.
Switched. A «Завершена» row comes out red by the same mapping. The other two
`StatusPill` sites — the shoot list and the shoot detail — picked the colours up
from the theme change already.

**Geometry.** Both `StatusPill` and `Badge` were `py-[3px]` at `font-semibold`,
neither traceable to a source. Both artboards say the same thing —
`Home.dc.html` inline (`font-size:11px;font-weight:500;padding:4px 8px`), the
shoot-detail handoff as "badge 11/500" — so both are now `px-2 py-1` at
`font-medium`.

**Copy — a grammar bug, owner-settled.** `statusNew` was «Заплановано», the
impersonal form, sitting beside a feminine «Завершена». Both agree with
«зйомка» now: **«Запланована» / «Завершена»** (owner, 2026-09-04).

`Home.dc.html` disagrees with itself here — its upcoming rows say «Запланована»
and its next-shoot meta line says «Заплановано» — which is why this was never
caught by drawing the screen as given. One string serves both places.

`markNew` follows it («Позначити як «Запланована»»), and nine hardcoded literals
in `tests/acceptance/us020-check.mjs` and `us009-check.mjs` were updated with it.
Those suites have not been run — see the header of this file.

### Calendar re-diffed against `Calendar.dc.html` (same day)

**Day cells.** One colour bug and one radius bug.

- The marked dot was `bg-muted-foreground`. `cellStyle` reads
  `dot: has ? (sel ? 'var(--accent-ink)' : 'var(--info)') : 'transparent'` — it
  is blue, and was grey only because the monochrome theme had no blue. Now
  `bg-info`.
- Selected (`bg-primary` fill, inverted dot), today (`border-strong` edge,
  heavier number) and has-shoot (`foreground` vs `muted-foreground`) all already
  matched. `--primary` *is* the artboard's `--accent`, so the selected fill was
  correct by construction.
- Geometry — 4px grid gap, 6px under the weekday row, `9px 0` week cells, 12px
  card padding — all matched.

**Shoot cards.** Five divergences, all from the monochrome era.

| | Was | `Calendar.dc.html` |
| --- | --- | --- |
| Card fill | `bg-background` | `bg-card` (`var(--surface)`) |
| Clash row | lifts to `bg-secondary` + grey `border-strong` | fill unchanged, border → `--warn-border` |
| Clash chip | neutral outline `Badge` | amber: `--warn-bg` / `--warn-border` / `--warn`, 10.5/500 at `3px 7px` |
| Status stripe | `border-strong` / `border` (two greys) | `--info-border` / `--danger` |
| Location | `text-muted-foreground` | `color:var(--link)` |

The clash row is the one worth naming: the artboard sets
`cardBg: 'var(--surface)'` for **every** row and varies only `cardLine`. Lifting
the card was wrong on its own terms, and under this theme it was also a no-op —
`--secondary` equals `--card`. `AvatarStack` lost its `ringClass` prop with it;
there is one surface behind the stack again.

**`--radius`: 14px → 8px (owner).** The handoff calls `0.875rem` "радіус
карток", but no artboard draws a card at 14 — `Home.dc.html` and
`Calendar.dc.html` both use 12, and the value traces to `--r-card` in the design
project's `theme.css`, which the artboards never reference.

In this codebase `--radius` reaches no card at all: `Card` and the row surfaces
are `rounded-xl`, Tailwind's stock 12px. What it reaches is `rounded-lg`/`md`/
`sm` — 70 uses, every one a small control the artboards draw at 8px. Set to the
card radius it made all seventy 4px rounder and no card more correct. The ladder
is now 8 / 6 / 4 against the artboards' 8 / 10 / 12 / 999.

## 2026-09-04 — A shoot's status becomes derived (`US-020`)

**Owner:** "shoot is «Завершена» if current day > shoot day, if no — «Запланована»".
Chosen from three options; the two rejected were a derived default with a manual
override, and re-homing the manual control.

### What was actually broken

The status had been **unreachable since 2026-09-03**. The «Статус» segment went
with the New Shoot / Edit Shoot merge, `setShootStatus` lost its last caller,
and the column sat at its `'new'` default for every row in existence. Nothing in
the app could produce a «Завершена» shoot — the red stripe and red badge added
earlier the same day were dead code. That is what this fixes.

### The rule

`src/features/shoots/status.ts`, applied once in `toShoot` so no screen derives
its own and no two screens can disagree:

```
finished  ⟺  now > date + end_time        (end_time null → end of that day)
```

Sharper than the owner's literal wording on purpose: `US-030` made `end_time`
required, so a shoot that ran 09:00–12:00 does not stay «Запланована» until
midnight. Rows predating `US-030` have no `end_time` and fall back to the plain
day rule as stated. All local wall-clock, like every other date helper here.

Ten boundary cases checked by hand, including both sides of an end time, the
null-`end_time` fallback, and 31 December → 1 January.

### Cost, stated plainly

**A cancelled shoot, or one that never happened, reads «Завершена» once its date
passes.** The model cannot tell "done" from "gone", and there is no longer any
way to say so. `US-019`'s delete is what a mistake uses. A shoot finished early
stays «Запланована» until its end time.

### `US-020` AC-1 is retired and owes the discovery repo an amendment

> "the creator changes its status to Finished … **and can be changed back to New
> the same way**"

There is no control and no column behind one. `docs/product/` is read-only here
(CLAUDE.md), so the debt is recorded in `status.ts`, in the migration, in the
rewritten suite, and here. **AC-2 survives and is now structural** — "no way to
reach any other status value" holds because there is no way to reach any value.

### Changed

- `src/features/shoots/status.ts` — new, the only thing that produces a status.
- `api.ts` — `status` dropped from `SHOOT_COLUMNS` and `ShootRow`; derived in
  `toShoot`; `setShootStatus` deleted. `Shoot.status` stays a field, so every
  display site (`StatusPill`, `STRIPE`, the home meta line) is untouched.
- `20260904160000_derive_shoot_status.sql` — drops the column and the
  `shoot_status` enum.
- `us020-check.mjs` — rewritten to assert the rule (a past shoot reads
  «Завершена», a future one «Запланована») instead of a control that no longer
  exists.

The link gateway never selected `status` and no link payload has ever carried
one, so no crew member or client sees a status and `ADR-013` is not involved.

**Unrun.** The migration has not been applied and the suite cannot execute — its
seed inserts `client_name`/`client_contact`, dropped on 2026-08-29, which is
true of **every** suite in that directory and predates this change.

### The screen background's stars (same day)

**What the design has and the app did not.** Every artboard puts
`background:var(--bg-screen)` on its screen container, and `theme.css` defines
that as `var(--stars), var(--bg)` — four stacked repeating radial-gradients over
the page colour. **`shadcn-theme.css` does not carry `--stars` at all**; the
handoff dropped it, because four tiling gradients have no shadcn token to land
in and no CSS equivalent in React Native. Flagged when the theme landed, now
built.

`src/components/Starfield.tsx` — four layers, decoded from the CSS:

| Layer | Colour | Alpha | ⌀ | First dot | Tile |
| --- | --- | --- | --- | --- | --- |
| 1 | `#EEEEF2` | .42 | 1.2px | (24, 34) | 167×167 |
| 2 | `#E7E7EB` | .28 | 1.0px | (118, 92) | 223×223 |
| 3 | `#DDDDE3` | .22 | 1.6px | (70, 148) | 311×311 |
| 4 | `#F5F5F7` | .16 | 0.9px | (190, 20) | 271×271 |

167, 223, 271 and 311 are all prime, so the four tiles only truly align every
few million pixels — the field never visibly repeats. **36 dots on a 402×874
artboard, 33 on an iPhone 15 Pro, 16 on an SE, and no two overlapping.**

`radial-gradient(Dpx Dpx at x y, C 50%, transparent 51%)` is a hard-edged disc
of radius D/2, not a glow — hence plain `Circle`s.

**Explicit circles, not an SVG `<Pattern>`.** At ~36 dots the arithmetic is
cheaper than four pattern tiles and can be read and checked in the file, instead
of depending on how one library implements `patternUnits` across iOS, Android
and the static web export. `react-native-svg` was already a direct dependency
and already reaches the link surface through `lucide-react-native`.

**Where it is mounted, and where it deliberately is not.** 35 screen roots
across 21 files — every `View` that is both `bg-background` and `flex-1`.
Headers (`border-b`), pinned footers (`absolute inset-x-0 bottom-0`) and the
bottom bar have no `flex-1` and stay flat, which is what the artboards draw:
they are `background:var(--bg)`, no stars. A starred header would drag its dots
across the content scrolling beneath it. Cards are `--surface` and cover the
field by design.

`useWindowDimensions`, not an `onLayout` measure: the field is fixed to the
screen while content scrolls over it, exactly as in the artboards, so the window
is the area to cover and no layout pass is needed. `pointerEvents="none"` is
load-bearing — it covers the whole screen.

**`--bg-desk` is not implemented and should not be.** It is the radial gradient
behind the *device frame* in the artboards — the desk the phone sits on, part of
the presentation, not of the product.

**Unverified on a device.** Whether a 1.2px dot at 42% opacity survives real
subpixel rendering on a physical screen is exactly the kind of thing this needs
eyes on.

### The calendar row's address goes grey (same day)

`Calendar.dc.html` writes the shoot row's location as `color:var(--link)`, and
it shipped that way for a few hours today. **Overruled by the owner:** the
address is not a link — nothing on that row opens a map — and the blue promised
an action the row does not have. Now `text-muted-foreground`.

This also puts the calendar back in step with the home screen's «Наступні
зйомки», whose own artboard already draws the same line in `--text-dim`. The two
were inconsistent for exactly as long as the blue lasted.

`text-link` keeps its two real uses: the bottom navigation's active tab and
`Button`'s `link` variant — both things that actually go somewhere.

### Starfield: the auth screen, and five screens that never showed it (2026-09-05)

Asked for the auth screen; it turned out the first mount pass had missed a whole
shape of screen and quietly broken three more.

**The pass keyed on `View` + `bg-background` + `flex-1`.** Five screens do not
have one — their outermost element is a `ScrollView` that paints the background
itself:

- `src/features/auth/AuthScreen.tsx` (the ask)
- `app/(auth)/reset.tsx`
- `app/s/[token]/references.tsx`
- `app/s/[token]/crew/[crewId].tsx`
- `app/(app)/shoot/[id]/references.tsx`

An absolutely-positioned child of a `ScrollView` is laid out against the
**content**, not the viewport — it would have been sized to the full scroll
height and scrolled away with it, which is the opposite of a fixed backdrop. So
these five are wrapped: a `bg-background flex-1` `View`, the `Starfield`, then
the `ScrollView` with its own fill removed.

The tell was that four of the five already had a `Starfield` — on their
*loading* and *error* states, which are plain `View`s. Stars during the spinner,
none once the screen loaded.

**Three more were covered rather than missing.** `shoot/[id]/index.tsx`,
`shoot/[id]/crew/add.tsx` and `ShootForm.tsx` have a proper `Starfield` root,
but the `ScrollView` inside each carried `className="bg-background"` and painted
straight over it. The root behind them supplies the colour, so the fill is gone
from all three.

40 mounts across 22 files, and a check now confirms **no scroll surface anywhere
paints `bg-background` above a starfield**. Headers, pinned footers and the
bottom bar keep their opaque fill and have no `flex-1` — unchanged, and correct:
the artboards draw them on flat `var(--bg)`.

### The link views were never re-diffed (2026-09-05)

Asked directly whether the crew and client preview screens had been restyled.
**They had not** — `app/s/` received only the `Starfield` mounts. Everything
else reached them second-hand, through the theme and through shared components
(`Avatar`, `ResponsePill`, `Badge`, `Button`, `Card`, `Sheet`, `Toast`). Nobody
had opened `Shoot Link Preview.dc.html` against them.

Two things the theme change had quietly broken, both now fixed against that
artboard:

1. **The viewer's own crew row stopped being highlighted.** It was
   `bg-secondary/40` inside a `Card variant="flat"`, and `--secondary` now
   equals `--card` — 40% of the card's own colour on the card. The artboard
   reads `rowBg: isYou ? 'var(--surface-soft)' : 'transparent'`, a step
   **darker** than the card, which is `--muted` here. On the crew link that row
   is the whole point of the screen.
2. **The confirmation tick was the pale blue button plate.** `bg-primary` where
   the artboard reads `statusIconBg: 'var(--success)'` with `--success-ink` on
   it — the same slip `ResponsePill` had, missed here because the block is
   written inline. Now `bg-success` / `text-success-foreground`.

The answered block also takes the artboard's two surfaces rather than one:
`statusBg: answer === 'yes' ? 'var(--surface)' : 'var(--bg)'` — a confirmation
lifts onto a card, a refusal stays flat on the page.

Confirmed already correct: the «ВИ» badge (`Badge` `solid` = `--accent` with
`--accent-ink`, exactly as drawn), the hero card's `border-strong`, the role tag
on `--border` (which `Badge` `muted` now resolves to), and the pill-shaped
respond button.

**Not examined**, and the reason this is logged rather than closed: the hero's
28px time range, the reference tiles (58×58, radius 8), the organizer block's
two buttons, the calendar and decline sheets, and the reason chips. Nobody has
diffed those.

#### Two open conflicts

- **«Ваша черга» / «Очікує».** The 2026-09-04 handoff's badge table makes it
  amber (`--warn-bg` / `--warn-border` / `--warn`) and `ResponsePill` was
  changed to match. `Shoot Link Preview.dc.html` draws it **outlined** —
  `bg: 'transparent'`, `line: 'var(--border-strong)'`, `fg: 'var(--text-soft)'`.
  The link view is the *only* place a pending chip renders (`showPending` is
  true nowhere else), so the handoff's amber rule currently has no other
  consumer and this artboard is its only witness. One of the two is wrong.
- **The artboard's footer says «Діє до 20 вересня 2026».** `ADR-014` has no
  expiry column, deliberately — validity derives from soft-deleted parents. The
  app does not render the line and must not start.

### The «Команда» accordion's open row (2026-09-05)

`Shoot Detail v3.dc.html`, line 592:

```js
rowBg: this.state.expanded === p.id ? '#0d0d0f' : 'transparent',
```

on a card that is `var(--surface)` (`#121214`). **An open row is DARKER than
the card it sits in**, and the panel inside it is darker again — both its
blocks are `background:var(--bg)` (`#070708`). Three levels descending, which is
this design's idiom everywhere: the calendar row's press, the link view's «ВИ»
row, this.

The app had `bg-secondary/30`, **wrong twice over**: it lifted where the artboard
sinks, and since `--secondary` became equal to `--card` on 2026-09-04 it was 30%
of the card's own colour painted on the card — nothing at all. The header row's
`active:bg-secondary` press was invisible for the same reason.

| Level | Artboard | Was | Now |
| --- | --- | --- | --- |
| Card | `var(--surface)` | `bg-card` | unchanged |
| Row, open | `#0d0d0f` | `bg-secondary/30` (invisible) | `bg-muted` |
| Row, press | `var(--surface-soft)` | `active:bg-secondary` (invisible) | `active:bg-muted` |
| Contacts block | `var(--bg)` | no fill | `bg-background` |
| Profile row | `var(--bg)` | no fill | `bg-background`, press `bg-card` |

`bg-muted` is `#0F0F10` against the artboard's `#0d0d0f` — two parts in 255 per
channel. Not worth a fourteenth token, and `--surface-soft` (the artboard's own
hover for this row) is exactly `#0F0F10`.

#### The pattern, and what is still exposed

This is the **third** instance of one root cause: `--secondary` and `--card` are
now the same value, so any `bg-secondary` on a card surface is invisible. The
first two were `Badge`'s `muted` variant (caught when the theme landed) and the
link view's «ВИ» row.

A sweep counts **71 plain `bg-secondary` fills and 41 `active:bg-secondary`
press states**. Most are on `bg-background` and still read correctly. The ones
that look wrong on inspection, not yet fixed:

- `Visibility.tsx:29,40,72` — the «Бачите лише ви» / «Клієнт не бачить» badges,
  which sit on cards
- `ui/progress.tsx:30` — the confirmation card's progress track
- `shoot/[id]/index.tsx:787,1508` — the reference placeholder and the file-row
  icon squares, both inside cards
- `ReferenceGrid.tsx:176`

None has been verified on screen. A proper pass wants each call site's actual
surface checked, not a global replace.

---

## «Публічний профіль» — the email row is gone (owner, 2026-09-05)

`src/features/contacts/PublicProfile.tsx`, `app/(app)/public-profile.tsx`,
`app/(app)/contact/[id]/index.tsx`.

**Reverses a decision recorded above**, in the 2026-09-04 entry: "No email row
for a contact … The account holder sees their own, where the reader and the
subject are the same person." The `self` preview therefore showed an email row,
with the artboard's «Email та налаштування акаунту приховані від інших»
underneath it.

The owner opened the screen and read those two things as a contradiction, which
they are. The screen's subline promises «Так вас бачать інші учасники зйомок»,
and a preview that adds a field the audience never receives is not a preview of
anything — the "discloses nothing to yourself" argument is true and beside the
point. `PublicProfileView.email` had no reader left afterwards and is deleted
rather than kept as a prop nobody uses; `users.email` is still on `/profile`,
which is a screen about the account rather than about what others see.

The note now does the job the artboard wrote it for: it explains why there is no
email row, which it could not do while sitting under one.

### A second defect, found in the same file

The note was **not gated on the reader** — it rendered under any profile with at
least one contact row. Opening a crew member's «Профіль учасника» explained the
privacy of an email that is not theirs and of account settings they do not have.
It is `self` only now. The other two readers get no note, because no copy exists
for them and none was invented (rule 1).

### Consequence worth knowing

The «Контакти» card is dropped when empty, and the note goes with it. An account
with no phone and no handles now previews as name and role alone — correct, since
that is all a crew member would see, but it means the reassurance about the email
is absent exactly when the card is.

---

## Instagram and Telegram handles open, and read as «@nickname» (owner, 2026-09-05)

New: `src/lib/socialHandle.ts`. Changed: `src/components/PersonSheet.tsx`,
`src/features/contacts/PublicProfile.tsx`, `app/(app)/shoot/[id]/index.tsx`,
`app/s/[token]/index.tsx`, `app/s/[token]/crew/[crewId].tsx`.

**No story covers any of this** — not `US-005`, `US-023`, `US-027` or `US-016`,
all of which put one of these fields on a screen and none of which says what
tapping it does. Owner's request, and it needs a story or an amendment in the
discovery repo.

### What changed

A handle is now a link wherever it is shown read-only, and it displays as
«@nickname» whatever form it was stored in — `@daryna`, `daryna`,
`instagram.com/daryna`, or the `https://www.instagram.com/daryna/?igsh=…` that
Instagram's own «Copy link» produces. Forms are untouched.

`handleUrl` had existed since the person sheet's rows became tappable, but only
inside that component, and it only stripped a leading `@`. It is now
`src/lib/socialHandle.ts` with five callers and a `handleLabel` beside it.

| Decision | |
|---|---|
| **Nothing is normalised on save** | The stored value stays what somebody typed. Parsing at read time covers every row already in the database, which a migration would have had to do anyway, and four tables carry these columns (`users`, `contacts`, `clients`, `crew_members`) |
| **Free text no longer linkifies** | `handleUrl` used to turn anything into a URL, so «Марія з студії» in an Instagram field built `instagram.com/Марія%20з%20студії`. A value that is not a plausible handle now renders inert — the rule `DetailRow` already stated for itself |
| **A post or an invite opens but is not renamed** | `instagram.com/p/CxYz` and `t.me/+AbCdEf` are good links with no nickname in them. Presenting the first segment as «@p» would be confidently wrong |
| **Blue is for handles, not for everything tappable** | See below |

### The colour, and the phone exception

Handles use `text-link` (`--link`, #6FA2FF) — the token the theme names for
links, already the bottom nav's active tab and `Button`'s `link` variant.

**A phone number is tappable and deliberately stays `text-foreground`** (owner,
2026-09-05). It was blue for a few minutes, keyed off "does this row open
something", which is the wrong question: a phone dials, which is the phone doing
its own job, while a handle leads somewhere else. The row models carry an
explicit `linkTone` now so the two questions cannot be conflated again.

This does not weaken the 2026-09-04 ruling that retired `text-link` from the
calendar row's address — blue still never appears on something that opens
nothing. It is simply no longer true that everything openable is blue.

### A bug this uncovered

`OrganizerCard` on the shoot link built its own URL by stripping `@` and
concatenating, so an organizer who had pasted their profile link got
`https://instagram.com/https://instagram.com/daryna`. It uses the shared parser.

### Still open

The form placeholders still say «@nickname». The fields accept a pasted link
now and nothing tells anyone that — new user-facing copy, so not invented here
(rule 1).

---

## An emoji as your profile photo (owner, 2026-09-05)

`Edit Profile.dc.html`'s picker. Migration `20260905120000_profile_avatar_emoji.sql`,
`src/features/auth/avatar.ts`, `EmojiAvatarPicker.tsx`, `useAvatarSheet.tsx`,
`src/components/ui/action-sheet.tsx`, plus `Avatar`, the profile screen, the home
header and «Публічний профіль».

**No story covers it.** `US-016` is *viewing* a profile; the 2026-08-31 editing
pass already put it in debt and this adds to it. `US-016` needs amending.

### It does not reopen F-4

F-4 ruled out emoji avatars picked by **hashing a name** — a hash asserts a skin
tone, gender and age the person never gave. `20260831120000` narrowed that for an
uploaded photo: the account holder supplied it. A chosen emoji is on the same
side of the same line, so crew, clients and contacts still get initials, and the
`PublicProfileView` type now *requires* every caller to say so — the three
contact/client sites pass `avatarEmoji: null` explicitly because the compiler
made them.

Notably the artboard's 48 contain no faces, gestures or skin tones, which reads
as the same instinct.

| Decision | |
|---|---|
| **Three columns, one constraint** | `users_avatar_one_of` allows a photo, or an emoji WITH a tint, or nothing. The picker is one choice with three outcomes, so the database says so rather than trusting every writer |
| **`avatar_tint` stores a key** | `'blue'`, not the gradient. Storing presentation would turn a palette tweak into a data migration |
| **`oklch()` converted to hex** | The artboard's eight gradients are `oklch`, which `global.css` records as silently fatal in NativeWind's CSS-to-RN pass. Three pairs are sRGB-clipped, as `--warn-bg` and `--info-bg` were |
| **Gradients via `react-native-svg`** | Already in the tree. `expo-linear-gradient` would have been a native module and a pod install for one shape — see `chore(build)` two commits earlier for what that costs |
| **Glyph is half the diameter** | §5.8 tabulates 34→17, 38→19, 64→32 and the artboard draws 72→36, 112→58. One rule, no table |

### Two corrections the owner found on device

**`ActionSheetIOS` was wrong, and for a reason worth recording.** It was chosen
on `DestructiveAction`'s argument — the system control is `UIAlertController`
itself, not an approximation. **On iOS 26 that control no longer draws what the
artboard draws**: an action sheet without a source anchor floats mid-screen
instead of sitting on the bottom edge. So `ui/action-sheet.tsx` draws it. The
principle did not change, the platform did. It also collapsed the web/native
fork, since `ActionSheetIOS` does not exist in `react-native-web` at all.

Its blur is approximated: `backdrop-filter` has no React Native equivalent and
`expo-blur` is not a dependency. The fills are the artboard's rgba values
flattened against the dimmed backdrop.

**§5.7 was followed too literally.** «Задай `lineHeight` = розміру шрифту» is
right for initials, whose glyphs fit the em box — an emoji's artwork is drawn
taller than its em square, so a one-em line box crops the top of it. CSS
`line-height:1` does not clip because a CSS line box does not crop its glyphs;
RN's `Text` does. Now 1.2×, with `includeFontPadding:false` so Android still
cannot add leading.

**The grid's column count is derived, not the artboard's fixed six.** Six exact
widths plus five 6pt gaps rounded over the container and the last cell wrapped,
so the owner saw five. Measured and floored now: 6 at 393–402pt as drawn, 7 on a
Pro Max, 5 on an SE rather than squeezing six into 44pt.

### Still open

The set is the artboard's 48, fixed. The owner is discussing extending it with
the client. Nothing technical requires a fixed list — `avatar_emoji` is plain
`text` and renders whatever it holds — so growing it is a one-array change, and
opening it to the system keyboard would need a validation rule and a placeholder
that no artboard supplies.

### The organizer's emoji reaches the link views (owner, 2026-09-05)

`supabase/functions/link-gateway/index.ts`, `src/features/links/gateway.ts`,
`app/s/[token]/index.tsx`. Deferred when the picker was built, then asked for.

`organizer()` sends `avatar_emoji` and `avatar_tint` — two plain strings, and a
picture the photographer chose of themselves for exactly this audience. They
are the pair or nothing, so no reader has to decide what half a pair means.

**`avatar_url` is deliberately absent, and not for privacy.** It is a path in a
private bucket, so sending it means signing a URL — and CLAUDE.md's own warning
is that signed media URLs expire while link tokens never do. An idle link would
show a broken image on a page that is still valid. The link views already carry
that hazard once, for a location video, and answer it by re-requesting the
payload on error; a second instance for an avatar is not worth it. **An
organizer with a photo therefore reads as initials on a link**, unchanged.

The reader guards the tint with `isAvatarTint` rather than trusting it. The link
surface is a static export (`ADR-012`) and can be months older than the app that
wrote the value, so a tint this bundle does not know falls back to initials
instead of drawing a glyph on no background.

Rule 2 re-checked while in that file: the client's crew mapping still has no
`note` key at all, the crew's still does. Only `organizer()` changed, which
carries no notes to either audience.

**Two deploys, not one** (docs/deploy-dev.md): `supabase functions deploy
link-gateway` for the payload, then `npm run export:web` and `wrangler pages
deploy`. Either alone gives a payload nobody reads or a reader with no data.

---

## «Зміна пароля», rebuilt from the artboard (owner, 2026-09-05)

`Edit Profile.dc.html` grew a full password layer where it had drawn only the
«Пароль · Змінити ›» row. `app/(app)/password.tsx`, plus
`src/features/auth/passwordRules.ts` and `PasswordStrength.tsx`.

**No story covers changing a password** — `US-013` is login. Every rule and every
word is the artboard's.

What it replaces: one «Новий пароль» field and a save button.

### The current-password field, and a note that was wrong

The screen carried this: "Supabase's `updateUser` authenticates by the session
alone and offers no way to verify one, so a field collecting it could not check
it — it would be theatre."

The first half is true and the conclusion was not. `updateUser` cannot verify a
password; `signInWithPassword` can, and re-authenticating with the address
already on the session is what that is for. The artboard draws the field and an
error for it, so it is checked. Two costs, recorded in `changePassword`:

- the re-auth issues a **new session** — same user, same device, but anything
  listening to `onAuthStateChange` sees it;
- wrong attempts count against Supabase's **sign-in rate limit**, the one
  `tooManyAttempts` covers, so somebody guessing at their own password can lock
  themselves out for a few minutes. Correct direction for a security control.

`secure_password_change` is off in config.toml. Turning it on would make this
re-auth load-bearing rather than a verification step.

### Needs the owner's answer

| # | What the artboard does | What the app says | Consequence as built |
|---|---|---|---|
| P-6 | «Щонайменше 8 символів» | `MIN_PASSWORD_LENGTH` is 6, and so is `minimum_password_length` in config.toml | **An account can be created with a password this screen refuses to set.** Stricter on the client is the safe direction, but this is the mirror of **A-5**, which deleted `registerPasswordPlaceholder` for "promising 8 characters where the backend takes 6". Either registration rises to 8 — `US-001`, the config and the AuthScreen meter — or this stays a local rule |
| P-7 | A four-bar meter, five steps, a colour each | `AuthScreen` draws three bars, three words, two hues | **Two meters, disagreeing.** The old one was built monochrome and its note records the compromise. Not unified: `Auth.dc.html` has not been re-read against this, and changing what registration calls a strong password is a design decision. `PasswordStrength` is standalone so aligning them is an import |

### Resolved by this artboard

**A-3 is answered rather than overruled.** `confirmPassword` and
`passwordMismatch` were deleted on 2026-08-31 as "a field and a message no story
defined". This artboard defines both — a repeat field with a match tick and
«Паролі не збігаються» — so the keys are back, named for the screen that draws
them.

### Drawn but not built

The artboard's script carries `pwSignOut` state and a track/knob for "sign out
other devices" and **renders no control for it anywhere in the markup** —
leftover from an earlier pass. Building it would mean inventing the row and the
behaviour both, and Supabase's global sign-out ends the current session too.

### One deliberate departure

The strength bonus tests `[^A-Za-zА-Яа-я0-9]`, which counts «ґ» as a symbol
because `а-я` omits ґєії. Corrected here to include them. It moves a label, never
whether a password is accepted, which is why it was fixed rather than asked
about.

«Забули пароль?» sends the real recovery email (`requestPasswordReset`) rather
than the artboard's stub toast.

### P-6 resolved: registration rises to 8 (owner, 2026-09-05)

`MIN_PASSWORD_LENGTH` is 8, and it **moved from `register.ts` to
`passwordRules.ts`** — the pure module, so that registration, recovery and
«Зміна пароля» read one constant. The inversion matters: `register.ts` imports
the Supabase client, and a rules module that dragged a network client behind it
could not be unit-tested the way this one is.

**A-5 is retired, and structurally.** It deleted a placeholder for "promising 8
characters where the backend takes 6"; the three strings that quote the minimum
are templates now (`{n}`, rendered by `withMinLength`), so raising it again is
one edit and no copy can lie about it. `passwordTooShort` and `passwordHint`
became `…Template` in both dictionaries; the compiler found all six call sites.

**Only the LENGTH is aligned.** «Зміна пароля» also demands mixed case, a digit
and difference from the current password; registration still asks for length
alone. So a password can be registered that this screen would refuse to set as a
*replacement* — much narrower than before, but not nothing. Whether registration
should adopt the full rule set is a design question for `Auth.dc.html`, and it
is the same question as **P-7**, which is still open: the two meters still
differ, and `AuthScreen`'s now scores its first bar at 8 rather than 6.

**The server floor needs pushing separately.** `supabase/config.toml` is the
LOCAL stack's config; the linked project keeps its own. `supabase config push`
sends it — but it pushes the whole `[auth]` block, not this line, so anything
set in the dashboard and not mirrored in the file would be overwritten. The
alternative is changing the one setting in the dashboard. Not done here.

---

## The home screen's third absence gets a card (owner, 2026-09-05)

`app/(app)/(tabs)/index.tsx`. **This answers an open question raised on
2026-08-29**, quoted from this file: "`US-035` AC-5 still holds for the third
absence — shoots on the account but none upcoming keeps the section hidden,
label included. `home-screen-2.html` has no state for it either. If it should say
something («Немає запланованих зйомок»?), that is new copy and needs the owner."

It should. The title is that note's own suggestion; the subtitle mirrors the
first-run card's.

|  | Title | Subtitle |
|---|---|---|
| No shoots at all (drawn) | «Ще немає жодної зйомки» | «Створіть першу зйомку — вона зʼявиться тут.» |
| **All in the past (new)** | «Немає запланованих зйомок» | «Створіть нову зйомку — вона зʼявиться тут.» |

One card, one glyph, one word apart. The two states differ only in whether the
reader has history, and a different voice would imply a different kind of
absence. `US-035` AC-5's silence now covers the «Наступні зйомки» section alone —
a heading over nothing would say twice what the card already says.

### Also aligned to `Home.dc.html` in the same pass

- **The bell is gone on an empty account.** The artboard wraps it in
  `sc-if hasNotifications` and sets `hasNotifications: !isEmpty`. There is still
  no notification system, so `hasShoots` stands in for it exactly as the
  artboard's fixture does. It shrinks the screen's one untruth — a brand-new
  account no longer gets an unread dot for messages that cannot exist — but the
  dot still lies the moment a shoot exists. Unchanged, and still the reason to
  build notifications or drop the dot.
- **The glyph is drawn, not lucide.** The artboard builds a 38×34 rounded
  rectangle plus a 1.6px rule 8px down — **no tick marks**, which every lucide
  calendar has. Eight lines, kept local.
- **Padding is 30/20**, and the subtitle **shortened**: «разом із командою,
  локацією та нотатками» is gone from the artboard. The empty state no longer
  says what a shoot holds — it says only that one will appear, which is the
  promise the screen can keep.

### A consequence worth recording

Deleting the hero shoot used to leave that slot blank until the refetch. With a
card there now, blank became a false sentence — «Немає запланованих зйомок»
while more shoots were queued — so the delete handler **promotes the first
upcoming shoot locally** instead. It carries `confirmed: null`, because the crew
count is fetched for the hero alone and is genuinely unknown until the refetch;
the card drops that line rather than showing a count belonging to the shoot just
deleted.

---

## Calendar: two overrides of `Calendar.dc.html` (owner, 2026-09-05)

`app/(app)/(tabs)/shoots.tsx`, `src/components/ShootCalendar.tsx`. Both are
departures from the artboard rather than alignments to it, which is why they are
here.

### «Сьогодні» removed from the header

Added on 2026-08-30 with this reasoning, quoted from that entry: "«Сьогодні» is
new. The calendar could always be walked back to the current month with the
arrows; nothing jumped to it, which on a screen whose whole subject is dates was
a gap the handoff noticed."

That reasoning still describes what is lost. **The arrows are now the only way
back to the current month** — page forward to next March and you walk home. What
keeps that navigable rather than disorienting is the meta line beside the title,
which still names the month you are looking at. Worth reinstating if anyone
reports the walk; removed because the owner asked and the header reads calmer
with the title alone.

### No dot under a selected day

`Calendar.dc.html`'s `cellStyle` reads
`dot: has ? (sel ? 'var(--accent-ink)' : 'var(--info)') : 'transparent'` — the
artboard **keeps** the dot on a selected day and inverts it onto the fill.
`Dot` had an `onFill` state for exactly that; it is gone, and the type is down to
`marked | none`.

The override's reasoning: the dot's job is to say "something happens on this
day". A selected day is already a filled white cell whose shoots the agenda is
listing directly below, so the dot repeated what the fill and the list had both
said — and a dark speck on a bright cell read as a smudge rather than a mark.

**The transparent dot stays** for unmarked days. That is not the same decision:
it is rendered rather than omitted so a cell cannot grow a dot and shift its
number by two pixels, which would make the numbers jump as the eye scans the
grid.

---

## «Оплата» — a shoot's price and what has been paid (owner, 2026-09-05)

`New Shoot.dc.html` and `Shoot Detail v3.dc.html` grew a payment section.
Migration `20260905140000_shoot_payment.sql`, `src/features/shoots/money.ts`,
`ShootForm`, and a card on the shoot's «Деталі» tab.

**No story covers money at all.** Nothing in the PRD's requirement register or
any epic mentions a price. `US-002` (create a shoot) and `US-018` (edit one)
both need amending.

### The owner's four answers, 2026-09-05

| Question | Answer |
|---|---|
| Who may see it? | **Creator only, never in a link** — for crew AND client |
| A shoot with no price? | **Show the card at «0 ₴»**, as the artboard literally does |
| How precise? | **Whole hryvnia.** `integer` columns, no kopecks |
| What is «Передплата»? | **How much has been paid so far**, not a booking deposit |

The last one is what makes «Оплачено» correct when it equals the price, and why
the remainder is «Залишок» rather than anything about a deposit.

### Privacy, and where it is actually enforced

The design says this twice: the detail card sits behind the same viewer gate as
the private notes (`showPrivate: !clientView`), and **`Shoot Link Preview.dc.html`
draws no payment section for either audience** — crew or client.

So the link gateway is **untouched**, and that is the mechanism rather than an
omission: it builds every payload from an explicit column list (`ADR-013`,
CLAUDE.md rule 2), so a new column reaches nobody until somebody names it. The
Edge Function contains no mention of `price` or `prepayment`, checked after the
change.

### Decisions worth keeping

| | |
|---|---|
| **Nullable, not `default 0`** | Null and zero render identically today, but the column keeps them apart — so hiding the card for untouched shoots later is a condition, not a migration |
| **Constraints in the database** | Non-negative, and `prepayment <= price` **only when both are set**, mirroring the artboard's own `price > 0` guard. The form is one writer; a rule that lives only in a screen is one the next writer does not have |
| **Grouping is hand-rolled** | The artboard uses `toLocaleString('uk-UA')`. `home.ts` already writes its own plural rules rather than trust Hermes's partial `Intl`, citing the design system's §9 — same engine, same call |
| **Both separators are U+00A0** | Thousands, and the gap before ₴, so an amount never wraps away from its currency. A test asserting a plain space fails; that is documented in `money.ts` |

### Two departures from the artboards

**No «Залишок після зйомки» row on the form** (owner). The artboard draws one
under the chips whenever a price is set. Removed because the same number is on
the shoot's own screen, where it is the point of the card rather than a footnote
to a form. The arithmetic still runs — it is what blocks the save.

That also settled an inconsistency the artboards carried: the form drew the
outstanding balance plain until zero, the card draws it amber until settled.
With the row gone, only one surface shows it and there is nothing to disagree.

### Consequence worth knowing

**Every shoot that already exists now shows «0 ₴ · Без передплати».** That
follows from taking the artboard literally — it gates the card on the viewer,
not on having a figure — and it is the owner's choice. It is a visible change to
every existing shoot, not only to new ones.

## Optional sections, and a note the client reads (owner, 2026-09-05)

`New Shoot.dc.html` and the edit form inside `Shoot Detail v3.dc.html` changed
together. Three things:

1. «Оплата» and «Нотатки» stopped being permanent parts of the form. They are
   added from dashed `+` pills at its foot and removed by an `×` in their own
   heading.
2. «Нотатки» became **«Нотатки для команди»**, keeping its «Клієнт не бачить»
   badge and taking a new placeholder.
3. A third section appeared: **«Нотатки для клієнта»** — migration
   `20260905160000_shoot_client_notes.sql`, and the first shoot column ever
   added *for* a link audience rather than away from one.

**No story covers any of it.** `US-002`, `US-018` and `US-026` all need
amending — the third most of all, since it is the story that defines what a
client's payload may contain.

### The owner's four answers, 2026-09-05

| Question | Answer |
|---|---|
| Does the CREW see «Нотатки для клієнта»? | **No — client only.** Narrower than the design proves, and the reversible direction |
| What heads the card on the link page? | **«Нотатки від організатора»**, the same heading the crew note carries there |
| `×` clears a section that has content? | **Ask first.** The artboards clear outright |
| The «Оплата» card on an unpriced shoot? | **Still «0 ₴»**, unchanged from earlier that day |

### One rule where the artboards have two

`New Shoot.dc.html` holds three explicit booleans and starts them all false.
The edit form derives openness from whether the field is filled and ORs in an
`optAdded` override, so a shoot that already has a price opens with «Оплата»
showing. **The second subsumes the first**: on a blank create form nothing is
filled, so `filled || added` closes every section by itself. `openSections` in
`ShootForm.tsx` is that one rule, and both screens use it.

It is only correct because `×` **clears** the section as well as hiding it. Were
a value left behind, `filled` would reopen the section the reader had just
closed — and a form that saves a field it does not show is the worse half of
that bargain. So the two halves are one function, `clearSection`, and neither is
callable without the other.

### The one departure from the artboards

**`×` asks before clearing a section that holds something.** Both artboards
clear on the tap. On the create form that costs a sentence someone typed a
moment ago; on the edit form it silently deletes a price or a note that was
already saved, and the next «Зберегти» commits the deletion. An empty section
still goes without a dialog — there is nothing to lose and the prompt would be
noise.

> **The dialog's copy is not from any artboard.** «Прибрати «{section}»? Введене
> буде стерто.» was written here to cover a behaviour chosen after the design
> was drawn. It needs the owner's sign-off; it is not confirmed copy, and it is
> flagged as such in `uk.ts` beside the key.

### Two notes, one prefix apart, opposite audiences

This is the part most likely to break later, so it is written down in four
places — the migration, both SELECT lists, and here:

| Column | Audience | Selected in |
|---|---|---|
| `shoots.notes` | crew only | `crewPayload`, and no other query |
| `shoots.client_notes` | **client only** | `clientPayload`, and no other query |

Every shoot column added since `ADR-013` had been introduced *away* from the
link surface — `notes` (`20260830160000`) and `price`/`prepayment`
(`20260905140000`) were each written so the gateway's explicit column lists
reached them for nobody. This is the first added deliberately **for** an
audience, so rule 2 had to be stated in the direction it is now being used: the
danger is no longer only "a column reaching the client", it is also "the wrong
one of two near-identical columns reaching either".

`tests/acceptance/client-notes-check.mjs` is the guard. Fifteen assertions on
one shoot through two tokens, asserting the contrast rather than an absence —
`us026-check.mjs`'s method, borrowed for the same reason it uses it.

**`us026-check.mjs` needed no change.** Its «no notes LABEL» assertion looked
like it would fail on the new card, but it runs on the crew MEMBER's detail
screen, not on the shoot view, and that screen gained nothing.

### Three smaller decisions

**`notesSection` was not renamed.** It reads «Нотатки» in three places — the
shoot form, `ContactForm` and `PublicProfile` — and only the first became
«Нотатки для команди». The other two are a crew member's *own* note, a different
field with a different audience (`ADR-013`). `teamNotesSection` is a new key.

**The badge came back, and the box went.** «Клієнт не бачить» was a
`VisibilityNote` box under the field from 2026-09-03; the new artboard draws it
as a badge beside the heading again. The box is the better shape for a sentence
and is given up because the heading row now also carries an `×` — a box below
the label, a badge above it and an `×` beside both is three affordances
competing for one small space. `VisibilityNote` keeps its three other callers.

**«Нотатки для клієнта» is headed differently on the link page.** The app names
the audience because the creator is choosing one; on the link the reader *is*
that audience, and a heading telling them so says nothing. It also puts both
link audiences' notes under one name — which is what they are, a note from the
person running the shoot.

### Consequence worth knowing

**The detail screen and the edit form now disagree about an unpriced shoot.**
The card shows «0 ₴ · Без передплати» on every shoot, but opening that same
shoot in the editor shows no «Оплата» section — you tap `+ Оплата` to reach a
figure the previous screen just displayed. Both halves are the owner's choice,
taken a few hours apart. Hiding the card when `price` and `prepayment` are both
null closes the seam whenever that reads badly: one condition, no migration,
which is exactly what the nullable columns were for.

## Creating a shoot lands on the shoot (owner, 2026-09-05)

`ShootForm`'s create path was `router.back()` — the reader returned to whichever
list pushed the form, usually the calendar, since that is where «+» lives. It
now goes to the shoot that was just made.

**`US-002` AC-1 wants amending**, though not urgently: "the new shoot appears in
the shoot list" is still true, and the reader is one «Назад» from seeing it. The
criterion describes a consequence of creating a shoot rather than a
destination, and the old behaviour satisfied its letter by handing back a list
to scan for the thing just created.

**`replace`, not `push`.** The form must not stay on the stack. `push` would
leave «Назад» from the new shoot landing on a filled-in create form for a shoot
that already exists — and saving that again would make a second one. Replacing
swaps the form for the shoot, so «Назад» reaches the list that opened the form,
which is exactly where `back` went before.

No toast. `New Shoot.dc.html` raises «Зйомку створено — …» on save, and the app
has never shown it; the screen now being the created shoot says the same thing
in a way a toast cannot contradict. Left as it was rather than added on the way
past.

## «Матеріали»: files above references, and one fewer button (owner, 2026-09-05)

Two changes to the shoot's «Матеріали» tab, both against the shoot-detail
handoff rather than with it.

**«Файли» now sits above «Референси».** The handoff draws references first. The
file links are the fixed part of the tab — two slots that exist whether or not
anything is in them (`US-024`, `US-025`, and `FileRow` renders the empty one
deliberately) — where the reference grid grows without limit. With the unbounded
collection on top, a pair of one-line rows ended up below a scroll on any shoot
with more than a handful of references.

**The sticky «Додати референс або файл» CTA is removed.** It opened the gallery
picker, which is exactly what the `+` tile at the end of the reference grid
already does — one action with two controls. The button was also misnamed for
what it reached: it could add an image reference and nothing else, where «Файли»
are pasted external links, so "або файл" promised something it never did.

`addReferenceOrFile` keeps one caller, the `+` tile's `accessibilityLabel` —
which is the one place the phrase describes the control accurately, since a
screen reader needs to hear what the tile is for.

Nothing else about adding a reference changed. No acceptance suite names the
button — «Додати референс або файл» appears nowhere under `tests/` — so none of
them drove it. That is checked, not assumed; whether the `US-003` suites still
pass is a separate question, since they have not been run against the current
stack.

## «Редагувати зйомку» and delete, as v3 draws them (owner, 2026-09-05)

The two actions at the foot of the shoot's «Деталі» tab were two stacked
outlined rectangles. `Shoot Detail v3.dc.html` draws one row: «Редагувати
зйомку» as a filled pill taking the remaining width, and a 48pt circle beside it
holding a trash glyph and no words.

**What changes is what each one looks like it does.** Both were outlines of
equal weight — the primary action and the irreversible one, drawn identically
and told apart only by the colour of one label. Editing is now the obvious thing
to tap; destroying is a small target you have to aim at.

### The token trap

The artboard's `--accent` is **not** this app's `--accent`. There it is the pale
blue-white CTA fill; here that is `--primary`, and `--accent` is a raised chip
surface (`#18191A`). The theme handoff states the mapping — "не використовувати
чистий білий для кнопок — тільки `--primary`" — and `Badge` already carries a
warning that the two share nothing but the word. So `--accent` / `--accent-ink`
become `bg-primary` / `text-primary-foreground`.

The delete circle's three tokens cross unchanged: `--danger-bg`,
`--danger-border`, `--danger-soft`. `StatusPill`'s «Завершена» chip already uses
that exact trio.

### One departure

The artboard fills the circle with `--danger` on hover. There is no such token —
`danger` exists only as `soft`/`bg`/`border`, and `--destructive` is the colour
of an *action* that destroys rather than a surface. The press state is
`active:opacity-80`, the app's standard, rather than a colour invented to stand
in for one.

### The delete control has no text now

«Скасувати зйомку» moves to `accessibilityLabel` — the artboard's own
`aria-label`, and the only place the words exist before the confirmation dialog.

That changes how `us019-check.mjs` has to reach it, and the suite is updated to
tap by `aria-label`. **It could not have passed before this change either:** it
waited for «Видалити зйомку» on this screen, which is `deleteShoot` — the
confirm-dialog wording on the two LIST screens. This screen has said «Скасувати
зйомку» since the v3 rebuild. Both the stale string and the new icon-only shape
are fixed together. Not run: the local stack is not up.

## The contact profile borrows the shoot's action row (owner, 2026-09-05)

`PublicProfile`'s «Редагувати контакт» and «Видалити контакт» were two stacked
`rounded-lg` outlined rectangles. They are now the row `Shoot Detail v3.dc.html`
gives the shoot: a filled pill taking the width that is left, and a 48pt circle
holding a trash glyph and no words.

**This departs from `Public Profile.dc.html` deliberately.** That artboard draws
two stacked *pills*, both outlined — edit in `--border` with `--text-soft`,
delete in `--danger-border` with `--danger` — and keeps edit quiet. The owner
was shown both and chose the shoot screen's arrangement (2026-09-05), which
promotes editing to the primary action here too.

So the two screens offering the same pair of actions now offer them in the same
shape, and the older artboard is the one that is out of step. Worth knowing
before someone "fixes" this back against `Public Profile.dc.html`.

The tokens and the one departure are the shoot row's, unchanged: the artboards'
`--accent` is this app's `--primary`, the three `--danger-*` tokens cross as
they are, and the circle's press state is `active:opacity-80` because no
`--danger` fill token exists here.

«Видалити контакт» moves to `accessibilityLabel` — the control has no text now.
No acceptance suite names either control, checked under `tests/`, so nothing
had to change there. `onDelete` without `onEdit` is unreachable: the route sets
`onEdit` whenever there is a subject and `onDelete` only when that subject is
`deletable`, and the pill is `flex-1` so an edit-only profile still fills the
row.

## «Переглянути календар» leaves the home screen (owner, 2026-09-05)

The second of the home screen's two buttons is gone. «+ Нова зйомка» stays.

**`US-035` AC-3 wants amending.** It asks for both — the primary action and a
way through to the list, which used to be this route. The way through has not
depended on this button since the app grew a tab bar: the calendar is a tab,
permanently visible at the bottom of the same screen, so the button spent a row
of the home screen duplicating a control the reader can already see. Removing it
does not make the calendar harder to reach; it stops saying the same thing
twice.

The wrapping `gap-2` View went with it — one child needs no gap, and the parent
column's `gap-3` already spaces the CTA.

`viewCalendar` is deleted from both dictionaries rather than left behind. It had
exactly one caller, and the repo's own convention is to remove a key that has
none (see the note at the top of `uk.ts` about the five removed on 2026-08-31).
`CalendarIcon`'s import goes too. No acceptance suite names the button, checked
under `tests/`.

## Roles get an emoji, in the pickers only (owner, 2026-09-05)

Each of the nine roles gains a glyph — 📸 Фотограф, 🎥 Відеограф, 👠 Стиліст,
🧚‍♂️ Hair стиліст, 💄 Візажист, 💡 Гафер, 💃 Модель, 🌟 Асистент, 🎬 Продюсер —
and «Інша роль», the escape hatch every picker appends, gets 🪄.

### Three decisions, all the owner's, 2026-09-05

| Question | Answer |
|---|---|
| Is «Інша роль» a tenth role? | **No.** The list stays at nine; «Інша роль» is the existing free-text escape hatch and only its chip is decorated |
| «Hair-stylist» or «Hair стиліст»? | **Keep «Hair стиліст».** The string IS the stored value, so renaming would need a migration over `crew_members.role`, `contacts.role` and `users.role` |
| Where does the glyph show? | **Only where a role is picked** — registration, the profile, the contact form, the add-crew form. Every surface that merely reports a role stays plain |

### Display, never storage

`roleWithEmoji()` is called in **label position and nowhere else** — four call
sites, all verifiable with one grep. Every picker keeps comparing and storing
the bare `option`.

That is not a stylistic preference. Storing «📸 Фотограф» would have:

- rewritten every existing row in three tables, or left old rows unmatched;
- pushed emoji into the link gateway's payloads for both audiences, where
  `US-026`'s crew list and the «Ваша роль: Гафер» badge read the raw column;
- broken `ROLES_UK.includes(saved)` at `profile.tsx` and `ContactForm.tsx`,
  which is how each form decides whether to light a chip or fall back to
  «Інша роль» — every legacy role would have been classified as "other";
- and made `role.toLowerCase().includes(term)` in the two contact searches miss
  a role the user can see.

None of those apply, precisely because nothing is written.

### Not translated

Roles stay Ukrainian in the English UI (open question #23), so there is one list
and one map, and `ROLE_EMOJI` is deliberately not a dictionary key: an emoji is
not copy, and `en.ts` would repeat all nine to say nothing different.

`ROLE_EMOJI` is keyed by `Role`, so adding a role without a glyph — or removing
one and leaving the glyph — is a compile error rather than a gap in a chip. An
unknown role (anything typed into «Інша роль», or a legacy value) returns
unchanged rather than gaining a stray leading space.

### Worth knowing

**🧚‍♂️ is a ZWJ sequence** (fairy + ZWJ + male sign + VS16), unlike the other
eight. It renders on iOS, which is what v1 ships; older Android and some web
fonts fall back to two glyphs side by side.

No acceptance suite taps a role chip by its label — checked — so the four
pickers changed without touching a test. The suites that assert on a role
string (`us007`, `us009`, `us015`, `us023`, `us026`) all read *displayed* text
or payload values, which this change does not reach.

## The role glyph reaches the team surfaces too (owner, 2026-09-05)

Extends the entry above, a few hours later. The emoji was pickers-only; it now
also shows wherever a shoot's TEAM is listed:

- the «Команда» tab on the shoot screen;
- the crew list on a link view, for both audiences;
- one crew member's own page on a link view (`US-023`, `US-026`);
- the «Ваша роль: 💡 Гафер» badge a crew member sees at the top of their link;
- the organizer card beside them.

**The organizer is not crew and gets the glyph anyway.** It sits on the same
screen as the crew list, and one card reading «Фотограф» plain beside rows
reading «💄 Візажист» looks like a bug rather than a distinction. `users.role`
comes from the same list. Called out because it is the one inclusion the
instruction did not name.

**Still not everywhere**, and the omissions are deliberate: the contacts
directory, a contact's own profile, and the "shoots I am crew on" rows show the
words alone. Those are address-book and scheduling surfaces, where a role is a
fact about a person rather than a label on a team. One call each if that
changes.

### Nothing about storage changed

`roleWithEmoji()` still only ever runs at render. The gateway payloads carry the
raw column, so what crosses the network is unchanged for both audiences — this
is a rendering change on the receiving side, not a payload change.

### The tests survive, and one was already broken

The suites asserting a role string do it two ways, and only one would have been
at risk:

- `body.includes('Візажист')` — `us009`, `us015`, `us023`, `us026`. A **prefix**
  leaves the substring intact, so these still pass.
- `gw.viewer.role === 'Гафер'`, `clientSubject.role === 'Візажист'` — `us007`,
  `us026`. These read the payload, which this change does not touch.

Separately: `us007-check.mjs:84` asserts the body contains «Ви: Ігор (Гафер)».
Nothing renders that — the badge is `yourRoleTemplate`, «Ваша роль: {role}», and
the older wording survives only in a comment on `gateway.ts`. That assertion was
failing before this change and is **not** fixed here; it belongs with whatever
pass reconciles the stale suites (`us030` has the same problem).

## The role glyph, everywhere (owner, 2026-09-05)

Third and last pass. The emoji went pickers → the shoot's team surfaces →
everywhere, in three steps on one afternoon, each time because the surface left
out looked broken beside the ones that had it.

The remaining four:

- the contacts directory's second line, «💄 Візажист · 3 зйомки»;
- a contact's profile card — which is also the reader's own public profile
  preview, since both render through `PublicProfile`;
- the saved-contact picker on the add-crew screen;
- the «Зйомки, де я в команді» rows.

**The lesson is the pass itself.** Each narrowing sounded principled when it was
made — "a role is decoration while you are choosing it", "address-book surfaces
report a fact rather than label a team" — and each one produced a screen where
the same value was drawn two ways. A decoration on a value belongs to the value,
not to the surface. If a new screen renders a role, it calls `roleWithEmoji`.

The one exception is `t.clientRole` («Клієнт») on the shoot screen: a dictionary
string naming an audience, not a value from `ROLES_UK`. `roleWithEmoji` would
return it unchanged anyway.

### The search still finds a role

`matchesQuery` searches `DirectoryPerson.sub`, which now carries the glyph. An
emoji **prefix** leaves «візажист» a substring, so searching by role works
exactly as before — checked against `crewPerson` directly rather than assumed.
`crew/add.tsx`'s own filter reads the raw `person.role` and never saw a change.

Storage is untouched for the third time: `roleWithEmoji` runs at render, and
`sub` is a formatted display line that nothing reads back.

## Telegram reaches a crew member's card on both link views (owner, 2026-09-05)

A client opening a посилання now sees a crew member's Telegram beside their
Instagram, and so does a crew member. Instagram was already there for both.

Nothing needed building. `crew_members.telegram` has existed since
`20260831140000`, the add-crew form has always collected it, `CREW_COLUMNS`
reads it, and `handleUrl` already knew how to turn a handle into a `t.me` link
for the contact screens. **The gateway simply never selected the column** — which
is what "the SELECT is what decides" means in practice, and the cheapest
possible demonstration of it: a field can sit fully built on both sides of the
network and reach nobody.

### `US-026` AC-1 wants amending

It enumerates name, role, contact and Instagram. Telegram is a fifth, on the
owner's instruction. Recorded rather than slipped in as though the story had
always said five.

**What has not changed is what AC-1 is for.** `note` and `note_image` remain
absent from `clientPayload`'s select and from the object it builds, and
`LinkClientCrewMember` is still written out in full rather than derived from
`LinkCrewMember` — so a field added to the crew type does not arrive on the
client's by inheritance. A contact handle and a private note are different kinds
of fact: the first is how a client reaches somebody working on their own shoot,
the second is what the photographer wrote about that person.

### The guard moved, deliberately

`us026-check.mjs` asserts the client's crew object has *exactly* the expected
keys — the assertion that fails when someone widens the select without meaning
to. It went five → six here, which is the only way it should ever move.

Two other corrections to that suite while in it: the fixture's own comment
promises "one person with EVERY field filled, so an absence in the client's view
is always the rule working and never a missing fixture", and it had not been
given a `telegram` since the column was added. It has one now, and the value is
asserted positively — so the key count cannot be satisfied by a field that
arrives empty. Baseline 22 → 23.

### Noticed, not fixed

The crew detail page labels the Instagram row `uk.crewInstagram`, which reads
«Instagram (необовʼязково)» — a FORM label, "(optional)" and all, on a read-only
page. Telegram uses `telegramLabel` («Telegram») and reads correctly. Left alone
because it is not this change, but it is wrong on both audiences' screens.

## «Сьогодні» on the home card turns green (owner, 2026-09-06)

The hero card gives a shoot happening today three signals: a pulsing dot above
the card, a 3px stripe down its left edge, and the «Сьогодні» chip. The dot has
been `--success` since 2026-09-04; the stripe and the chip were `--accent-solid`
(blue). All three are `--success` now.

Three signals saying one thing in two colours read as two facts. That was
inherited from the handoff, which supplied the tokens that way, and it is the
owner's call to reconcile them.

`Badge` gains a `success` variant for the chip. Its `accent` variant is left in
place with no callers: `--accent-solid` exists in the theme for exactly that
shape, and deleting the variant would strand the token.

### The contrast is worse, and by how much

Measured rather than eyeballed:

| | ratio |
|---|---|
| chip, old — `--accent-solid` fill, `--primary-foreground` ink | **8.17:1** |
| chip, new — `--success` fill, `--success-foreground` ink | **4.20:1** |
| stripe, old — `--accent-solid` on `--card` | 7.91:1 |
| stripe, new — `--success` on `--card` | 4.27:1 |

The blue chip was a *light* fill with near-black ink; green inverts that to a
dark fill with near-white ink, and `--success` (`#098B47`) is the only green in
the theme. 4.20:1 clears AA for large text (3:1) but not for normal text
(4.5:1), and the chip's label is 11px — neither 18pt nor 14pt bold — so it is
**just under AA**.

The stripe is decoration carrying no information the chip does not, so its ratio
is not held to a text threshold.

Left as built rather than "fixed" by inventing a lighter green: there is no such
token, adding one is a theme decision, and the gap is small enough that it is
the owner's to weigh. Raised here so it is a choice on the record and not an
oversight.

**Answered the same day** — see the entry below. The owner asked for the chip to
take `StatusPill`'s tinted shape, which needed the green scale this entry said
was missing, and took the ratio from 4.20:1 to 6.87:1 as a side effect.

## The home card is green whatever the date, and its chip is a tinted one (owner, 2026-09-06)

Two changes, hours after the one above.

**The green stopped being conditional.** The 3px stripe and the countdown chip
were green for a shoot today and grey/outlined otherwise; both are green now.
The card holds exactly one shoot — the nearest — and the chip already says
«Сьогодні» or «за 5 днів» in words. A stripe that changed colour was restating
what the label states.

What still marks today, all of it above or around the card rather than in it:
the pulsing dot, the word «Сьогодні» in place of «Найближча зйомка», and a
stronger border. `isToday` now drives only that border, and the comment which
called it "the least of three" says "the only one" instead.

**The chip took `StatusPill`'s shape.** The owner asked for it to look like the
status chips on the shoots under the CTA — a soft tint with a matching border
and coloured text, not a solid fill.

### The green tinted scale, derived rather than picked

`--info-*`, `--warn-*` and `--danger-*` were the only tinted scales; green had
only its solid pair. The three new tokens take **`--info-*`'s exact lightness
and chroma at the success hue (152)**, which makes the green chip structurally
the same object as the blue «Запланована» one — which is what "the same as those
chips, but green" means:

| | oklch | hex |
|---|---|---|
| `--success-soft` (text) | 0.720 0.150 152 | `#4DBF74` |
| `--success-bg` (surface) | 0.245 0.050 152 | `#0A2714` |
| `--success-border` | 0.560 0.130 152 | `#26894C` |

**One departure, forced.** `--info-bg` carries chroma 0.075, and green at
L 0.245 has no such chroma inside sRGB — it clips. 0.050 is what fits, and it is
what `--warn-bg` (0.055) and `--danger-bg` (0.048) already use at that
lightness, so the family agrees anyway.

Measured: text on tint **6.87:1**, against info 6.44, danger 8.91, warn 9.95.
That also settles the AA question the previous entry left open — the solid fill
was 4.20:1.

### What was not done

`StatusPill` stays a separate component. It maps a `ShootStatus`; this chip
marks how near a date is, and `Badge` is where proximity has lived since the
`accent` variant. They now look alike because they are the same shape, not
because one calls the other.

There is only one chip on the hero card. The shoot's status renders as text in
the line under the client's name, not as a pill, and was left that way — it was
not part of the ask.

## A URL in «Адреса» or «Деталі» is tappable (owner, 2026-09-06)

Both location fields are prose a creator types, and they routinely hold a link —
a maps pin, a floor plan, a studio's page. They rendered as text. Now any URL
inside them is tappable, on the creator's «Деталі» tab and on both link views.

`src/lib/linkify.ts` splits the text; `LinkifiedText` renders it. Four call
sites, two per surface.

### Inline, not whole-field

"Check if it is a link" also reads as "is this whole field a URL", which is less
code. It is not what the fields hold: «Паркування у дворі, мапа: https://…» is
the ordinary case and a whole-field test finds nothing in it. Splitting covers
both — a field that IS a link comes back as a single segment.

### `http(s)` only, scheme required

The rule the app already applies to every link a creator gives it —
`isValidReferenceLink` (`US-003` AC-2) and `normaliseFilesLink`
(`US-024`/`US-025`). A third answer here would make the same text a link on one
screen and not on another.

So «maps.google.com/…» without a scheme stays plain text, deliberately: guessing
at bare hostnames puts «вул. Хрещатик, 1» and «буд. 3, кв. 12» in scope, and a
wrong guess on an address is worse than an untappable one. The reader can still
read plain text; a link to nowhere claims to work and does not.

### A nested `Text`, not a `Pressable`

The link sits inside a sentence, so it must be part of the same text run — a
`Pressable` is a view, and wrapping one around a word takes that word out of the
paragraph's line-breaking and drops it onto its own line.

`Field` on the crew page keeps its `Pressable`: there the whole value is one
handle and nothing wraps around it. Two shapes because there are two situations.

### The splitter is lossless

Joining every segment's text reproduces the input exactly, so a renderer cannot
drop a character of somebody's address. Verified against ten cases including
trailing punctuation («…/abc.»), a URL inside brackets («(див. …/y)»), a URL
that legitimately ends in one (`…/Foo_(bar)`), two links in one line, guillemets,
and a bare hostname.

### Not covered by a test

No fixture puts a URL in either column, so every existing assertion renders
through the unchanged single-`Text` path and none of them moved. That also means
the new behaviour has no acceptance coverage on either surface, and the tap
itself has never been exercised in a real browser on the static export — the
same is true of the Instagram row on a crew member's page, which has shipped
this way since 2026-09-05.

## The «Деталі» tab: a named client section, and two glyphs (owner, 2026-09-06)

Four changes to the shoot's «Деталі» tab.

**The card names its section.** «Локація» and «Оплата» both announce themselves;
the client card held the shoot's title with no label at all, which made it the
one block on the tab a reader had to infer. It gets «Клієнт», the same
`SectionLabel` the other two use.

**The status moved to the right.** It led the card from the left, which gave
«Запланована» more weight than the client whose shoot it is. The label leads
now and the state trails — the arrangement the payment card already uses for its
own badge. The countdown moved with it rather than staying by the label: «за 3
дні · Запланована» is one fact between them.

**The client gets an avatar**, the app's own component at size 40 — what the
«Команда» rows use, since the closest analogue is a person's name in a row and
this is the same object one size of type larger. It shows initials without being
asked: a client is an `ADR-018` row with no photo and no emoji, and `Avatar`
falls back on its own.

**📍 on «Локація», 💵 on «Оплата».** `SectionLabel` takes an optional `emoji`
prop rather than callers building the string, so the single space between glyph
and word is decided once. Not a dictionary key, for the reason `ROLE_EMOJI` is
not one: a glyph is not copy, and `en.ts` would repeat it to say nothing
different.

### Scope, and what it leaves uneven

The two glyphs are on **this tab only**, which is what was asked. The same
labels appear without them on the shoot form (`ShootLocationFields`, and
«Оплата» on the create/edit form) and on both link views. `emoji` is one prop
away at each of those if the glyphs should follow — the role emoji took three
passes to reach everywhere for want of asking, and this is the same shape of
decision.

### No test moved

`us020-check.mjs` finds the status pill by exact text, not position, so moving
it right changes nothing. `SectionLabel` renders uppercase, so the new «КЛІЄНТ»
does not collide with `us009`'s assertions about clients literally named
«Клієнт А» and «Клієнт Б».

## The «Оплата» card loses its badge (owner, 2026-09-06)

«Оплачено» / «Часткова оплата» / «Без передплати» sat beside the card's heading
and is removed.

It named a state the two figures under it already state. «Передплата» and
«Залишок» are exactly what the chip summarised, and the remainder is already
coloured — green when settled, amber while anything is outstanding — so the card
said one thing three ways.

`payment()` is untouched and `pay.badge` is still read: it decides the colour of
«Залишок». Only the chip is gone, and none of the arithmetic depended on it.

`paymentPaid` and `paymentPartial` had exactly one caller between them and are
deleted from both dictionaries, the treatment `uk.ts`'s header records for the
five removed on 2026-08-31. `prepaymentNone` stays — the create/edit form still
uses «Без передплати» on its 0% prepayment chip, which is a different control
saying a different thing.

### A stale claim, corrected on the way past

The removed code carried a comment calling the chip "the only place in the app
that uses `--warn-*` as a fill". That was untrue when written and untrue now:
`ResponsePill`'s «Очікує» and the calendar's tight-turnaround chip both fill
with it. Corrected rather than carried over into the replacement comment.

## The shoot's countdown counts in days (owner, 2026-09-06)

«Початок через 311 год 51 хв» is arithmetic left to the reader. The countdown on
the «Деталі» tab now shifts unit with the distance:

| span | reads |
|---|---|
| under an hour | «51 хв» |
| under a day | «2 год 30 хв» |
| a day or more | «12 днів 23 год» |

The shape is unchanged — a large unit and the next one down — and only which two
moves. Minutes are dropped once days appear: at that range they are noise, and
three units would give «12 днів 23 год 51 хв» for a figure the reader wanted
rounded in the first place.

**It also fixes a zero the old version could not drop.** The countdown was an
inline template that always appended `startsIn % 60`, so a shoot exactly two
hours away read «2 год 0 хв». Nothing chose that; it fell out of the template.

Ukrainian plurals go through `pluralUk` and `dayForms`, the same pair
`distanceLabel` uses — «1 день», «2 дні», «12 днів», «21 день», «31 день», all
checked.

`countdownLabel` lives in `home.ts` rather than `date.ts` because it needs
`pluralUk`, which is in `home.ts`. `date.ts` imports nothing at all and this
file imports it; reversing that to move one function would make a cycle out of a
tidy edge.

No acceptance suite asserts on the countdown.

## «Клієнт не бачить» comes off the form and the link view (owner, 2026-09-06)

The badge is removed from the shoot form — create and edit share one component —
and from the crew link view's «Нотатки від організатора».

It was a `VisibilityNote` box from 2026-09-03, a badge beside the heading when
the newer artboard drew one, and now neither. On the form the section is called
«Нотатки для команди» and sits one field above «Нотатки для клієнта»: between
those two names, a third element naming the audience was restating the heading.

**The guarantee never lived in the label.** The gateway builds each payload from
an explicit column list, and `shoots.notes` is selected for `crewPayload` and
never for `clientPayload` (`ADR-013`, rule 2). What went is a claim about the
rule, not the rule.

**What it costs on the link view**, which is the one surface where the badge
addressed somebody other than the note's author: a crew member reading the
organizer's note is no longer told the client cannot see the same text. The note
still never reaches a client.

`OptionalSectionHeader`'s `badge` prop had no callers left and is deleted with
it, along with the now-unused `Badge` import in that file. Four lines to put
back if the marker returns a third time.

### And then the third, an hour later

The «Нотатки для команди» card on the «Деталі» tab kept its badge in the first
pass — it was not among the three surfaces named, and it is the one place the
marker was neither on a form nor on a link. The owner asked for it too, so
**«Клієнт не бачить» now appears nowhere in the app.**

`clientCannotSee` is deleted from both dictionaries and `Badge`'s import from
the shoot screen with it, the same treatment `paymentPaid` and `paymentPartial`
got the same day. The string has been a box, a badge, and gone in the space of
four days; one line puts it back.

`client-notes-check.mjs`'s «no badge on a card the client is reading» assertion
still passes, and is now **vacuous** — the phrase exists nowhere, so it cannot
fail. Left in place rather than churning the suite's baseline a second time in
one day, but it is no longer evidence of anything and should go with the next
pass over those tests.

## A crew member's page was unreachable, and had been since 4a8d8bf (2026-09-06)

The owner asked for a crew member's Instagram to be visible on the link views,
for both audiences. It already was — on `/s/[token]/crew/[crewId]`, a page
nothing linked to.

`4a8d8bf` ("rebuild every screen against the Claude Design handoffs") replaced
the crew row's `Link` with a plain `View`. The route kept working, the page kept
rendering, and no path through the app reached it. `git log -S` puts the last
`Link href={.../crew/...}` in that commit's parent; it was built by `US-023`
(`50f8893`) and extended to the client by `US-026` (`ff716cb`).

**What was invisible as a result** — for a crew member AND a client:

| field | where it lives |
|---|---|
| contact (phone or email) | crew member's page only |
| Instagram | crew member's page only |
| Telegram | crew member's page only |
| note + note image (crew audience) | crew member's page only |

The list row shows an avatar, the name and the role, and nothing else. So every
contact detail on both link surfaces has been unreachable for two weeks, while
the payloads carried all of it correctly — which is why no amount of reading the
gateway would have found this.

The row is a `Link` again, wrapping a `Pressable` with `role="link"` and the
member's name as its accessibility label.

### Two suites have been failing on this, silently

`us026-check.mjs` taps `a[role=link]` containing the crew member's name and
asserts the path reaches `/crew/` — there has been no such anchor.
`us023-check.mjs` reaches the same page. Neither could have passed since
`4a8d8bf`, and neither run recently: the local stack is twelve migrations behind
with its edge runtime stopped, which is how a fortnight went by.

### The same commit did it twice — reported, not fixed

`4a8d8bf` also dropped `Link href={/s/${token}/references}`, so the
all-references page is unreachable by the same mechanism. `us021-check.mjs:64`
asserts «AC-1 the link opens the all-references page», so `US-021` AC-1 is
broken too.

**Left alone deliberately.** `LinkReferenceGrid` now renders every reference
inline with tap-to-open, so a separate "all references" page may have been
dropped on purpose rather than lost — that is a design question, and the crew
page's case (nothing else shows a contact) does not apply to it. Needs the
owner.

## The crew list shows each member's Instagram (owner, 2026-09-06)

The crew row on both link views read «💄 Візажист»; it now reads «💄 Візажист ·
@oksana». Same row, same line, one more fact — the member's own page is
unchanged.

**Not tappable in the row.** The row is a `Link` to that person's page (restored
earlier today), and a second target inside it would make one tap mean two things
depending on where a thumb landed. The handle opens Instagram on the page it
leads to, where it is a row of its own.

A member with no handle gets the role alone: `handleLabel` returns an empty
string for null and `filter(Boolean)` drops it, so no row reads «Візажист · ».
Checked against a bare handle, an `@`-prefixed one, a full profile URL, null and
an empty string — all five render correctly, and the first three normalise to
«@oksana» through the same helper the contact screens use.

### The option not taken

The owner was offered the alternative reading — keep Instagram as the *only*
contact row on a crew member's page, dropping «Телефон або email» and
«Telegram» — and chose this instead. Nothing is removed, and `US-026` AC-1's
enumeration of contact and Instagram stands unamended. Worth recording, because
that alternative would have contradicted the story rather than extended it.

### Left alone

The creator's own «Команда» tab still shows name and role without a handle. It
is not a link audience and was not in the ask; one call to `handleLabel` if it
should match.

## A crew member's Instagram takes the client's row (owner, 2026-09-06)

On a crew member's page in a посилання, Instagram was a stacked `Field` — label
above, value below — while the client's on the shoot link was a row: glyph,
label, handle on the right, the whole row tappable. Two shapes for the same kind
of fact. The crew member's is now the row.

`ClientHandleRow` is extracted from `app/s/[token]/index.tsx` as
`src/components/HandleRow.tsx` and both surfaces call it. The icon is a prop now
rather than hardcoded, so Telegram could take the same row whenever anyone wants
it to.

**It is absent when there is no handle**, where `Field` renders «—». That is the
other half of matching the client's row: a crew member without Instagram should
have no Instagram row, not an empty one.

`-mx-3.5 px-3.5` on the crew page because the card there is `variant="block"`
(`p-3.5`) where the client's is `p-0` — the negative margin lets the rule reach
both edges while the padding puts the glyph back in line with the labels above.
The padding is the caller's to pass for exactly that reason.

### A form label that had been on a read-only page all along

The row was labelled `crewInstagram` — «Instagram (необовʼязково)», "(optional)"
and all — on a page where nothing is optional because nothing is being entered.
It reads «Instagram» now, the client's own key.

That key turns out to have had **no other caller**: the add-crew form labels its
input `crewInstagramLabel` («Інстаграм») and its placeholder
`crewInstagramPlaceholder`. So «Instagram (необовʼязково)» existed solely to be
wrong on this one screen, for both audiences, since the screen was built. Pruned
from both dictionaries.

### Checked rather than assumed

`us026-check.mjs` asserts the client's crew page contains **zero `<img>`
elements** — the guard that a client never receives the note image. Adding an
icon there could have broken it; `InstagramIcon` is `react-native-svg`, which
renders `<svg>`, so the assertion is untouched. Its `@oksana` assertion still
passes: the handle moved rows, it did not go away.

## The crew list draws a handle the way the client's card does (owner, 2026-09-06)

The Instagram handle was appended to the crew row's role line — «💄 Візажист ·
@oksana» — for a few hours this afternoon. It is now a `HandleRow` beneath the
person, which is what the client's card has always had.

The owner's reason is the right one: a crew member and the client are the same
kind of thing on this screen — an avatar, a name, a role, a handle — and drawing
one as «Роль · @nick» and the other as a labelled row with a glyph made them
look like different objects.

So each member is now a person row plus their handle row, and the two cards are
built from the same two pieces.

**The handle is tappable again.** When it sat on the role line it could not be:
the person row is a `Link` to their page, and a second target inside it would
have made one tap mean two things depending on where a thumb landed. As its own
row it opens Instagram, and the row above still opens the page. Two targets,
because there are two rows — which is the argument the previous shape could not
make.

Absent when there is no handle, as on the client's card.

**The «ВИ» tint moved to the wrapper.** It was on the person row, so the
reader's own block would have been tinted down to a rule and pale below it.

`className` on `HandleRow` earns its keep here: the crew list's card is `p-0`
like the client's, so both pass `px-4`, while the crew member's own page passes
`-mx-3.5 px-3.5` for its padded card. One component, three call sites, three
different surrounds.

## The crew list becomes a card each (owner, 2026-09-06)

One card with hairlines between members became a card per member, 8px apart —
the arrangement `Home.dc.html` gives «Наступні зйомки», and now the same
reasoning applies here.

**A hairline could no longer do both jobs.** A member is two rows since this
afternoon — the person, and their Instagram beneath — so a rule had to mean
"this handle belongs to the name above it" in one place and "a different person
starts here" in another. It cannot be both. The boundary between people is space
now; the boundary inside a person stays a rule.

The per-member `index > 0 ? 'border-t'` goes with it, and `index` is no longer
destructured. `overflow-hidden` on each card so the press state and the handle
row's rule stop at the rounded corner rather than squaring it off — the pairing
the home screen's shoot card already uses for its stripe.

The «ВИ» tint is on the card, so the reader's own member is tinted whole.

## The shoot's tab actions get pinned (owner, 2026-09-06)

«Деталі» and «Команда» each had their action inside the scroll. Both are pinned
to the bottom of the screen now, where «+ Нова зйомка» sits on the calendar.

**Why it matters more here than on a list.** The «Деталі» tab's two buttons sat
below however much location, payment and notes a particular shoot carried — so
"edit this shoot" was a different distance down the page on every shoot, and on
a full one it was past everything. Pinned, it is the same place every time.

`DetailsActions` is lifted out of `DetailsTab` as its own component, because a
sticky footer has to be a sibling of the scroll view rather than a child of it.
`DetailsTab` lost `onEdit` and `onCancelShoot` in the move; the screen already
held both handlers.

**«+ Додати учасника» is now the calendar's CTA.** It was a centred
`muted-foreground` row closing the crew card — which read as another crew member
until the eye reached the «+» — and it is the only action on that tab, so it
takes the shape this app gives one action per screen. `PeopleTab` lost its
`shoot` prop with it: the row's `href` was the only thing there that used it.

A plain `Button` with `router.push`, not `Link asChild`, for two reasons: the
calendar's «+ Нова зйомка» is a plain `Button` and this is meant to be the same
control, and it keeps the rendered element a button rather than whatever
`asChild` resolves to on the web export.

### Two things the old code had wrong

**`insets.bottom` is added here** where the calendar's footer deliberately omits
it. That screen lives in `(tabs)`, where the bar owns the safe area; this one
does not, so its own bottom edge runs into the home indicator.

**The scroll's `paddingBottom` said one thing and did another.** Its comment
read "room for the sticky CTA on the tabs that have one" while applying 96pt to
all three — correct while «Матеріали» had a CTA of its own, and left behind when
that was removed earlier today. It is now 96 on the two tabs with a footer and
24 on «Матеріали», which has none: adding a reference is the `+` tile in its
grid, and its file links are edited in place.

### `us005-check.mjs` should start passing again

It asserts the crew tab holds `'+ Додати учасника'` and taps an element whose
`innerText` equals exactly that. The old row rendered a `Plus` **icon** beside
the bare label, so the string «+ Додати учасника» never existed in the DOM —
that suite has been failing on it, and the new CTA renders the literal text.
Unverified: the local stack is still down. That makes four suites found stale
today (`us007`, `us018`, `us030`, `us005`), on top of the two the crew-link
regression broke.

## An expanded crew row keeps only its actions (owner, 2026-09-06)

The «Команда» tab's expanded row held «Телефон», «Email», «Instagram» and
«Telegram» in a sub-card above its buttons. It now holds three things, and all
three are actions: «Профіль учасника», «Запрошення на зйомку», «Видалити».

**The contacts had two homes and this was the worse one.** «Профіль учасника» —
one tap below them — is the person's own screen, showing the same four fields
with room for them. Here they were a nested card inside an expanded row inside a
card, three surfaces deep, and every one of them was something to read rather
than something to do.

«Запрошення на зйомку» takes `text-foreground`. That row was deliberately left
muted this morning when the client's equivalent went white, on the grounds that
it repeats down a list — but only one row is ever expanded, so it does not
repeat, and the earlier reasoning does not survive the row being open. The glyph
stays muted; the ask was the label, both times.

`handleLabel` and `handleUrl` keep their callers — the client's rows on «Деталі»
still show contacts inline, and rightly: a shoot has one client, so nothing is
nested and there is no second screen to send them to.

### `US-005` AC-1 wants amending

Its acceptance test asserted «the expanded row shows the contact» against the
phone number. That is now false by design — the contact is a tap away on the
profile.

The assertion is rewritten rather than deleted, and deliberately not weakened to
"the row still says something": it now checks that the row offers «Профіль
учасника» **and** that the phone is absent from the row itself. A stale copy
left behind is exactly the failure the original was catching, and it still would.

### The baseline was already wrong

`us005-check.mjs` had **14** `ok()` calls against a `run-all.sh` baseline of
**16**, with none of them in a loop — so that suite has been reporting
off-baseline before anything today touched it. It is set to 15 to match the file
after this change, which is an arithmetic correction rather than a verified one:
the local stack is still down, and only a real run can confirm it.

That is the fifth stale suite found today, after `us005`'s own «+ Додати
учасника» assertion, `us007`, `us018` and `us030`.

## Adding a reference asks which kind (owner, 2026-09-06)

The grid's «+» opened the gallery straight away, so a reference could only be an
image. It now opens the artboard's action sheet — «Зображення» or «Посилання» —
and the second reveals an inline «Нове посилання» card with a field, «Додати»
and «Скасувати».

**This is a regression repaired as much as a feature.** `US-003` has always been
"attach a reference by link OR gallery image". `4a8d8bf` ("rebuild every screen
against the Claude Design handoffs") took the link form off this screen, and
`addLinkReference` has sat fully built, validated and **uncalled** ever since —
so AC-1 and AC-2 have been unreachable for a fortnight. Link references still
*rendered*, which is why nobody noticed: the tiles you could see were seeded
directly into the database.

That makes three things this commit dropped silently, after the crew member's
page and the all-references page.

### Links stay tiles

The artboard also moves links out of the grid into a list card beneath it — a
row each, with the domain, a copy button and a remove ✕. **Not built** (owner):
links keep the square tiles they have, in the same grid as the images, on the
creator's screen and both link views alike. So `ReferenceGrid` and
`LinkReferenceGrid` are untouched and the three surfaces still render references
identically, which is the property `US-021`'s page was built to preserve.

### Details

### The sheet's rows carry glyphs

The artboard draws an 18px icon on each row — a picture for «Зображення», a
chain for «Посилання» — centred beside the label with a 9px gap. `ActionSheetItem`
gains an optional `icon`, and the avatar sheet that shares this component passes
none, so a row still centres correctly without one.

The glyph takes the row's own colour rather than a muted tone: it is part of the
label, not a decoration beside it, and a grey icon next to blue text reads as
disabled. iOS's own sheets put icons on the trailing edge; the artboard centres
them, and the artboard is what is built.

### The link is typed into iOS's own prompt

`Alert.prompt` where the platform has one; the in-app card everywhere else. The
owner asked for the native popup, and the fallback is not optional: `Alert.prompt`
exists on **iOS alone** — react-native-web has no such method, and Android's
`Alert` has no text field. Without it, adding a link would do nothing in a
browser, which is also where every acceptance suite drives this screen.

That is the split `useDestructiveConfirm` already makes, for the same reason:
the platform's own dialog when it has one, something built when it does not.

`'url'` as the keyboard type, so iOS offers «.com» and turns autocorrect off.

**The rejection message stays under the grid** rather than reopening as a second
alert. `US-003` AC-2 asks for a message and `handle` already writes one; a modal
that reappears to complain is a worse way to read it than a line that stays put
while the reader taps «+» again. The consequence worth knowing: on iOS a
rejected link is gone from the prompt, where the web card keeps it for editing.
Native prompts have no "stay open and show an error" state, so the two paths
differ there and cannot be made to agree.

The sheet's title names the active filter chip, because that chip is also the
destination — whichever group is filtered to is the one the reference is filed
under, for a link exactly as for an image. «Всі» has no group to name, so the
title drops the clause rather than printing «Всі» as though it were one.

The web card stays open when a link is rejected, holding what was typed: AC-2
asks for the link to be refused, and a card that closed would make the reader
paste it again to fix a typo. Validation is `addLinkReference`'s own, so "the
list is unchanged" is true of the database rather than of the screen.

### `us003-ui.mjs` and a dead key

The suite typed into an always-present field with the placeholder «Посилання на
референс (напр. Pinterest)». It now opens the sheet first and uses the
artboard's «pinterest.com/…». `refPlaceholder` had no caller left — orphaned by
the same commit — and is pruned from both dictionaries.

Its assertion count is unchanged at 7, so `run-all.sh` needs no edit. It has not
been run: the local stack is still twelve migrations behind with its edge
runtime stopped.

## The link tile shows a chain above its host (owner, 2026-09-06)

A link reference is the one tile in the grid with nothing to show. It read as
bottom-left text — where a caption sits under a picture, except there is no
picture. It now centres a link glyph with the host beneath it, on the creator's
grid and both link views.

The glyph does most of the work at small sizes: three tiles to a row on the
creator's screen and 58px on a посилання, where a host is often too long to read
but «this is a link» has to land immediately. The host drops from three lines to
two, since the icon takes the room the third had.

Both in `--muted-foreground` with a small gap, so the pair reads as one object
rather than an icon with a label stuck under it.

The artboard draws a generic 15px outlined square here, its corner radius
varying by kind — a shape standing in for whatever the tile is. A chain says the
same thing without needing the reader to learn the convention, and `lucide`'s
`link` is already what every other link on these screens uses.

## Many images at once (owner, 2026-09-06)

«Зображення» took `assets[0]` and dropped the rest, so a moodboard of twelve was
twelve trips through the picker. `allowsMultipleSelection` is the whole of the
change on the picker's side; the rest is what to do with more than one result.

**One at a time, deliberately.** `addImageReference` uploads to Storage and then
inserts, and each is awaited before the next starts. `Promise.all` would be
faster and wrong twice: the list is ordered by `created_at`, so parallel inserts
would land the selection in an arbitrary order, and a dozen simultaneous uploads
on a phone's connection is how one fails for reasons nothing here can report
usefully. Each success is handed up as it lands, so the grid fills in as the
upload runs.

### Two things left for the owner

**Reporting a partial failure.** The successes are kept — `US-003` AC-2's "the
list is unchanged" is about a rejected reference, not the ones beside it — and
the FIRST failure's existing message is shown. Saying «3 з 12 не додалися» needs
copy nobody has written, and showing the *last* message instead would let a
later success blank the error entirely. So one message, understating a multiple
failure. It wants a count template and the owner's words.

**No selection limit.** `selectionLimit` is left unset, because no story gives a
number and picking one would be inventing a rule. A reader who selects fifty
waits for fifty uploads with only the disabled «+» tile to say so — there is no
progress indication, and that is the more likely thing to want fixing first.

No acceptance suite drives the picker: they all seed Storage directly, so
nothing here is covered either way.

## The profile tab opens as the public profile (owner, 2026-09-06)

It opened straight into the edit form, with «Переглянути публічний профіль»
pushing a separate route to show what others see. That is backwards for the
screen a reader opens to check themselves: the common visit is a look, and the
form was the price of it.

The tab now renders `PublicProfile` — the same component a contact's page uses —
and «Редагувати профіль» switches to the form. Saving returns to it, which is
the fastest way to see that a change took; «Скасувати» does too, and the
discard sheet with it.

`app/(app)/public-profile.tsx` is **deleted**, along with its `Stack.Screen`
registration and the button that was its only way in. This view is that screen
now, so keeping the route would have left a second copy reachable only by URL —
the shape of the crew-page bug found this morning, planted deliberately.
`viewPublicProfile` is pruned from both dictionaries; `Eye`'s import went with
its button.

### Two changes to `PublicProfile`

`backLabel` takes null, which draws no back control. A tab root has nothing to
pop, and the existing fallback would have replaced the route with itself — a
control that looks like one and is not. The 88px spacer stays so the title is
still centred on the screen.

The edit pill reads «Редагувати профіль» on your own and «Редагувати контакт» on
somebody else's, keyed off the `kind` the type already carries.

### The view is built from `draft`, not `saved`

So the public view reflects what is in the form, and `leave`/`save` keep the two
in step — `leave` restores `saved` into `draft` on the way out, `save` writes it.
`email` stays absent for the reason it always was: this is what others see, and
they never receive it.

### `us014-check.mjs` moved, and `us015-check.mjs` was already broken

**Changed:** `us014` asserted the profile screen contains «Профіль». The title is
«Публічний профіль» now, whose second word is lowercase, so the substring is
gone. Repointed at the new title. Count unchanged at 16.

**Not changed, and not caused here:** `us015` looks for the language switcher
immediately after login, on the shoot list — but `LanguageSwitcher` has only
ever been rendered on the profile screen, so that assertion has been failing
independently of anything today. This change does move the switcher one tap
deeper (it is inside the edit form), so whoever repairs that suite now has to
navigate to the tab and tap «Редагувати профіль» first. Seventh stale suite.

### Worth the owner's eye

The form holds more than a profile: «Підписка», «Акаунт», the language switcher,
notifications, «Вийти» and «Видалити акаунт». All of that is now behind a button
labelled «Редагувати профіль», which is not what "edit" suggests. Settings that
are hard to find are a different complaint from a form that opens too eagerly,
and this trades one for the other. Splitting them — a public view with a
«Налаштування» route beside «Редагувати профіль» — is the obvious next move if
it reads badly on a device.

## The home screen kept showing a shoot that had already ended (owner, 2026-09-06)

A shoot at 11:00 was still «Найближча зйомка» at 16:50. `nextShoot` and
`upcomingShoots` both selected on the DATE — "today or later" — so a shoot that
finished at noon led the home screen until midnight.

**The reasoning behind the date rule was right; the rule was too coarse.** Its
comment said a 09:00 shoot is still the answer at 10:00, because it is what the
photographer is in the middle of and the card should not vanish mid-shoot. True,
and "today" lasts eight hours longer than that argument does.

`statusOf` already draws the line in exactly the right place, so both functions
delegate to it: a shoot counts while it is **not finished**. That also removes an
incoherence nobody had reported — the hero card could show a shoot whose own
`StatusPill` read «Завершена».

| | before | after |
|---|---|---|
| later today | shown | shown |
| in progress now | shown | shown — the card still does not vanish |
| ended earlier today | **shown** | skipped |
| no `end_time` (`US-030` AC-6 rows) | shown all day | shown all day |
| already past | skipped | skipped |

Delegating rather than comparing `endTime` here is the point: the null fallback
and the local-vs-UTC parsing `endOfShoot` exists to get right are already solved
in `status.ts`, and a second copy of that reasoning is how the two would drift.

Checked against the owner's exact case — 2026-09-06 16:50, an 11:00–13:00 shoot
and an 18:00 one — plus a shoot in progress, a legacy row with no end time, and
a day where everything has finished (which returns null, so `US-035` AC-5 shows
the section as absent rather than empty).

`toIsoDate`'s import went with the last date comparison.

## A past day's calendar dot is red (owner, 2026-09-06)

Every marked day carried the same blue dot. A day before today now carries
`--danger-soft` — the tone `StatusPill` gives «Завершена».

A month grid is mostly history, and a column of identical dots said "something
is on this day" without saying whether it had happened. That is the one thing
the reader already knows about half the grid and could not see on any of it.

**`bg-danger-soft`, not `bg-danger-bg` or the border.** At 4px only the scale's
visible tone registers, and `--danger-soft` is to `--danger-*` what `--info` is
to the blue it replaces. Not `--destructive`, which is the colour of an action
that destroys where this is a state that has ended — the distinction
`status.ts` and `StatusPill` already keep.

### Strictly before today, and deliberately not "finished"

A day is past because it is before today, not because a shoot on it has ended.
That second question is `statusOf`'s, and answering it here would make today's
dot change colour halfway through the afternoon — while the day is still the
one the reader is living in and the agenda below still lists it.

Which is a different call from the home screen's, made the same day: there,
«Найближча зйомка» skips a shoot that has finished, because the card names one
shoot and a finished one is the wrong answer. Here the dot names a *day*, and
the day has not gone anywhere.

`us004-check.mjs` is unaffected: it collects elements whose whole text is one or
two digits and which carry a background, so it reads day cells rather than
dots — a dot has no text at all.

## The calendar's list starts at today (owner, 2026-09-06)

With no date selected the agenda returned every shoot on record, oldest first —
so the screen opened on the earliest one and the reader scrolled through their
whole history to reach anything upcoming. `US-004` AC-4 says "all of it when
nothing is selected", which was implemented literally and reads badly at any
real number of shoots: fine at ten, unusable at two hundred, with the useful end
at the far end.

**From today 00:00, not from now.** A shoot that happened this morning stays in
the list: it is still today's, the reader was probably at it, and a day that
empties itself as it passes is a worse surprise than one that keeps what has
been.

That is deliberately **not** the rule the home screen took the same day. There,
«Найближча зйомка» skips a shoot that has finished — that card names one shoot
and answers "what is next", where this is a day's agenda answering "what is on".
Three rules now sit side by side, each keyed to what its surface claims:

| surface | boundary |
|---|---|
| «Найближча зйомка» | not finished (`statusOf`) |
| the calendar's agenda | date ≥ today |
| a past day's red dot | date < today |

**Selecting a date still reaches the past**, whatever its date, so history is one
tap away in the calendar rather than gone — which is also what makes the red
dots on past days worth drawing.

`US-004` AC-4 wants amending.

### Two things left alone, both flagged

**The empty-state copy.** «На цьому тижні…» / «У цьому місяці…» were always
approximate — the list has never been scoped to the calendar's period, and
`inPeriod` feeds the header's meta line and nothing else. Now they are wrong in
a new way: an account whose every shoot is past falls to «У цьому місяці ще
немає зйомок» when what is true is that nothing is ahead. «Попереду зйомок
немає» is the sentence it wants, and it is not the owner's to assume.

**`us004-check.mjs` becomes date-dependent.** It seeds two shoots on the 7th and
22nd of the current month and asserts both are listed. Run before the 7th, both
are ahead and it passes; run on the 10th, «Раніша» is correctly filtered out and
the assertion fails — the suite would report a bug that is the feature working.

Not repaired here. The fix is to seed relative to today rather than on fixed
days, and to derive the calendar's expected marks from the same values — but
two future days do not always fall inside the focused month, so it needs the
month arrow tapped in that case. That is a test-design change, and it cannot be
verified while the local stack is down; guessing at it blind is how the other
edits today became unverified. Recorded so it is found deliberately rather than
as a mystery failure.

## «Скасувати» asks before discarding (owner, 2026-09-06)

The shoot form, the add-crew screen and the contact form all left on the first
tap, dropping whatever had been typed without a word. The profile screen has
asked since 2026-09-04, so the behaviour existed on one screen out of four.

`useDiscardGuard` is the shared version — `{ ask, dialog }`, the shape
`useDestructiveConfirm` already uses, so the caller decides where the sheet
mounts and the hook owns whether there is anything to ask about. A clean form
leaves at once: a confirmation nobody can answer "no" to is a dialog that only
ever says yes.

**The platform's own alert on device, the sheet on web.** Exactly the split
`useDestructiveConfirm` makes: iOS has a shape for "are you sure" and imitating
it is worse than using it, while react-native-web has no `Alert` worth the name
— and the acceptance suites drive every one of these forms in a browser, so a
native-only dialog would make «Скасувати» untestable and silently inert there.

It was a `Sheet` on both platforms for an hour, on the reasoning that
`Edit Profile.dc.html` draws one and the profile screen had rendered it that way
since it was built. The owner asked for the system dialog, which is the second
time today the same call has gone that way — `Alert.prompt` for the reference
link was the first. The pattern is now explicit: **a form-level question uses
the platform's dialog where the platform has one.**

`cancel` first and `destructive` second, so iOS lays the buttons out the way
people expect — staying is the safe default, leaving is the one that acts.

### What counts as dirty is each form's own answer

| form | baseline |
|---|---|
| shoot (create) | every field empty |
| shoot (edit) | a fingerprint taken when the shoot loaded |
| contact | the `initial` draft it opened with |
| add crew | an untouched form **and an empty selection** |

The shoot form had no snapshot to compare against, so it takes one: every field
joined into a string when the row loads, and the empty string on a new shoot.
A string rather than an object because comparing is the only thing done with it,
and a dozen `useState`s have no natural object to snapshot.

The add-crew screen counts a **selection** as work. Someone who has ticked four
people from «Мої контакти» and taps «Скасувати» loses four decisions, which is no
less annoying for having been made by tapping rather than typing.

### Two things worth knowing

**The create shoot form is guarded too**, though only the edit one was named. It
is where the most can be lost — an entire shoot rather than an edit to one — and
an untouched form still leaves at once, so the guard costs nothing when there is
nothing to lose.

**The profile keeps its own copy of this sheet.** Its body names the fields that
changed (`changedFieldsTemplate`) and it toasts «Зміни відхилено» afterwards;
threading two options through the hook for a single caller would be worse than
the duplication. Worth unifying the moment a second screen wants either.

No acceptance suite taps «Скасувати» on any of these screens — the only matches
under `tests/` are `us019`'s «Скасувати зйомку», which is the delete control and
untouched.

### Fixed the same day: a new shoot was dirty before a key was pressed

The shoot form's snapshot started at `''`, and `fingerprint` of an empty form is
a row of separators rather than nothing — so `current !== snapshot` was true the
moment «Нова зйомка» rendered, and «Скасувати» always asked. Reported by the
owner within the hour.

It starts at `EMPTY_FINGERPRINT` now, built by the same function from the same
empty values, so the two cannot disagree about what empty looks like when a
field is added to one of them.

Checked: untouched leaves at once; one character makes it dirty; whitespace
alone does not, because every field is trimmed; picking a date does.

## «+ Нова зйомка» is pinned on the home screen too (owner, 2026-09-06)

The calendar has pinned its CTA since 2026-09-04; the home screen's still
scrolled with the list, so the screen's one action sat halfway down it. Now both
tabs put the button in the same place.

`Home.dc.html` draws it inline, under the next shoot — this is a departure from
the artboard, and the same one the calendar already made for the same reason.

**No bottom inset**, matching the calendar and unlike the shoot screen's footer:
both of these are `(tabs)` routes where the bar owns the safe area and its
screens sit above it rather than underneath, so the screen's own bottom edge is
already clear of the home indicator. `pb-10` became `pb-24` on the scroll — the
40 was the artboard's figure for clearing the bar alone, and the button now
occupies that space.

### And then made identical, because they were not

The two buttons were **almost** the same, which the owner spotted immediately and
which is worse than either being different on purpose. The home one carried
`className="h-12 justify-center py-0"` and a **double** space after the «+»; the
calendar's had neither.

Both came from the home button's earlier life as an inline, artboard-driven
control: `Home.dc.html` specifies `height:48px`, so it was given one. Pinned, it
is a CTA like every other, and `size="cta"`'s `py-[15px]` lands at the same ~48
— while being padding rather than a fixed height, so a label that wraps to two
lines still fits. `Button` chose that deliberately for Ukrainian, «Позначити як
«Закінчена»» being 22 characters, and the override quietly opted out of it.

Every pinned CTA in the app is now bare `variant="cta" size="cta"`: this one, the
calendar's, and the shoot's «Деталі» and «Команда» footers.

## «Редагувати профіль» is pinned too (owner, 2026-09-06)

`PublicProfile`'s edit pill and delete circle sat at the foot of the scroll, so
on a profile with notes and three contact rows the edit button was below all of
them. Pinned, it is where every other primary action in the app now is: «+ Нова
зйомка» on both tabs, «Редагувати зйомку» and «+ Додати учасника» on the shoot.

### `aboveTabBar`, and why it has to be a prop

This component renders in two places with opposite answers about the bottom
inset. The profile TAB sits inside `(tabs)`, where `BottomNav` is mounted by the
layout and owns the safe area. A contact's page is PUSHED, covers the bar, and
owns the inset itself.

`insets.bottom` is therefore right in exactly one of the two, and adding it in
the other floats the row 34pt up the page — the mistake the calendar's footer
comment has warned about since 2026-09-04.

It defaults to **false**, which is the safe way round: a caller that forgets it
gets a footer clear of the home indicator rather than one underneath it.

The same value drives the scroll's bottom padding, which is 96 when there are
actions to clear and the original 32 when there are none — a profile with
neither handler still has no footer.

### Note the shape this did NOT take

`backLabel === null` already means "this is a tab root" at every present call
site, so the inset could have been derived from it without a new prop. That
would have been two facts riding on one field, and the first screen that wants a
back control inside the tabs — or a pushed screen without one — would find them
silently welded together.

## The bell becomes real: notifications for crew answers (owner, 2026-09-06)

The home screen has drawn a bell since 2026-08-28 with nothing behind it, and an
unread dot that was drawn unconditionally — which that screen's own comment
called "the one thing on this screen that states something untrue". It now opens
«Сповіщення», and the dot counts unread crew answers.

**Scope is one event**: a crew member confirming or declining. The owner's
choice, and `notification_kind` has exactly those two values.

### No story, and no glossary entry

Nothing in the PRD's requirement register or any epic mentions notifications.
`US-008` gives a crew member the ability to answer and says nothing about
telling the photographer.

**`Notification` is not in the glossary either.** Rule 5 says entity names come
from `data-model.md`, which confirms `Shoot`, `CrewMember`, `Reference`,
`AccessLink` and `User` and no sixth. The name is chosen here because the thing
needs one; it is the only table in the schema whose name nobody has agreed, and
it wants confirming in the discovery repo.

### A table, not two columns

Every answer already lives in `crew_members.response`, so the cheaper design was
`responded_at` plus a per-user `notifications_seen_at` — no new entity. Both
were put to the owner and the table was chosen, knowing it is the heavier one.

What it buys: per-row read state; an event that survives its subject, where a
derived version reads a CURRENT value and loses the event when the value moves;
and room for a second kind without another schema decision.

### The trigger, and a bug the DDL check could not see

`notify_crew_response` fires only on the move away from `pending`, which is what
`US-008`'s "a submitted response is final" and `20260826190000`'s WHERE clause
already guarantee — so a crew member produces at most one row and there is no
supersession rule to write.

It is `security definer` with a pinned `search_path`, because the writer is the
link gateway under the service role and because **nobody holds INSERT on the
table** — not `authenticated`, not `service_role`. Every row comes from the
trigger, so a notification cannot be fabricated by the one component reachable
by anyone with a URL.

**The first version was broken and applying it cleanly did not show that.** The
`case … end` yielded `text` where the column is an enum, which raises on insert
— and because the insert happens inside the crew member's own UPDATE, the
failure would not have been a missing notification but a crew member's answer
refusing to save at all. Found by exercising the trigger against real rows in a
rolled-back transaction: pending notifies nobody, each answer reaches the shoot's
creator unread, and re-updating a settled response adds nothing.

### Reads, and rule 3

`listNotifications` uses `!inner` joins on `crew_members` and `shoots`, whose
SELECT policies carry `removed_at is null` and `deleted_at is null` themselves.
So **removing a crew member removes their notification**, and deleting a shoot
removes its own. That is a decision as much as a mechanism: `ADR-014` makes
`removed_at` how access is revoked, and a bell still announcing somebody the
photographer took off the shoot is the resurrection rule 3 exists to prevent.
The row stays in the table; it stops being shown.

`authenticated` is granted `select` and `update (read_at)` — column-level, the
same reasoning `20260826190000` applies to `response`. The only thing a reader
may change about a notification is whether they have read it.

### The copy is not the mockup's

The mockup's handler reads «Гліб підтвердив участь у зйомці 19 вересня». That
sentence needs a gendered verb — `підтвердив` or `підтвердила` — and nothing in
the schema stores a gender. The row uses `ResponsePill` with the crew list's own
«Підтверджено» / «Відмова» instead: no new sentence, no gender, and one control
deciding what an answer looks like on both screens.

`notificationsEmpty`, `notificationsEmptySub` and `notificationShootTemplate`
are new and have no source. They want the owner's words.

### It is a popover, not a screen — `Home.dc.html`'s own

Built first as a pushed route with a header and a back control, then replaced:
the artboard draws a popover anchored under the bell. The difference is not only
visual — it keeps the reader on the screen the notification is about, and closes
by tapping anywhere.

Taken from the artboard: `right:14px; width:306px`, a 12px caret rotated 45° at
`top:-5 right:19`, a `--border-strong` hairline at radius 14, and a
`0 18px 44px rgba(0,0,0,.6)` shadow.

**`top` is computed, not the artboard's 104.** That number counts from the
frame's own top, 60px of which is its drawn status bar. Ours is `insets.top`
plus the header's padding plus the bell, so the caret lands under the bell on
every device rather than on the one it was drawn at.

Two departures beyond that:

**The mark's ink.** Each row's avatar carries a 16pt tick or cross in its
corner. The artboard strokes both in `var(--bg)` — a dark tick on `--success`,
which is `#098B47` here and would hide it. Each takes its own scale's ink
instead: `--success-foreground` on green, `--destructive-foreground` on red.
`--danger-*` has no solid fill in this theme, which is why a refusal uses
`--destructive` — the one place in the app where that token marks a state rather
than an action.

**It scrolls.** The artboard draws four rows and stops; a real account has any
number, and a popover that grew past the screen would put its last row under the
tab bar. Capped near five rows.

### The gendered verb, which the artboard does not solve

`Home.dc.html` writes «підтвердив участь» and «відмовилася від зйомки» —
correct per person in a mock that hardcodes each. Nothing in the schema stores a
gender, so the app cannot reproduce them without guessing, and guessing wrong
about a person's gender in a sentence about them is worse than using no verb.

So the passive: «— участь підтверджено» / «— відмова від зйомки», which needs
none and echoes `responseConfirmed` / `responseDeclined` on the crew list.
Invented copy, and it wants the owner.

`relativeTime` is invented in the same way. The artboard shows «2 год», «4 год»
and «вчора»; the rest of the scale — «щойно», «14 хв», «3 дні» — is filled in
here. **Calendar days, not elapsed hours**: something at 23:00 last night reads
«вчора» at 01:00 rather than «2 год», which would be technically right and
useless.

### The dot is blue

`bg-accent-solid`, which is what `Home.dc.html` draws:
`background:var(--accent-solid)` with a 2px `--bg` ring. It was `foreground`, on
a code note reading "the design draws it white" — true of the monochrome pass,
and untrue since the 2026-09-04 handoff brought colour back. White also made the
dot the same tone as the bell glyph it sits on, so the one thing it exists to do
was the one thing it could not.

8.37:1 against the page, against 18.97:1 for the white it replaces — lower and
far more than enough for a 7px mark whose job is to be noticed rather than read.
What actually improved is the 2.27:1 it now has against the bell beside it,
where white had none at all.

This also gives `--accent-solid` a caller again: `Badge`'s `accent` variant lost
its last one when «Сьогодні» went green, and was kept on the grounds that the
token existed for that shape.

### Not built

Delivery of any kind — push, email, badge counts on the app icon. This is an
in-app popover and a dot, which is what was asked for. `notifyNewConfirmations`
on the profile screen is still the stub it has always been, and now sits next to
a feature it does not control.

## The decline reason was accepted and dropped (2026-09-06)

`US-008` offers «Причина — за бажанням» when a crew member declines. The link
view collects it, `respondToLink` sends it, the gateway parses it — trimmed and
capped at 120 characters — and passes it to `respond()`.

`respond()` took **three** parameters and wrote one column. The reason went
nowhere, and the creator's screen has been reading a column nothing ever filled.

Found while tracing whether a crew member's answer would reach the new
notifications table. It has been broken since `20260831180000` added the column
six days ago — that migration widened the grant to `(response, decline_reason)`
specifically so this write could happen, and the write was never added.

**Nothing could have caught it here.** A call with a spare argument is a type
error, and `tsconfig.json` excludes `supabase/functions` because it is Deno.
`deno check` on that file is the thing that would have; it cannot run in this
checkout without a `deno install`, which is worth setting up.

### Two test corrections

**`us008-check.mjs` never asserted the reason lands.** It now declines *with*
one and reads the column back. That assertion is the one that would have caught
this, and it did not exist.

**Its grant assertion was stale.** It expected `UPDATE:response` alone and has
been failing since the same migration widened the grant. Now compared as a set,
so the catalogue's ordering is not part of the claim. Baseline 19 → 20.

Confirmed against a migrated schema in a rolled-back transaction: the statement
`respond()` now issues stores both, and the grant reads
`UPDATE:decline_reason,UPDATE:response`. The local database still reports one
column, because it is twelve migrations behind — an artifact of the stale local
stack rather than of the code.

### The column is named only when declining

A confirmation carries no reason — the link view does not collect one — and
"a submitted response is final" means there is no earlier reason to clear: the
WHERE clause only ever matches a `pending` row.
