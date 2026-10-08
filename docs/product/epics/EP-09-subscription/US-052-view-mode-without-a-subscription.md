# US-052 — View mode without an active subscription

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As **a registered person without an active trial or subscription**,
I want **to still see my shoots and the shoots I am crew on**,
so that **nothing I made is held hostage, and I can pay when I need to work again**.

## Context
`ADR-023` decisions 4–7. "Without access" means: the paywall was closed without starting a trial,
the trial ended without a subscription, or the subscription lapsed — and no beta access
(`US-055`) is running. Access is decided **on the server and enforced by the database**; hiding
buttons alone is not enough, the same principle as `ADR-013`.

## Acceptance criteria

### AC-1 — What stays visible
- **Given** an account without access
- **Then** it sees its own shoots and the shoots it is crew on (`US-009`), with everything in them,
  read-only

### AC-2 — Create, edit and delete open the paywall
- **Given** an account without access
- **When** it taps any action that creates, edits or deletes a shoot, a crew member, a contact, a
  client, a reference or a file
- **Then** the paywall (`US-051`) opens instead, and nothing is changed

### AC-3 — The database refuses the same writes *(required)*
- **Given** an account without access
- **When** it attempts any of AC-2's writes directly against the backend, bypassing the app
- **Then** the write is refused

### AC-4 — What is still allowed without access
- replying to an invitation to a shoot (accept or decline);
- editing one's own profile, language and currency;
- copying and sharing an **existing** link (owner, 2026-10-08);
- deleting the account (Apple requires it regardless of payment).

### AC-4a — Reminders keep firing
- **Given** a creator without access
- **Then** shoot reminders (`US-041`) for their shoots keep firing (owner, 2026-10-08)

### AC-5 — Links keep working *(required)*
- **Given** a creator without access
- **Then** every link they have shared still opens for its crew member or client, exactly as
  before, and a crew member can still reply through it

### AC-6 — Nothing is deleted *(required)*
- **When** access ends
- **Then** no shoot, contact, client, reference, file or link is removed or altered

### AC-7 — Access regained
- **When** the account starts a trial or a subscription again
- **Then** full access returns at once, with everything as it was

### AC-8 — The web app follows the same access
- **Given** an account without access, in the photographer's web app (`ADR-021`)
- **Then** it is in view mode there too, and a screen in place of the paywall says the subscription
  is bought in the iOS app (owner, 2026-10-08: "напевно екран додамо"; its content is open)

### AC-9 — The view-mode banner
- **Given** an account without access
- **Then** the home screen shows a banner «Режим перегляду · Оформити підписку» under its header,
  and tapping it opens the paywall (owner, 2026-10-08; drawn in `Home.dc.html`, state «Режим
  перегляду»)

## Copy
Owner confirmed, 2026-10-08. Designs: `Home.dc.html` (banner), `Web Subscription Required.dc.html`.

| Ukrainian | English |
|---|---|
| Режим перегляду · Оформити підписку *(AC-9)* | View mode · Subscribe |
| Потрібна підписка *(AC-8, web)* | Subscription required |
| Підписку оформлюють у застосунку Luna Shoots на iPhone. Після оформлення тут відкриється все. | Subscriptions are bought in the Luna Shoots iPhone app. Once you subscribe, everything opens up here. |
| Зрозуміло | Got it |

## Out of scope
- A free tier with limits (`ADR-023`).
- Buying on the web.

## Dependencies
`ADR-023`; spike `S-7` for how access is recorded.

## Open questions
None.
