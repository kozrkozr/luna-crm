# US-048 — Auth emails arrive in the account's language

- **Parent epic:** [EP-01 — Registration and role selection](EP-01.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **photographer who registered in English**,
I want **the emails from the app in English**,
so that **I can confirm my address and recover my password without guessing**.

## Context
`ADR-022` decision 8, owner 2026-10-06. Supabase holds one template per email for the whole
project; the template picks its text with a condition on the language stored in the user's auth
metadata. No send hook.

## Acceptance criteria

### AC-1 — Which emails
- Confirm sign-up (`ADR-019`), reset password, and change email.

### AC-2 — The language
- **Given** an account whose language is English
- **Then** each of these emails is in English; in Ukrainian otherwise
- **Given** an account registered before this story, with no language in its auth metadata
- **Then** Ukrainian

### AC-2a — The texts (owner, 2026-10-06)
**Confirm sign-up** — the Ukrainian is the one approved in review r06 (2026-09-29).

| | UK | EN |
|---|---|---|
| Subject | Підтвердіть реєстрацію в Luna Shoots | Confirm your registration in Luna Shoots |
| Heading | Підтвердіть реєстрацію | Confirm your registration |
| Body | Щоб завершити реєстрацію в Luna Shoots, відкрийте посилання: | To finish registering in Luna Shoots, open the link: |
| Link | Підтвердити пошту | Confirm email |
| Footer | Якщо ви не реєструвались, просто проігноруйте цей лист. | If you didn't register, just ignore this email. |

**Reset password** — the Ukrainian replaces the one set in the dashboard on 2026-09-29.

| | UK | EN |
|---|---|---|
| Subject | Відновлення пароля в Luna Shoots | Reset your Luna Shoots password |
| Heading | Новий пароль | New password |
| Body | Щоб задати новий пароль для Luna Shoots, відкрийте посилання: | To set a new password for Luna Shoots, open the link: |
| Link | Задати новий пароль | Set a new password |
| Footer | Якщо ви не просили змінити пароль, просто проігноруйте цей лист — пароль залишиться тим самим. | If you didn't ask to change your password, just ignore this email — your password stays the same. |

**Change email** — no screen sends it yet (the profile's email is read-only); written now so it
exists in both languages when one does.

| | UK | EN |
|---|---|---|
| Subject | Підтвердіть нову адресу в Luna Shoots | Confirm your new address in Luna Shoots |
| Heading | Підтвердіть зміну пошти | Confirm the change of email |
| Body | Щоб змінити пошту для входу в Luna Shoots з {old} на {new}, відкрийте посилання: | To change your Luna Shoots sign-in email from {old} to {new}, open the link: |
| Link | Підтвердити зміну | Confirm the change |
| Footer | Якщо ви не змінювали пошту, просто проігноруйте цей лист. | If you didn't change your email, just ignore this email. |

### AC-3 — It follows the account
- The language is written at registration (`US-045` AC-3) and again whenever it is changed in the
  profile (`US-015`), so the next email follows the change.

### AC-4 — The subject
- The subject is in the same language as the body, **if** the template's condition works in the
  subject line; otherwise the subject carries both languages. Verified on the dev project first.

### AC-5 — Both projects
- The templates are set on the dev and the prod Supabase projects.

## Out of scope
- Any email beyond AC-1's three.

## Dependencies
`US-045`, `US-015`, `ADR-019`.

## Open questions
None — the texts were confirmed by the owner, chat 2026-10-06.
