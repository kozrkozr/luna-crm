# US-026 — Client views a crew member's details (no notes)

- **Parent epic:** [EP-04 — Client view](EP-04.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **client**,
I want **to click on a crew member from my shoot's team and see their details — everything
except their notes**,
so that **I know who's involved in my shoot beyond just a name and role**.

## Context
Added from Ilona's second review round (`03-design/reviews/r02-2026-08-23/notes.md`),
reversing the earlier decision that crew details were crew-only (`US-023`). Deliberately
narrower than `US-023`: notes are left out for the client specifically, everything else (name,
role, contact, Instagram) is included.

## Acceptance criteria

### AC-1 — Clicking a crew member shows their details minus notes
- **Given** a client viewing a shoot via their link (`US-010`)
- **When** they click on a crew member in the team list
- **Then** they see that person's name, role, contact, and Instagram (if given) — with no
  notes field shown at all, not even an empty one

### AC-2 — Unreachable on an invalid link *(required)*
- **Given** an invalid or expired client link
- **When** someone tries to reach a crew member's details through it
- **Then** the action is rejected, same as any other data behind that link (`US-010` AC-2)

## Out of scope
- The crew member's notes — deliberately excluded; that's the one difference from `US-023`.
- Editing anything here — view-only, same as every other client-facing screen.

## Dependencies
US-010 — reached from the client's shoot view. US-005 — crew must exist to have details.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
