# US-053 — See and manage the subscription in the profile

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As **a registered person**,
I want **one place that tells me whether I am on a trial, subscribed or not, and until when**,
so that **I am never surprised by a charge or by losing the ability to edit**.

## Context
`ADR-023`. A screen reached from the profile, like «Валюта» (`US-047`) and «Сповіщення»
(`US-041`). Cancelling is Apple's, in the Apple ID's settings — the app links there, it does not
cancel itself.

## Acceptance criteria

### AC-1 — The status
- **Then** the screen shows one of: the free trial and the date it ends; an active subscription and
  its next renewal date; a subscription that will not renew and the date access ends — which is
  also how `US-055`'s beta access is shown, never named (owner, 2026-10-10); or no access

### AC-2 — Manage
- **Given** a trial or an active subscription
- **When** the person taps manage
- **Then** iOS's subscription settings for Luna open

### AC-3 — Subscribe
- **Given** no access, or beta access (`US-055` AC-4 — owner, 2026-10-08)
- **When** the person taps subscribe
- **Then** the paywall opens (`US-051`)

### AC-4 — Restore
- **Then** «Відновити покупки» / "Restore purchases" is on the screen and behaves as `US-051` AC-8

### AC-5 — A cancelled subscription *(required)*
- **Given** a trial or subscription cancelled in Apple's settings but not yet ended
- **Then** the screen says it will not renew and gives the date access ends

### AC-6 — Deleting the account with a running subscription *(required)*
- **Given** a trial or subscription that will renew
- **When** the person starts deleting the account
- **Then** they are warned that Apple keeps charging until the subscription is cancelled in the
  Apple ID's settings, with a way to open those settings (owner, 2026-10-08)

## Copy
Owner confirmed, 2026-10-08. `{price}` is the localized price string Apple returns for the person's storefront — never a hard-coded amount (Guideline 3.1.2); «4,99 $» in the designs is an example. Dates follow the app's language. Designs: `Subscription.dc.html`, `Edit Profile.dc.html` (AC-6).

| Ukrainian | English |
|---|---|
| Підписка *(screen title, profile row)* | Subscription |
| Пробний період / Активна / Не продовжиться / Неактивна *(status)* | Free trial / Active / Won't renew / Inactive |
| Безкоштовно до {date} | Free until {date} |
| Потім {price} на місяць | Then {price} a month |
| Наступне списання {date} · {price} | Next charge {date} · {price} |
| Доступ до {date} | Access until {date} |
| Режим перегляду — створювати й редагувати можна з підпискою | View mode — subscribe to create and edit |
| Керувати підпискою | Manage subscription |
| Оформити підписку | Subscribe |
| Відновити покупки | Restore purchases |
| Підписка не скасується сама *(AC-6)* | Your subscription won't cancel itself |
| Видалення акаунта не зупиняє оплату. Скасуйте підписку в налаштуваннях Apple, інакше списання продовжаться. | Deleting your account doesn't stop payments. Cancel the subscription in your Apple settings, or you'll keep being charged. |
| Відкрити налаштування Apple / Все одно видалити / Скасувати | Open Apple settings / Delete anyway / Cancel |

## Dependencies
`US-051`, `US-052`.

## Open questions
None.
