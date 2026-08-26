# US-027 — Share the client's link for a shoot

- **Parent epic:** [EP-04 — Client view](EP-04.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to share a link with my client for their shoot**,
so that **they can see what's planned without me answering the same questions by message**.

## Context
Added 2026-08-26 (review `r05`), after the build reached `US-010` and found nothing that
creates the link it opens. `data-model.md` has modelled one client link per shoot since
04-tech, and `US-010` covers the client opening it — but no story ever let the creator make
one. The gap was raised from the build rather than found here.

The prototype offers only «Переглянути як клієнт (демо)», a demo affordance for jumping into
the client view, not a share action. It is not the design for this.

This is the client's counterpart to `US-006`, and deliberately parallel to it: one link per
shoot rather than per person, because the client is a field on the shoot and never an account
(`US-010`). Where it sits on screen was decided with the owner: a **«Клієнт» row** on the shoot,
carrying the client's name and contact with a copy control beside them — the same shape as a
crew member's row, so the link is next to whoever it belongs to.

## Acceptance criteria

### AC-1 — A client link exists and can be shared
- **Given** a shoot
- **When** the creator copies the client link
- **Then** a link unique to that shoot is produced and ready to share, and it opens `US-010`'s
  client view

### AC-2 — One link per shoot, and it is stable *(required)*
- **Given** a shoot whose client link has already been shared
- **When** the creator copies it again
- **Then** they get the same link — copying does not replace a link the client may already
  hold, and a shoot never has two client links

### AC-3 — The shoot's client is shown with it
- **Given** the shoot
- **When** the creator looks at it
- **Then** the client's name and contact are visible — the two fields `US-002` collects and no
  screen currently shows

## Out of scope
- The delivery mechanism (SMS, messenger, email) — unspecified, as in `US-006`.
- Revoking a client link on its own. A client link stops working when the shoot is deleted
  (`US-019`), and nothing else revokes it — `open-questions.md` item 7 settled that there is no
  expiry.
- Editing the client's name or contact from this row — `US-018`'s Out of scope already
  excludes editing client contact info, and this story does not reopen it.

## Dependencies
US-002 — a shoot must exist, and it is where the client's name and contact are captured.

## Open questions
None.
