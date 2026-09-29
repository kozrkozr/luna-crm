# US-032 — References are grouped into categories

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **references grouped by what they are for — light, poses, styling**,
so that **a gaffer can find the lighting references without scrolling past forty outfit photos**.

## Context
Both shoot-detail mockups behind `ADR-017` show the references section split into named groups,
each with its own counter, add tile and empty state («Ще немає референсів»). Today a `Reference`
has only `kind` (`link` or `image`) and no grouping (`data-model.md`).

**This does not reintroduce per-role filtering.** `open-questions.md` item 5 settled that every
crew member sees every reference, with no per-person tagging. A category is a label on the
reference, not a rule about who may see it — everyone still sees all of them, just sorted.

**The link views keep a flat list.** Neither has a mockup, and the owner's instruction for
unmocked screens is to preserve current UX (`ADR-017` open question 2), so grouping is
owner-side only until a story says otherwise.

## Acceptance criteria

### AC-1 — References appear under their category
- **Given** a shoot with references in more than one category
- **When** the creator views the shoot's references
- **Then** they are grouped under category headings, each showing how many it holds

### AC-2 — A category is chosen when adding
- **Given** the creator is adding a reference (`US-003`)
- **When** they add it
- **Then** they choose which category it belongs to

### AC-3 — Empty categories say so
- **Given** a shoot where one category has no references
- **When** the creator views the section
- **Then** that category is still shown, stating it is empty rather than being hidden

### AC-4 — Existing references are not lost
- **Given** references added before this story
- **When** the shoot is viewed
- **Then** every one of them is still visible and reachable

### AC-5 — The link views are unchanged
- **Given** a crew member or client opening their link
- **When** they view the shoot's references
- **Then** they see every reference exactly as they do today, ungrouped

## Out of scope
- Per-role or per-person visibility (`open-questions.md` item 5 — settled, no filtering).
- Grouping in the link views (AC-5).
- Moving a reference between categories after adding — not shown in either mockup.

## Dependencies
`US-003` — adding a reference. `US-021` — the dedicated references page shows the same grouping.

## Open questions
**Is the category set fixed or user-defined?** Both mockups show exactly three — «Світло»,
«Пози», «Стиль» — with no add-category affordance, which reads as a fixed set, but a photographer
shooting interiors may want different ones and nothing states the intent. AC-2 is implementable
either way; the answer decides whether a category is an enum or a row. **Ilona's call** — added
to `open-questions.md` if it is not answered before this story is built.
