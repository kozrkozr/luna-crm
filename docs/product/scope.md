# Scope — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-23 (revised after two rounds of prototype review — see `03-design/reviews/r01-2026-08-23/notes.md` and `r02-2026-08-23/notes.md`)
- **Derived from:** `prd.md`

## In scope
- Registration with a professional role (photographer, stylist, gaffer, shoot manager, etc.) and an optional social-media/contact field, a profile view, logging back in, and logging out — `prd.md` R-01, R-13, R-14, R-15. Needed so anyone can create a shoot regardless of profession (`decisions/ADR-001-*.md`, `ADR-002-*.md`); login/profile/logout added across two rounds of review since registering alone isn't a full account lifecycle.
- Shoot creation: client contact info and date (location moved to editing) — R-02. The core "one record" premise (`01-discovery/vision.md`).
- References: a pasted link or an image from the phone's gallery — R-03; and, once there are more than fit on one screen, a dedicated "all references" page — R-19.
- Editing a shoot's date and location, with location as its own address+notes section — R-16. Deleting a shoot — R-17. A shoot status (New/Finished) the creator can change — R-18.
- Manual crew entry (name, role, phone or email required, Instagram optional, plus notes that can include an image), no account required — R-04. Cold-start fallback (`decisions/ADR-003-*.md`); phone/email required for later account matching (owner's answer in chat, 2026-08-22).
- One shareable link per crew member, per shoot, including confirm/decline and viewing another crew member's *complete* details (all fields, including notes) — R-05, R-06, R-07, R-20. Replaces re-explaining logistics per person and matches how bookings are confirmed today (`01-discovery/personas.md`; `00-intake/s01-2026-08-20/transcript.md`, lines 155–157). Permission-boundary question resolved by the owner, 2026-08-22; field list resolved round r02.
- The shoot creator removing a crew member from a shoot — R-21. Closes a gap earlier stories assumed but never built.
- Self-registered crew see their own availability sync across shoots — R-08. Deferred-marketplace groundwork without building the marketplace itself (`decisions/ADR-003-*.md`).
- Shoot list **and** calendar, both on the same screen, for the shoot creator — R-09. Confirmed as both, not just a list, in the prototype review.
- Ukrainian-default, English-switchable UI — R-10 (`00-intake/s02-2026-08-22/transcript.md`, lines 396–416).
- A Client can view read-only shoot info via link, view a crew member's details minus notes, and see a raw-files/finished-photos section (placeholder or a pasted external link — not file hosting) — R-11, R-22, R-23, R-24. Confirming attendance was not confirmed and stays out of v1 (see Deferred); reacting to references was tried and removed (see Removed after trial); proposing references was considered and declined (`decisions/ADR-006-*.md`).

## Out of scope
- **Searchable crew directory / marketplace.** No registered crew to search at launch; deferred until self-registration produces a meaningful pool (`decisions/ADR-003-*.md`).
- **Broader beauty industry (e.g. manicure).** Owner explicitly narrowed to shoot participants (`00-intake/s01-2026-08-20/transcript.md`, lines 163–165).
- **Russian-language UI.** Deliberate exclusion, not an oversight (`00-intake/s02-2026-08-22/transcript.md`, lines 412–416).
- **Full production scheduling (stripboards, multi-day planning).** That is StudioBinder's territory, heavier than this product targets (`01-discovery/competitors.md`).

## Deferred
- **Actual file hosting for raw files or finished photos.** v1 only shows a placeholder or a
  pasted external link on the Client view (R-22, R-23) — no upload, no storage
  (`decisions/ADR-008-*.md`, which amends the original deferral in `decisions/ADR-005-*.md`).
  Owner's own sequencing call: «команда/кол-шит, з файлами пізніше розберемось вдруг що»
  [team/call-sheet, we'll figure out the files later if it comes to that]. Brought back (as
  real hosting) once the crew/call-sheet half is in real use.
- **Client confirming attendance.** Part of the original pitch (`00-intake/s02-2026-08-22/transcript.md`, lines 328–342) but not confirmed for v1. Revisit once the view version is in use.

## Removed after trial
- **Client reacting to references (like/dislike).** Was in scope and built into the prototype (`prd.md` R-12, `US-011`); the owner removed it entirely in the second review round (`decisions/ADR-009-*.md`). Not "deferred" — no condition was given for bringing it back.

## Considered and declined
- **Client proposing their own references**, instead of only reacting to ones the shoot creator proposed. Considered alongside like/dislike; declined as more scope than v1 needs (`decisions/ADR-006-*.md`). Not "deferred" in the sense of a planned revisit — no condition was given for bringing it back. (The "reacting" half this was compared against no longer exists either, per above — this entry stands on its own now.)

## Explicitly not pursued
- **Independent market validation.** The drafted survey (`00-intake/photographer-survey-uk.md`) will not be sent — the owner's decision, 2026-08-22. Not "deferred" (no condition for revisiting was given); tracked purely as an accepted risk in `prd.md`.
