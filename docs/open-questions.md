# Open questions — build repository

Questions raised while building, which the frozen specification does not answer.
Per `CLAUDE.md` rule 1 these are **not decided in code**. Where work could not stop, the
placeholder actually shipped is named, so it can be found and replaced.

The fix for any of these is in the discovery repo (a story change or an ADR), then re-freezing
`docs/product/` — never an edit here.

## Open

### 1. Ukrainian copy for a registration that fails for a reason other than a missing role
`US-001` AC-2 gives exact copy for the missing role («Оберіть роль, щоб зареєструватися») and
`US-013` gives it for wrong credentials, but nothing covers a duplicate email, a rejected
password, or a network failure.

- **Raised by:** `US-001`
- **Placeholder in code:** `registrationFailed` in `src/i18n/uk.ts` —
  «Не вдалося зареєструватися. Спробуйте ще раз.»
- **Blocks:** nothing. One string, replaced in one place.

### 2. Password rules
Not specified anywhere. Supabase's default minimum of 6 characters is in force
(`supabase/config.toml`, `minimum_password_length`).

This one drew blood: with no rule shown and a single generic error message, a short password was
rejected with «Не вдалося зареєструватися. Спробуйте ще раз.» — advice that can never succeed,
since retrying the same password fails identically. The screen now states the minimum up front
and names the cause when rejected, but **6 characters is Supabase's default, not a product
decision**, and the copy is placeholder.

- **Raised by:** `US-001`
- **Placeholders in code:** `passwordHint`, `passwordTooShort`, `emailTaken` in `src/i18n/uk.ts`
- **Blocks:** nothing, but the minimum is a security decision nobody has made.

