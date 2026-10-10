# US-051 — Start a free trial on the paywall after registration

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As **anyone who has just registered** — a shoot creator or a crew member,
I want **to be offered 14 days free before paying $4.99 a month**,
so that **I can try Luna with my real shoots before deciding to pay**.

## Context
`ADR-023` decisions 1–3. The trial is Apple's introductory offer: it starts when the person
confirms it on Apple's own sheet, and Apple renews it into the paid subscription unless it is
cancelled in the Apple ID's settings. One trial per Apple ID. iOS only — buying on the web is out
of scope (`EP-09`).

## Acceptance criteria

### AC-1 — The paywall follows registration
- **Given** a person who has just completed registration (`US-001`, with the email confirmed —
  `ADR-019`)
- **When** they first enter the app
- **Then** the paywall is shown full screen, as the first thing the app shows (owner, 2026-10-08)

### AC-2 — What the paywall shows
- **Then** it shows: the trial length (14 days), the price after it ($4.99 a month, in the
  storefront's currency as Apple gives it), that it renews monthly until cancelled, a button that
  starts the trial, «Відновити покупки» / "Restore purchases", links to the terms and the privacy
  policy (in the app's language — `US-049`), and a way to close it
- **And** the price is shown in a plan card, at least as prominent as the trial, and the screen
  shows **no zero price** («0 $») — the billed amount must be the clearest price on the screen
  (App Store Review Guideline 3.1.2; owner, 2026-10-09)
- **And** the automatic monthly renewal is stated in words under the plan card
- **And** the plan card is a selectable row, so a later plan (`ADR-023` decision 9) is a second row
- **And** it lists four benefits, worded as drawn (owner, 2026-10-08 — kept over livelier
  alternatives): «Зйомки, команда й клієнти без обмежень» · «Посилання для команди й клієнтів — без
  застосунку і реєстрації» · «Нагадування про зйомки» · «Терміни передачі матеріалів»
- **And** it is in the app's language (`US-045`)
- **Design:** `Paywall copy.dc.html` (Claude Design, 2026-10-09) — **the final one**; it replaces
  `Paywall.dc.html` (2026-10-08), which is kept only as history

### AC-3 — Starting the trial
- **Given** the paywall
- **When** the person taps the trial button and confirms on Apple's sheet
- **Then** the account has full access at once, and the paywall closes

### AC-4 — Apple's sheet cancelled *(required)*
- **When** the person dismisses Apple's sheet without confirming
- **Then** the paywall stays open and nothing changes

### AC-5 — The paywall closed *(required)*
- **When** the person closes the paywall
- **Then** the account is in view mode (`US-052`), and the paywall is not shown again on its own —
  only from a create, edit or delete action (`US-052`) or from the profile (`US-053`)

### AC-6 — An Apple ID that has used its trial *(required)*
- **Given** an Apple ID Apple no longer grants the introductory offer to
- **Then** the paywall offers the subscription at $4.99 a month with no trial, and says so

### AC-7 — The purchase fails or waits *(required)*
- **When** Apple reports a failed purchase, or one awaiting approval (Ask to Buy)
- **Then** the account stays as it was, and the person is told the purchase did not complete

### AC-8 — Restore
- **Given** a Luna account that has a subscription, on a new phone or after reinstalling
- **When** the person taps «Відновити покупки»
- **Then** the account's access is restored

### AC-9 — Restore finds nothing, or fails *(owner, 2026-10-10)*
- **When** Apple finds no active subscription on the Apple ID
- **Then** the paywall says so («Активних підписок не знайдено.») and stays open
- **When** the restore fails (network, Apple)
- **Then** the paywall says so («Не вдалося відновити покупки. Спробуйте ще раз.») and stays open

### AC-10 — The Apple ID's subscription belongs to another Luna account *(owner, 2026-10-10)*
- **Given** a subscription bought on this Apple ID by a different Luna account (`ADR-023` decision
  10 — a subscription belongs to the Luna account, not the Apple ID)
- **When** the person restores or buys on this account
- **Then** the subscription stays with the account that bought it, and the paywall says so and
  suggests signing in to that account

## Copy
Owner confirmed, 2026-10-08, revised for the 2026-10-09 design. `{price}` is the localized price string Apple returns for the person's storefront — never a hard-coded amount (Guideline 3.1.2); «4,99 $» in the designs is an example. «Luna Shoots» under the logo is the name, not translated.

| Ukrainian | English |
|---|---|
| Відновити *(top left — restore, AC-8)* | Restore |
| 14 днів безкоштовно | 14 days free |
| Усі зйомки, команда й клієнти в одному місці. | All your shoots, crew and clients in one place. |
| Зйомки, команда й клієнти без обмежень | Unlimited shoots, crew and clients |
| Посилання для команди й клієнтів — без застосунку і реєстрації | Links for crew and clients — no app, no sign-up |
| Нагадування про зйомки | Shoot reminders |
| Терміни передачі матеріалів | Delivery deadlines |
| **Щомісяця:** {price} / місяць *(plan card)* | **Monthly:** {price} / month |
| Перші 14 днів — безкоштовно *(plan card, trial only)* | First 14 days free |
| Продовжується автоматично щомісяця. Скасувати можна будь-коли в налаштуваннях Apple. *(trial)* | Renews automatically every month. Cancel anytime in your Apple settings. |
| Спробувати безкоштовно | Try it free |
| Підписка Luna Shoots *(AC-6 title)* | Luna Shoots subscription |
| Щомісячне продовження. Скасувати можна будь-коли в налаштуваннях Apple. *(AC-6)* | Renews monthly. Cancel anytime in your Apple settings. |
| Оформити — {price} на місяць *(AC-6 button)* | Subscribe — {price} a month |
| Покупку не завершено. Спробуйте ще раз. *(AC-7)* | The purchase didn't go through. Please try again. |
| Активних підписок не знайдено. *(AC-9)* | No active subscription found. |
| Не вдалося відновити покупки. Спробуйте ще раз. *(AC-9)* | Couldn't restore purchases. Please try again. |
| Ця підписка вже привʼязана до іншого акаунта Luna. Увійдіть у нього, щоб користуватися. *(AC-10)* | This subscription belongs to another Luna account. Sign in to that account to use it. |
| Умови · Політика конфіденційності | Terms · Privacy Policy |

## Out of scope
- Buying on the web (`EP-09`).
- A yearly plan (`ADR-023`).

## Dependencies
`US-052` (the access record and view mode), spike `S-7`, the owner's App Store Connect product.

## Open questions
None.
