# US-057 — A desktop layout for the web app

- **Parent epic:** [EP-10 — The photographer's web app](EP-10.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator** on a computer,
I want **the app laid out for a wide screen**,
so that **I see more at once and do not work in a phone-sized strip in the middle of the window**.

## Context
`decisions/ADR-024-*.md` decision 3, replacing `US-040` AC-4. The design is the owner's draft
canvas of desktop screens, drawn 2026-10-15 from the shipped iOS screens: claude.ai artifact
`PBUnw11JVevphXWDeKQ2tj` («Luna Shoots — веб, чернетка»). It is a UX draft — layout, content and
order; components, icons, type and spacing come from the app as built.

## Acceptance criteria

### AC-1 — A sidebar instead of the tab bar
- **Given** the web app in a window **1024 px wide or wider** — the desktop width (Tailwind's `lg`;
  agent's recommendation, owner 2026-10-15)
- **When** any creator screen is shown
- **Then** a sidebar holds what the tab bar holds — «Головна», «Календар», «Контакти»,
  «Статистика» — plus «+ Нова зйомка» and the account's own profile, and the tab bar is not shown

### AC-2 — Every screen uses the width
- **Given** the web app at the desktop width
- **When** any of the design's 20 screens is shown — every creator screen (owner, 2026-10-15)
- **Then** it follows that design — columns, the place of each section and action

### AC-3 — The draft's own additions
- **Given** the web app at the desktop width
- **When** the calendar, «Головна» or the sidebar is shown
- **Then** a calendar day cell shows its shoots' start time and client name, and the sidebar shows
  the «L» mark the sign-in screen already uses — neither of which the iOS app has (owner,
  2026-10-15: "хай залишаються твої пропозиції"). *Corrected 2026-10-16:* the date under the
  greeting on «Головна» was listed here as a third addition; the iOS app already shows it.

### AC-4 — A narrow window gets the phone layout *(edge)*
- **Given** the web app in a window narrower than 1024 px — a phone's browser, or a narrow
  window on a computer
- **When** any screen is shown
- **Then** it is the phone layout, with the tab bar, as in the iOS app

### AC-5 — The iOS app is unchanged *(edge)*
- **Given** the iOS app built after this story
- **When** any screen is shown
- **Then** it looks and behaves as before this story

## Out of scope
- Everything working in the browser — `US-040`.
- New desktop-only features (bulk actions, keyboard shortcuts, a full-screen calendar) — not asked
  for.

## Dependencies
`US-040`. The owner's approval of the design.

## Open questions
None — answered by the owner 2026-10-15: all screens, 1024 px, the draft's additions kept.
