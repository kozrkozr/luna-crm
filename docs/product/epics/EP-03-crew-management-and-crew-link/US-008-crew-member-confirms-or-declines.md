# US-008 — Crew member confirms or declines via their link

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **crew member**,
I want **to confirm or decline my booking through my link**,
so that **the shoot creator knows who's actually coming without chasing everyone
individually**.

## Context
Matches how bookings are confirmed today (`00-intake/s01-2026-08-20/transcript.md`, lines
155–157). This was the tension flagged in `01-discovery/challenge.md` between "read-only" and
"confirm/decline" — resolved by the owner in favor of allowing this action (`prd.md` R-07).

## Acceptance criteria

### AC-1 — Confirm updates status visibly to the creator
- **Given** a crew member viewing their shoot via a valid link
- **When** they tap confirm
- **Then** their status changes to confirmed, and the shoot creator can see it on the shoot

### AC-2 — Action rejected on an invalid link *(required)*
- **Given** an invalid or expired link
- **When** someone attempts to confirm or decline through it
- **Then** the action is rejected and no status change occurs

## Out of scope
- Changing a response after it's submitted (confirmed → declined or back) — explicitly not
  supported in v1 (owner's answer in chat, 2026-08-22). A submitted response is final.
- Automated reminders to crew members who haven't responded — not requested.

## Dependencies
US-007 — the crew member must be able to view the shoot before confirming/declining on it.

## Open questions
None.
