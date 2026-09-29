# US-031 — Warn when a shoot follows too soon after the previous one

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to be warned when I have booked two shoots almost back to back**,
so that **I notice the squeeze while I can still move something**.

## Context
Specified by the `calendar-ux-variants` mockup, which marks such a row with a warning outline and
the tag «Менше години після попередньої» [less than an hour after the previous one].

**The one-hour threshold comes from the mockup, not from Ilona.** No story, PRD requirement or
review names it. The owner accepted it as drawn (chat, 2026-08-28); it is recorded here so that
it is a decision on the record rather than a number someone found in CSS.

This warns. It never blocks — nothing prevents booking two shoots an hour apart, or overlapping
ones.

## Acceptance criteria

### AC-1 — Warning shown on the later shoot
- **Given** two of the creator's shoots on the same day
- **When** the later one starts less than one hour after the earlier one ends
- **Then** the later shoot's row is visibly marked as a conflict and carries a tag saying it
  follows less than an hour after the previous shoot

### AC-2 — Never blocking
- **Given** a shoot that would trigger AC-1
- **When** the creator saves it
- **Then** it saves normally; the warning is informational only

### AC-3 — Only real shoots count
- **Given** an earlier shoot that has been soft-deleted (`US-019`)
- **When** the gap to the next shoot is evaluated
- **Then** the deleted shoot is ignored, and no warning is shown on its account (`ADR-014`)

### AC-4 — Shoots without times are ignored
- **Given** a shoot predating `US-030` that has no times
- **When** the gap is evaluated
- **Then** it takes part in no comparison and triggers no warning

## Out of scope
- Warning about overlapping shoots, or about travel time between locations — the mockup covers
  neither.
- Any warning at save time. The mockup shows this only on the list row.
- A configurable threshold.

## Dependencies
`US-030` — there is nothing to compare without times. `US-004` — the row this appears on.

## Open questions
None. The threshold is decided above; that it was decided rather than specified is the point of
the Context section.