### 3. Where a returning user lands
`US-013` AC-1 says "their shoot list (if a shoot creator) or their own schedule (if a
self-registered crew member)" — but nothing distinguishes those users. `role` is a profession,
and any registered user may create a shoot (`ADR-001`, `ADR-002`). The schedule itself is
`US-009`, a `should` that may be cut (`open-questions.md` #3 in the spec).

- **Raised by:** `US-001` / `US-013`
- **Placeholder in code:** `app/index.tsx` sends everyone to the shoot list.
- **Blocks:** `US-013`.

### 4. Is the profile editable, and can a role be changed after registration?
Carried from the spec's own open questions (#13). `US-016` is read-only by AC. Registration is
currently the only moment a role is set, so a mistake is permanent.

- **Raised by:** `US-001`
- **Blocks:** nothing yet.

### 5. Creating and sharing the *client* link
`AccessLink` models one client link per shoot and `US-010` covers the client opening it, but no
story covers the creator creating or sharing it. The prototype only offers
«Переглянути як клієнт (демо)», a demo affordance rather than a share action.

- **Raised by:** reading EP-04 against EP-03
- **Blocks:** `US-010` when EP-04 starts.

### 6. Where the creator sets the raw-files / finished-photos links
`US-024`/`US-025` specify the client's view of these, and `data-model.md` has the columns, but no
story's acceptance criteria cover the creator entering them. `ux-notes.md` places them on the
edit screen and the prototype implements it there, so design covers it and the backlog does not.

- **Raised by:** reading EP-04 against EP-02
- **Blocks:** nothing yet; `US-018` would be the natural home.

### 7. `US-024`/`US-025` AC-3 asks for an undecidable check
AC-3 requires rejecting a pasted link that is "malformed or unreachable". Reachability needs a
server-side fetch that many file-sharing services refuse. It is also ambiguous *where* the check
happens: AC-3 reads as the client's render ("falls back to its placeholder") but points at
`US-003` AC-2, which rejects at input time with a message.

- **Raised by:** `US-024`, `US-025`
- **Blocks:** those stories when EP-04 starts.

### 8. Copy for missing client name / client contact on shoot creation
`US-002` AC-2 requires "the missing field is indicated", and the prototype supplies copy only for
the date («Вкажіть дату зйомки»). The schema makes `client_name` and `client_contact` NOT NULL,
and AC-1 lists both as part of creating a shoot, so both are validated — but the wording is
invented.

- **Raised by:** `US-002`
- **Placeholders in code:** `clientNameRequired`, `clientContactRequired`, `shootCreateFailed` in
  `src/i18n/uk.ts`
- **Blocks:** nothing.

### 9. Date display format
The prototype renders dates as raw ISO (`2026-09-05`) in the shoot list and detail, so that is
what is implemented. Nobody has confirmed whether a Ukrainian-facing product should show
`05.09.2026` instead.

- **Raised by:** `US-002`, `US-004`
- **Blocks:** nothing, but it is visible on every screen with a shoot on it.

### 10. Should the role picker be a bottom sheet on touch?
`ADR-016` replaced the UI layer, and this is the one control whose *presentation* changed. The
previous kit adapted its `Select` into a bottom sheet on touch devices; React Native Reusables
renders an anchored popover through a portal on every platform, and ships no sheet adapter.

Same control, same five options, same copy — `US-001` specifies none of this, so nothing in the
backlog is violated either way. It is recorded because a sheet is closer to `UIPickerView`, and
`S-1` F-3 named the role picker as the place the "authentic Apple look" question (R-1) is
actually decided. Building a sheet by hand during the port would have been a redesign.

- **Raised by:** the `ADR-016` port
- **What shipped:** RNR's stock `Select` (anchored popover) in `app/(auth)/register.tsx`
- **Blocks:** nothing. This bore on R-1, and R-1 was answered on 2026-08-26 — Ilona reviewed
  the app on a device, this picker included, and approved (`docs/spikes/S-1-*.md`). No
  component-level feedback was captured, so the question is not so much answered as no longer
  urgent: nobody asked for a sheet.

### 11. Do shoot list rows respond to touch, and what do they do?
`US-004` does not say. The previous kit's list rows flashed on press by default, but nothing was
wired to that press and no screen exists to navigate to — the shoot detail screen is a later
story. The ported rows are therefore plain, non-pressable rows: a press that leads nowhere is
not a behaviour anyone specified.

- **Raised by:** the `ADR-016` port
- **What shipped:** non-pressable rows in `app/(app)/index.tsx`
- **Blocks:** nothing. Resolves itself when the shoot detail screen arrives.

### 12. The two shoot-status colours are unapproved values
`US-020`'s statuses are rendered by `StatusPill`. The previous kit supplied these as named
colour sub-themes, so no value was ever chosen by this project. NativeWind has no equivalent, so
the port had to write actual values: `--status-new-*` and `--status-finished-*` in
`src/theme/global.css`, picked to match what was there (a warm tone for «Нова», a green one for
«Закінчена»).

Nobody has approved them, and they are the only colour values in the repository that did not
come from React Native Reusables' stock palette. The re-theming task should treat them as
placeholders, not as decisions.

- **Raised by:** the `ADR-016` port
- **Placeholders in code:** the six `--status-*` tokens in `src/theme/global.css`
- **Blocks:** nothing. Belongs to the re-theming task.

### 13. Copy and rules for rejecting a reference (`US-003` AC-2)
AC-2 requires that an unsupported file type or an invalid link be rejected "with a clear
message". It supplies no message, and the prototype has no rejection copy at all. It also does
not define either term.

What shipped, all of it a decision this story had to make rather than one the spec made:

- **"Invalid link"** is implemented as: parses as a URL, and the scheme is `http` or `https`.
  There is deliberately no host allow-list — the placeholder names Pinterest as an example, not
  a restriction, and `prd.md` R-03 makes references whatever the photographer already has.
- **"Unsupported file type"** is implemented as an allow-list of the image types iOS actually
  returns from the photo library (`jpeg`, `png`, `webp`, `heic`, `heif`, `gif`), so it rejects
  nothing a user could normally pick.
- **The messages themselves** are invented.

- **Raised by:** `US-003`
- **Placeholders in code:** `referenceLinkInvalid`, `referenceTypeUnsupported`,
  `referenceAddFailed` in `src/i18n/uk.ts`; `SUPPORTED_IMAGE_TYPES` and
  `isValidReferenceLink` in `src/features/references/api.ts`
- **Blocks:** nothing.

### 14. Ukrainian copy for the iOS photo-library permission prompt
`US-003`'s gallery picker triggers the system permission dialog, whose text the app supplies.
No story or prototype covers it, and the library's default is English, which `CLAUDE.md` rule 4
does not allow.

- **Raised by:** `US-003`
- **Placeholder in code:** `photosPermission` in `app.config.ts` — «Luna потребує доступу до
  фото, щоб додати референс до зйомки.»
- **Blocks:** nothing. One string, and it only appears once per install.

### 15. What a reference is labelled *(the tapping half is answered — see below)*
The data model gives a `Reference` only `kind` and `url_or_path` — no title, no caption. The
prototype's thumbnails carry a label, but it is demo text (`Референс 1 (демо)`), not a field.
So an image reference renders as the image, and a link reference renders its host, because that
is the only text available. Nothing was invented to fill the gap.

Still open: whether a link reference should show a preview or thumbnail rather than its bare
host. That needs either a stored title/preview image or a fetch at render time, so it is a data
model question, not a styling one. Not raised by the owner; recorded because a wall of identical
grey tiles reading `pinterest.com` is the foreseeable end state.

- **Raised by:** `US-003`
- **What shipped:** host-labelled link tiles in `app/(app)/shoot/[id].tsx`
- **Blocks:** nothing. Bears on `US-007`/`US-010`, where crew and clients read the same
  references.

### 16. ~~The calendar has no month navigation, and the prototype does~~ *(answered 2026-08-26)*
**The owner asked for month navigation, and it is built** — `US-004` `AC-3`, review `r04`,
source commit `c2ea13b`. The prototype was right and the story's exclusion was the thing that
moved. The original text is kept below because the reasoning for shipping without it is the
reason this was raised rather than decided.

### 16 (as raised). The calendar has no month navigation, and the prototype does
`US-004`'s Out of scope is explicit: *"Month navigation, multi-month view, or any calendar
behavior beyond marking shoot dates on the current view — not specified; keep it simple until
asked for more."* So the calendar shows the current month, with no arrows and no tappable days
(what tapping a date does is also left open, by the same section).

The prototype disagrees with itself here. `calendarHtml` draws `‹` and `›` buttons with working
`cal-prev`/`cal-next` handlers, and it deliberately opens on September rather than the real
current month — the comment says so: *"matches the demo shoot's date, so it's visible without
navigating"*. That is the prototype Ilona reviewed twice.

The consequence of following the story: **a shoot in any month but this one is invisible on the
calendar.** Today is August; a shoot booked for October marks nothing, and there is no way to
look. For a photographer booking weeks ahead that is most shoots. The list still shows them, so
nothing is lost — but the calendar is close to decorative until the month turns.

Followed the story rather than the prototype, because the story states the exclusion in words
and the prototype only implies the inclusion by having built it. It is recorded rather than
decided.

- **Raised by:** `US-004`
- **What shipped:** `src/components/ShootCalendar.tsx` — current month, no navigation, no
  tappable days
- **Blocks:** nothing. One arrow pair if the answer is "add it".

### 17. Copy for the filtered shoot list (`US-004` AC-4)
AC-4 requires the filtered date to be stated, a control back to the full list, and an empty date
to say so. It supplies none of the words, and the prototype has no filtered state at all — its
calendar days only raise a toast saying the question is open.

Three inventions, all placeholders:

- **«Всі зйомки»** — the control that clears the filter.
- **«На цю дату зйомок немає.»** — the empty result for a date with no shoots. This one matters
  more than it looks: it must *not* read like AC-2's «У вас ще немає зйомок.», which means the
  account has no shoots at all. Showing that copy for an empty date would tell the photographer
  their shoots had vanished.
- **«7 серпня»** — the label naming the filtered date. Ukrainian inflects the month when a day
  precedes it, so this needed a genitive month list (`MONTHS_GENITIVE_UK`) alongside the
  nominative one the calendar heading uses. That is a correctness point, not a style one: «7
  Серпень» is wrong.

- **Raised by:** `US-004` AC-4
- **Placeholders in code:** `allShoots`, `noShootsOnDay` and `MONTHS_GENITIVE_UK` in
  `src/i18n/uk.ts`
- **Blocks:** nothing.

### 18. `US-018` leaves three things to the build
**Copy for a failed save and a rejected attachment.** AC-3 supplies the date rule and reuses
`US-002`'s wording for it, but nothing covers a save that fails or a file type that cannot be
attached.

**A way to clear the date.** AC-3 requires that clearing the date and saving be *blocked*, which
means the cleared state has to be reachable — but the date is a picker, and a picker with no way
out can only ever produce a valid date. A ✕ control was added to `DateField`, on the edit screen
only. Its label had to be its own: «Скасувати» was already the button that abandons the edit,
and two controls answering to one word is ambiguous to anyone not looking at the glyph.

**Which kind of thing the attachment is.** `Shoot.location_attachment` is a single text column
with no companion `kind`, so image-versus-video is read off the file extension. That is the only
signal the data model offers; the alternative was inventing a column the spec does not have.

- **Raised by:** `US-018`
- **Placeholders in code:** `shootUpdateFailed`, `attachmentTypeUnsupported`, `clearDate` in
  `src/i18n/uk.ts`; `attachmentKind` in `src/features/shoots/locationMedia.ts`
- **Blocks:** nothing.

### 19. A location video does not play in the app
`US-018` AC-2 says the attachment is "shown wherever the location is displayed". An image is
shown inline. A video is a tile that opens in the platform's player instead, because nothing
specifies inline playback and `risks.md` R-4 puts video behind spike **S-4**, which has not run
— including its question of whether a signed URL outlives an idle page long enough to press
play. Opening it is the gesture `US-003` AC-3 already established for a link.

This will matter more in the link views (`US-007`, `US-010`), where a crew member on a shoot
morning is the person actually watching it.

- **Raised by:** `US-018` AC-2
- **What shipped:** an inline image, and a 🎞 tile that opens the video externally
- **Blocks:** nothing. Belongs with `S-4`.

## Answered by re-reading the spec

### What tapping a reference does — answered by the owner, 2026-08-26
Raised as the other half of item 15: no story said whether a reference opened, and the
prototype's thumbnails are inert. The owner tested `US-003` on a device and decided — **a link
opens in the phone's browser, an image opens full-screen**.

Routed through the discovery repo rather than decided here, per `CLAUDE.md` rule 1: it is now
`US-003` **AC-3** (review `r03`, source commit `befd916`), generalised in `ux-notes.md` to every
surface that shows references, so `US-007`, `US-010` and `US-021` inherit it.

### Email confirmation at registration — resolved, no change needed
`US-001` AC-1 says the account is created "and they land on their (empty) shoot list". A
confirmation step before landing would contradict that, so registration must yield a session
immediately. `enable_confirmations = false`, annotated in `supabase/config.toml`. **The cloud
project needs the same setting** — Authentication → Providers → Email.

### The role list — resolved by the prototype
`US-001` defers the list to "the glossary's confirmed roles as the starting list". The glossary
confirms makeup artist, stylist, gaffer and shoot manager; the gated prototype adds Фотограф and
fixes the Ukrainian labels. Five roles, in `ROLES_UK` (`src/i18n/uk.ts`).
