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
