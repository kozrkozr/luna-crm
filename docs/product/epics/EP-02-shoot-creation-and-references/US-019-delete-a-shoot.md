# US-019 — Delete a shoot

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to delete a shoot**,
so that **I can remove one I created by mistake or no longer need**.

## Context
Added from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`) — there was no way to remove a shoot before.

## Acceptance criteria

### AC-1 — Deleting removes the shoot everywhere
- **Given** an existing shoot
- **When** the creator deletes it (with a confirmation step)
- **Then** it disappears from the shoot list/calendar, and every crew or client link for that
  shoot stops working (same "no longer valid" state as a removed crew member, `US-006` AC-2)

### AC-2 — Deletion requires confirmation *(required)*
- **Given** the creator taps delete
- **When** they have not yet confirmed
- **Then** nothing is deleted — an accidental tap must not destroy a shoot without a
  confirmation step

## Out of scope
- Undoing a delete (trash/restore) — not requested; deletion is final in v1.
- Deleting a shoot that has crew who already confirmed — no special handling requested; it
  deletes the same as any other shoot.

## Dependencies
US-002 — a shoot must exist before it can be deleted.

## Open questions
None beyond what's tracked in `02-product/open-questions.md`.
