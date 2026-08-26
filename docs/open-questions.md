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
- **Blocks:** nothing. Bears on R-1, which is open anyway.

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

## Answered by re-reading the spec

### Email confirmation at registration — resolved, no change needed
`US-001` AC-1 says the account is created "and they land on their (empty) shoot list". A
confirmation step before landing would contradict that, so registration must yield a session
immediately. `enable_confirmations = false`, annotated in `supabase/config.toml`. **The cloud
project needs the same setting** — Authentication → Providers → Email.

### The role list — resolved by the prototype
`US-001` defers the list to "the glossary's confirmed roles as the starting list". The glossary
confirms makeup artist, stylist, gaffer and shoot manager; the gated prototype adds Фотограф and
fixes the Ukrainian labels. Five roles, in `ROLES_UK` (`src/i18n/uk.ts`).
