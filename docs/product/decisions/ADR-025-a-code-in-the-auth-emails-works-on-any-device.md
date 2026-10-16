# ADR-025 — A code in the confirmation and recovery emails, so they work on any device

- **Date:** 2026-10-16
- **Status:** accepted
- **Amends:** `US-001` AC-1 and AC-4 — the email can be confirmed with a code as well as the link;
  `US-040` AC-3 — "one link, the right app" is met by the code, without Universal Links
- **Does not change:** `ADR-019` (the email is confirmed before it matches crew), `ADR-015`
  (email and password), `US-048` (the emails' language)
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-16), agent (recommendation)

## Context
The confirmation email (`ADR-019`) and the recovery email carry one link, and the link goes back
to wherever the email was asked for: `lunashoots://confirm` from the iOS app, the web app's own
address from the web. So a photographer who registers on the iPhone and opens the email on a
computer — where the mail often is — presses a button that does nothing: a computer has no app
to open `lunashoots://`. The same holds for «Забули пароль?».

`US-040` AC-3 asks for one link that opens the iOS app on a phone and the web app on a computer.
Built with links alone, that needs Universal Links: an `apple-app-site-association` file on
`app.lunashoots.com` (a deploy, which waits for `US-057`) and an associated domain in the app
(an iOS build). Links in email have a second weakness: corporate mail and Outlook open links in
advance to scan them, which can spend a one-time token before the person clicks it.

## Options considered
### Option A — Universal Links only
- **Pros:** one tap, no typing
- **Cons:** cannot be built or tested before the web app is deployed; a scanner can still spend
  the token; on a computer with no web app session the flow still depends on a redirect

### Option B — a code only
- **Pros:** works across devices whatever opened the email; no deploy, no association file
- **Cons:** typing six digits is slower than a tap where the link would have worked

### Option C — a code and the link, in the same email *(chosen)*
- **Pros:** the code works on any device; the link stays one tap on the device that asked for the
  email; the common pattern (Notion, Slack, Linear)
- **Cons:** a code field and its errors to design and word; an iOS build

## Decision
Option C.
1. **The confirmation email and the recovery email carry a code as well as the link.** The code
   is Supabase's own one-time token (`{{ .Token }}`, verified with `verifyOtp`), the same token the
   link carries.
2. **The «Перевірте пошту» screens take the code.** After registration, the code confirms the
   email and signs the user in, as the link does (`US-001` AC-1). After «Забули пароль?», the code
   leads to the new-password screen, as the link does.
3. **The link stays**, and keeps going back to where the email was asked for.
4. **Universal Links are not needed for `US-040` AC-3.** They may still come later, for
   convenience, with the deploy.

## Consequences
- **Accepted cost:** new copy — the code field, its errors, the line in the emails — in both
  languages; an iOS build; the templates pasted into the production dashboard again (`US-048`).
- **Now easier:** registering on one device and reading mail on another; `US-040` AC-3 no longer
  waits for the deploy.
- **Now harder:** nothing closed off. The link is untouched.
- **Revisit when:** people struggle with the code — then Universal Links make the link work
  everywhere too.

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `US-001` | AC-1 — the code as well as the link; AC-4 — a wrong or expired code |
| `US-040` | AC-3 met by the code (`US-058`) |
| `US-058` | new — confirm the email or reset the password with a code from the email |
| `EP-01` | `US-058` added |
| `ADR-019` | unchanged; noted as amended in how, not whether, the email is confirmed |

## Open questions
*Both answered 2026-10-16 (owner): the copy as drafted — `US-058`, Copy — and 30 minutes.*

1. **The copy** — the code field's label and placeholder, its button, a wrong code, an expired
   code, and the line in each email. The agent drafts; the owner confirms (`US-058`).
2. **How long a code lives.** One setting covers the link and the code (`otp_expiry`). The
   recovery screen tells the reader the link is valid for 30 minutes; the production value is
   not recorded here. Confirm 30 minutes for both.
