# US-006 — Share a per-crew-member link for a shoot

- **Parent epic:** [EP-03 — Crew management and the crew-facing link](EP-03.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to share a link with each crew member for their shoot**,
so that **I don't have to explain the same logistics to each person separately**.

## Context
One link per crew member, per shoot — not one link for the whole crew — so that removing one
person (AC-2) doesn't affect anyone else's access (`prd.md` R-05). Where this link lives on
screen changed in Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`): instead of its own "links" section, each
person's link now sits with them in the Crew block, as a copy icon next to their entry. That's
a layout change for `03-design/ux-notes.md` and the prototype, not a change to this story's
acceptance criteria — the capability (a link exists, is shareable, and dies when the person is
removed) is the same either way.

## Acceptance criteria

### AC-1 — Link generated for a crew member
- **Given** a crew member added to a shoot (US-005)
- **When** the creator generates their link
- **Then** a unique link tied to that crew member and that shoot is produced and ready to share

### AC-2 — Removed crew member's link stops working *(required)*
- **Given** a crew member who was removed from the shoot
- **When** someone opens their previously shared link
- **Then** access is denied, not stale shoot data

## Out of scope
- The delivery mechanism (SMS, manual copy-paste, etc.) — not specified in `prd.md`.
- Time-based link expiration (e.g., after the shoot date passes) — resolved as not needed for
  v1: a link only stops working if the person is removed (AC-2), never on a timer (owner's
  answer in chat, 2026-08-22).

## Dependencies
US-005 — a crew member must exist on the shoot before a link can be generated for them.

## Open questions
None.
