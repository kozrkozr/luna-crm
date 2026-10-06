# Auth email templates (US-048)

The three emails Supabase sends, each in both languages — the template picks by
`.Data.language`, which the app writes into the user's auth metadata at
registration (`register.ts`) and on every language change and app start
(`LanguageProvider`). An account with no value gets Ukrainian.

**The hosted projects do not read these files.** Paste each into the dashboard
of **both** projects — dev `lakqnnpoclwyffaxinhi`, prod `hjijvyensphkwyystgyq` —
under Authentication → Emails. `supabase/config.toml` points the local stack at
them.

| Dashboard template | File | Subject |
|---|---|---|
| Confirm signup | `confirmation.html` | `{{ if eq .Data.language "en" }}Confirm your registration in Luna Shoots{{ else }}Підтвердіть реєстрацію в Luna Shoots{{ end }}` |
| Reset password | `recovery.html` | `{{ if eq .Data.language "en" }}Reset your Luna Shoots password{{ else }}Відновлення пароля в Luna Shoots{{ end }}` |
| Change email address | `email_change.html` | `{{ if eq .Data.language "en" }}Confirm your new address in Luna Shoots{{ else }}Підтвердіть нову адресу в Luna Shoots{{ end }}` |

**The subject's condition is unverified** (US-048 AC-4). If an email arrives
with the raw `{{ if … }}` in its subject, the subject line does not take
templates: use the bilingual fallback instead —
`Підтвердіть реєстрацію · Confirm your registration`, and so on.
