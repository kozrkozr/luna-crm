# US-058 — Confirm the email or reset the password with a code from the email

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **user** who reads mail on another device than the one I registered on,
I want **to type the code from the email instead of pressing its link**,
so that **I can confirm my address or reset my password whichever device the email opened on**.

## Context
`decisions/ADR-025-*.md`. The link alone goes back to where the email was asked for, so it does
nothing on a computer when the email was asked for on the iPhone. The code is the same one-time
token the link carries. Recovery had no story of its own — it was built under `US-001`/`US-013`'s
login screen — and is covered here for the code only.

## Acceptance criteria

### AC-1 — The emails carry a code
- **Given** a confirmation email (`US-001`) or a recovery email («Забули пароль?»)
- **When** it arrives
- **Then** it shows a code as well as the link, in the account's language (`US-048`)

### AC-2 — Confirming the email with the code
- **Given** the «Перевірте пошту» screen after registration, in the iOS app or on the web
- **When** the user types the code from the email
- **Then** the email is confirmed and the user is signed in — what opening the link does
  (`US-001` AC-1), including what follows it (the paywall on iOS, `US-051`)

### AC-3 — Resetting the password with the code
- **Given** the «Перевірте пошту» screen after «Забули пароль?», in the iOS app or on the web
- **When** the user types the code from the email
- **Then** the new-password screen opens, as it does from the link

### AC-4 — A wrong or expired code *(required)*
- **Given** either «Перевірте пошту» screen
- **When** the user types a code that is wrong, already used or expired
- **Then** they are not signed in and nothing changes; one message says the code is wrong or
  expired — Supabase answers both the same way, so the app cannot tell them apart — and the screen
  still offers to send the email again

### AC-5 — The link still works *(edge)*
- **Given** either email
- **When** the user opens its link on the device that asked for it
- **Then** it behaves as before this story

## Copy *(owner, 2026-10-16: "тексти ок")*
| Where | Українська | English |
|---|---|---|
| Hint on «Перевірте пошту» | Відкрийте посилання з листа або введіть код із нього. | Open the link in the email or enter the code from it. |
| Field label | Код із листа | Code from the email |
| Placeholder | 6 цифр | 6 digits |
| Button | Підтвердити | Confirm |
| AC-4 message | Код невірний або застарів. Спробуйте ще раз або надішліть лист повторно. | The code is wrong or has expired. Try again or send the email again. |
| Line in each email, under its button | Або введіть цей код у застосунку: {code} | Or enter this code in the app: {code} |

**Lifetime:** a code and a link live **30 minutes** (owner, 2026-10-16) — what the recovery screen
already tells the reader. Today the local setting is an hour (`otp_expiry = 3600`); the build
sets 1800, and the owner sets the same in the production dashboard.

## Out of scope
- Universal Links — not needed for this (`ADR-025` decision 4).
- Changing the email address — the profile shows it read-only.
- Signing in with a code instead of a password — not asked for (`ADR-015`).

## Dependencies
`ADR-025`. The templates pasted into the production Supabase dashboard (owner), as for `US-048`.

## Open questions
None — the copy and the lifetime were answered 2026-10-16.
