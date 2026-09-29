# US-035 — Land on a home screen that says what is next

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to open the app and immediately see what my next shoot is and how to start a new one**,
so that **I do not have to read a whole list to answer the one question I opened the app with**.

## Context
New with the design system adopted in `ADR-017`; specified by its
`home-screen.html` mockup. Until now signing in landed on the shoot list
(`US-004`), which answers "what do I have" rather than "what is next".

This screen takes the `(app)` index. **The shoot list moves to
`/(app)/shoots`** and is reached from here — owner's decision, chat 2026-08-28.
That has two consequences worth stating: signing in no longer shows the list,
and `US-019` AC-1's "it disappears from the list" now means returning to
`/(app)/shoots` after a delete rather than to the index.

It fits this epic because `EP-02`'s goal already includes browsing the shoot
record "list or calendar" — this is a third way in, not a new subject.

**Nothing here is new data.** Every value on the screen is derived from shoots
and crew rows that already exist.

## Acceptance criteria

### AC-1 — Signing in lands here
- **Given** a user who logs in (`US-013`) or registers (`US-001`)
- **When** authentication succeeds
- **Then** they arrive on this screen, not on the shoot list

### AC-2 — The screen greets and dates itself
- **Given** the home screen is open
- **When** it renders
- **Then** it shows a greeting and today's date as a weekday, day and month

### AC-3 — Two ways onward
- **Given** the home screen is open
- **When** the creator taps the primary action
- **Then** the shoot-creation form opens (`US-002`); and a second action opens
  the shoot list and calendar (`US-004`)

### AC-4 — The next shoot is named
- **Given** a creator with at least one shoot dated today or later
- **When** the home screen renders
- **Then** the soonest such shoot is shown with its date, its time range
  (`US-030`), how far away it is, the client's name, its status, how many of its
  crew have confirmed, and its location — and tapping it opens that shoot

### AC-5 — Nothing upcoming
- **Given** a creator whose shoots are all in the past, or who has none
- **When** the home screen renders
- **Then** the next-shoot section is absent entirely, and the rest of the screen
  still works

### AC-6 — Deleted shoots are never "next"
- **Given** a creator whose soonest upcoming shoot has been deleted (`US-019`)
- **When** the home screen renders
- **Then** that shoot is not shown and the one after it is (`ADR-014`)

## Out of scope
- **Notifications.** The mockup's header carries a bell with an unread dot. No
  notification system exists — no table, no read state, no delivery — and the
  owner's decision (chat 2026-08-28) is to render the control inert for now. It
  is drawn, it does nothing, and the dot does not reflect anything. A real
  notifications feature is a separate story, and probably its own epic.
- **The two statistics cards** («Зйомок цього місяця», «Очікують
  підтвердження»). In the mockup; removed at the owner's request, 2026-08-28.
- **A greeting by name.** The mockup reads «Доброго дня, Дарино» — the Ukrainian
  vocative. Owner's decision: greet without a name, so nothing has to decline
  it and no unusual name can be mangled.
- **Varying the greeting by time of day.** The mockup shows one string and
  specifies no others.
- Anything about the client as an entity — that is `EP-06`.

## Dependencies
- `US-013`, `US-001` — AC-1 changes where both land.
- `US-004` — AC-3's second action, now at `/(app)/shoots`.
- `US-030` — AC-4's time range.
- `US-008` — AC-4's confirmation count reads `CrewMember.response`.

## Open questions
**Does the countdown need copy for today and tomorrow?** The mockup shows only
«за 22 дні». A shoot later today would render «за 0 днів», which is wrong in
Ukrainian and wrong in meaning. «Сьогодні» and «Завтра» are the obvious
answers and are **new copy that no story or prototype supplies** — recorded in
the build repository's `docs/redesign-log.md` rather than invented silently.
