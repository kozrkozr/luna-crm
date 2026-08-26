# US-003 — Attach references to a shoot

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to attach a reference to a shoot by pasting a link or picking an image from my
phone's gallery**,
so that **I don't have to hunt through old chats to find them again**.

## Context
References attached here are what crew members see, unfiltered (US-007), and what a client
reacts to (US-011) — this is the single source both later views read from (`prd.md` R-03).
Updated from a plain "add reference" button to a persistent link-input field plus a
gallery-picker icon, per Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`).

## Acceptance criteria

### AC-1 — Reference added via link or gallery image
- **Given** an existing shoot
- **When** the creator either pastes a link into the reference field, or taps the gallery icon
  and picks an image from their phone
- **Then** it appears in that shoot's reference list

### AC-2 — Invalid reference rejected *(required)*
- **Given** the reference input
- **When** an unsupported file type or an invalid link is submitted
- **Then** the app rejects it with a clear message, and the existing reference list is
  unchanged

### AC-3 — Opening a reference
*Added 2026-08-26 (review `r03`), after the owner saw the built story on a device. The
prototype's thumbnails are inert, so nothing had ever specified what tapping one does.*

- **Given** a shoot with references
- **When** the viewer taps a **link** reference
- **Then** it opens in the phone's browser, outside the app
- **When** the viewer taps an **image** reference
- **Then** it opens full-screen, and can be dismissed back to where they were

The behaviour is the same wherever a reference appears, not only on the creator's screen —
`US-021`'s all-references page and the crew and client link views (`US-007`, `US-010`) show
the same references and inherit this. It is written here because this is the story that
renders them first.

## Out of scope
- Tagging a reference to a specific crew role — resolved as not needed: every crew member
  sees every reference on the shoot, no per-role filtering (owner's answer in chat,
  2026-08-22; `prd.md` R-06).
- Client reactions to a reference — separate story (US-011).
- Showing every reference on the shoot's own page once there are more than fit — that's
  `US-021`, the dedicated "all references" page; this story only covers adding one.

## Dependencies
US-002 — a shoot must exist first.

## Open questions
None.
