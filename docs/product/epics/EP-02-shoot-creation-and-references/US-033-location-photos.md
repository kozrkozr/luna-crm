# US-033 — A shoot holds several location photos

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to attach more than one photo of the location**,
so that **the crew recognises the place, the entrance and the power sockets, not just the
facade**.

## Context
`US-018` AC-2 allows **one** attachment on a shoot — an image *or* a video. Both shoot-detail
mockups show a «Фото локації» strip: a horizontal row of thumbnails with an add tile, and the
empty state «Додайте фото, щоб команда впізнала місце» [add photos so the team recognises the
place]. That is a collection, so this story amends `US-018` AC-2.

`risks.md` R-5 already notes that v1 hosts files despite the PRD's non-goal; this widens that
surface from one object per shoot to several, and Storage is on the Free tier
(`architecture.md`, Stage 1).

## Acceptance criteria

### AC-1 — Several photos can be attached
- **Given** a shoot creator editing a shoot (`US-018`)
- **When** they add a location photo
- **Then** it joins the shoot's existing location photos rather than replacing one

### AC-2 — The strip is browsable
- **Given** a shoot with more than one location photo
- **When** the creator views the shoot
- **Then** the photos are shown as a horizontally scrollable strip, and tapping one opens it
  full-size

### AC-3 — Empty state invites the first photo
- **Given** a shoot with no location photos
- **When** the creator views the shoot
- **Then** the section is still present and says what photos are for, rather than being hidden

### AC-4 — A photo can be removed
- **Given** a shoot with location photos
- **When** the creator removes one
- **Then** it is gone from the strip and from every link view

### AC-5 — The existing single attachment survives
- **Given** a shoot with an attachment saved under `US-018` AC-2
- **When** this story ships
- **Then** that file is still attached and visible, as the first item in the collection

### AC-6 — Crew and clients see the photos
- **Given** a crew member or client opening their link
- **When** they view the shoot
- **Then** they see the location photos, through signed URLs as today (`ADR-013`)

## Out of scope
- Reordering photos, or choosing a cover — neither mockup shows it.
- Captions.
- Raw or finished photo delivery — still `US-024`/`US-025`, still pasted links (`ADR-008`).

## Dependencies
`US-018` — amends its AC-2. `ADR-013` — the gateway signs the URLs for AC-6.

## Open questions
**What happens to video?** `US-018` AC-2 allows one image **or one video**, and the mockups show
only photos — the section is even called «Фото локації». Three readings, and they differ in what
gets built: the collection is photos-only and video is dropped; the collection accepts both; or a
single video slot survives alongside a photo collection. AC-5 assumes existing files of either
kind keep working, which is true under all three. **Ilona's call.**
