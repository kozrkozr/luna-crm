# PRD — Luna CRM (working name)

- **Subproject:** 001-luna-crm
- **Version:** v1 / 2026-08-23, r02 (revised after two rounds of prototype review)
- **Derived from:** `01-discovery/vision.md`, `personas.md`, `glossary.md`, `decisions/ADR-004-*.md`, `decisions/ADR-005-*.md`, `03-design/reviews/r01-2026-08-23/notes.md`, `03-design/reviews/r02-2026-08-23/notes.md`
- **Status:** gated go — 02-product, 02-product backlog, 03-design (2026-08-25), 04-tech (2026-08-25). Revised post-prototype twice; auth credential specified 2026-08-25 (`decisions/ADR-015-*.md`)

## Summary
v1 gives a solo photographer one record per shoot — client contact info, references, crew, and
now also editing, deletion, and a status (New/Finished) — so she can add her team, share
logistics once instead of repeating them, and track who's confirmed, instead of coordinating
over Instagram, Telegram, and Notion. Crew confirm or decline via their own link and can view
each other's full details; the shoot creator can remove crew. A registered user's profile now
also carries a social-media/contact field. A Client can view read-only shoot info — including
crew details minus their notes — and see a raw-files/finished-photos section that is either a
placeholder or a link the creator pastes in — not actual in-app file hosting, which stays
deferred (`decisions/ADR-008-*.md` amends `ADR-005-*.md` on this point). The Client can no
longer like/dislike references — that capability was removed after a second round of review
(`decisions/ADR-009-*.md`, superseding part of `ADR-006-*.md`). This is the crew/call-sheet
half of the product, plus a minimal Client view. Revised 2026-08-23 after Ilona reviewed the
phase-03 prototype twice — see `03-design/reviews/r01-2026-08-23/` and `r02-2026-08-23/`.

## Users
- **Solo Shoot Owner** (primary) — `01-discovery/personas.md`. Creates and owns shoots
  ("shoot creator", `decisions/ADR-001-*.md`), adds crew, shares logistics.
- **Invited Crew Member** (secondary) — `01-discovery/personas.md`. Makeup artist, stylist,
  gaffer, etc., added to a shoot by name/phone, reachable by link without an account.
- **Client** (limited) — `01-discovery/personas.md`, "Also interacts with the product". Can
  view shoot info, including crew details minus their notes (R-11, R-24). Cannot react to
  references anymore — removed after a second review round (`decisions/ADR-009-*.md`) — and
  cannot propose their own references either (considered and declined,
  `decisions/ADR-006-*.md`). Confirming attendance, named in earlier sessions
  (`00-intake/s02-2026-08-22/transcript.md`, lines 328–342), was **not** confirmed as in v1 —
  treat it as still out until the owner says otherwise.
- **Not served in v1:** photographers wanting a searchable crew directory
  (`decisions/ADR-003-*.md`), and any profession using the app for their *own* bookings rather
  than as invited crew (`decisions/ADR-002-*.md`).

*Updated 2026-08-23, from Ilona's review of the phase-03 prototype
(`03-design/reviews/r01-2026-08-23/notes.md`): Invited Crew Member can now also view another
crew member's **complete** details, including notes, from the crew-facing link view — the
Client gets the same view minus notes (R-20, R-24); the Solo Shoot Owner can now edit, delete,
and change a shoot's status, and remove a crew member (R-16–R-18, R-21). Updated again
(`r02-2026-08-23/notes.md`): the Client's reference reactions were removed (R-12 retired); a
registered user's profile gained a social-media field (R-01, R-14).*

## Goals
- Reduce the time a Solo Shoot Owner spends preparing and organizing a shoot, by holding
  client info, references, and crew in one record instead of five scattered tools.
- Give each Invited Crew Member one consistent place to find what they need for a shoot,
  instead of asking the photographer directly, mid-shoot or otherwise.

## Non-goals
- ~~**Actual file hosting/upload** for raw files or finished photos~~ — **undeferred 2026-10-03**
  by `decisions/ADR-020-*.md` (`EP-07`; proposed `R-27`). The text below is the 2026-08-23
  position, kept as history: still deferred
  (`decisions/ADR-005-*.md`). What's new in v1 is a placeholder section, or a pasted external
  link (e.g. to a file-sharing service), on the Client view — not file storage
  (`decisions/ADR-008-*.md`).
- A searchable crew directory with visible availability — deferred (`decisions/ADR-003-*.md`).
- Serving the broader beauty industry (e.g. manicure) — excluded
  (`00-intake/s01-2026-08-20/transcript.md`, lines 163–165).
- Full production scheduling (stripboards, multi-day planning) — out of scope
  (`01-discovery/competitors.md`).
- Russian-language UI — deliberate exclusion (`00-intake/s02-2026-08-22/transcript.md`, lines
  412–416).

## Scope
See `scope.md` for the full in/out/deferred breakdown with reasons. Summary:
### In scope
- Registration with a professional role and an optional social-media field, profile view,
  logout, shoot creation/editing/deletion/status, references (link or gallery image), crew
  management (including notes, removal, and crew viewing each other's full details), and
  crew-facing access via link, including confirm/decline. A Client can view read-only shoot
  info, view crew details minus notes, and see a raw-files/finished-photos section (placeholder
  or pasted link only). The Client does **not** react to references (removed, see Deferred).
### Out of scope
- Searchable crew directory/marketplace; broader beauty-industry support; Russian UI; full
  production scheduling.
### Deferred
- ~~Actual file hosting for raw/finished photos~~ — undeferred 2026-10-03
  (`decisions/ADR-020-*.md`). Client confirming attendance (only "view info" and viewing crew
  details minus notes were confirmed for v1 — see Users).

### Removed after trial
- **Client reacting to references (like/dislike).** Was in scope (R-12, `US-011`), tried in the
  prototype, then explicitly removed by the owner in a second review round — not "deferred"
  (no condition to bring it back was given). See `decisions/ADR-009-*.md`.

## Requirements
| ID | Requirement | Persona need it serves | Priority |
|---|---|---|---|
| R-01 | A user registers and selects a professional role (photographer, stylist, gaffer, shoot manager, etc.), with an optional social-media/contact field | Solo Shoot Owner — v1 is scoped to photographers, but the role field is the mechanism (`decisions/ADR-002-*.md`); social field added, owner's review r02, 2026-08-23 | must |
| R-02 | A shoot creator creates a shoot with client contact info and date. **Location moved to editing (R-16), removed from creation** — owner's review, 2026-08-23 | Solo Shoot Owner — one record instead of scattered chats (`personas.md`) | must |
| R-03 | A shoot creator attaches references to a shoot: **either a pasted link, or an image picked from the phone's gallery** — updated from a plain "add reference" button, owner's review, 2026-08-23 | Solo Shoot Owner — replaces hunting through past chats for references (`personas.md`) | must |
| R-04 | A shoot creator adds crew members to a shoot manually (name, role, phone or email required, Instagram optional, **and a notes field that can include an image**, owner's review, 2026-08-23), with no account required | Solo Shoot Owner + Invited Crew Member — matches how she already works (`decisions/ADR-003-*.md`); phone/email required so the person can later be matched to a self-registered account (owner's answer in chat, 2026-08-22) | must |
| R-05 | A shoot creator shares one link per crew member for that shoot | Solo Shoot Owner — replaces re-explaining logistics to each person separately (`personas.md`) | must |
| R-06 | A crew member opens their link and sees the shoot's date, location, all of the shoot's references (shared, not filtered by role), and who else is on the crew | Invited Crew Member — one consistent source instead of repeated informal answers (`personas.md`); no per-role filtering, owner's answer in chat, 2026-08-22 | must |
| R-07 | A crew member can confirm or decline the booking through their link | Invited Crew Member — matches how bookings are confirmed today (`00-intake/s01-2026-08-20/transcript.md`, lines 155–157); permission-boundary question resolved, owner's answer in chat, 2026-08-22 | must |
| R-08 | A crew member who self-registers sees their own availability sync automatically across every shoot they're added to | Invited Crew Member — a single view of their own commitments (`personas.md`) | should |
| R-09 | A Solo Shoot Owner sees all her shoots in a list, with a calendar shown on the same screen (below the "new shoot" action) — calendar confirmed, not just a list, owner's review, 2026-08-23 | Solo Shoot Owner — one record instead of scattered chats (`personas.md`) | must |
| R-10 | UI is in Ukrainian by default, switchable to English | Sourced constraint, not a persona pain (`00-intake/s02-2026-08-22/transcript.md`, lines 396–416) | must |
| R-11 | A Client can open a link and view read-only info about the shoot | Client — `01-discovery/personas.md`, "Also interacts with the product"; owner's answer in chat, 2026-08-22 | must |
| R-12 | ~~A Client can like/dislike each reference the shoot creator proposed~~ — **retired 2026-08-23**, see `US-011` and `decisions/ADR-009-*.md` | Client — was owner's answer in chat, 2026-08-22; `decisions/ADR-006-*.md`. Removed after trial in a second review round. | retired |
| R-13 | A registered user can log in to their existing account | Solo Shoot Owner + Invited Crew Member — implied by R-01: registering is meaningless without a way to come back. Missing from the original requirements list; added when splitting `EP-01`'s backlog into stories (`US-013`) | must |
| R-14 | A registered user can view their own profile (name, contact, role, and social-media/contact field) | Solo Shoot Owner + Invited Crew Member — owner's review, 2026-08-23 (`US-016`); social field added in review round r02 | must |
| R-15 | A registered user can log out | Solo Shoot Owner + Invited Crew Member — the counterpart to R-13, owner's review, 2026-08-23 (`US-017`) | must |
| R-16 | A shoot creator can edit a shoot's date and location; location is its own section with an address plus notes (text, and optionally an image or video, e.g. directions) | Solo Shoot Owner — owner's review, 2026-08-23 (`US-018`); location was removed from R-02's creation step specifically so it's set here | must |
| R-17 | A shoot creator can delete a shoot | Solo Shoot Owner — owner's review, 2026-08-23 (`US-019`) | must |
| R-18 | A shoot has a status — New or Finished — that the creator can change; a new shoot defaults to New | Solo Shoot Owner — owner's review, 2026-08-23 (`US-020`) | must |
| R-19 | Where there are more references than fit on a shoot's page, the rest are viewable on a dedicated "all references" page | Solo Shoot Owner + Invited Crew Member + Client — applies wherever references are shown, owner's review, 2026-08-23 (`US-021`) | should |
| R-20 | A crew member can view another crew member's *complete* details from the crew-facing link view — every field from the "add crew member" form (name, role, contact, Instagram, notes) | Invited Crew Member — owner's review, 2026-08-23 (`US-023`); field list resolved (all fields) in review round r02 | must |
| R-21 | A shoot creator can remove a crew member from a shoot | Solo Shoot Owner — owner's review, 2026-08-23 (`US-022`); closes a gap `US-006` already assumed (a removed crew member's link stops working) but never had a story for | must |
| R-22 | A Client sees a raw-files section on their shoot view: a placeholder ("in development") until the shoot creator pastes in an external link (e.g. to a file-sharing service) — not actual file hosting | Client — owner's review, 2026-08-23 (`US-024`); amends `decisions/ADR-005-*.md`, see `decisions/ADR-008-*.md` | must |
| R-23 | A Client sees a finished-photos section on their shoot view, same pattern as R-22 | Client — owner's review, 2026-08-23 (`US-025`); see `decisions/ADR-008-*.md` | must |
| R-24 | A Client can view a crew member's details — every field except notes | Client — owner's review, round r02, 2026-08-23 (`US-026`); reverses the r01 decision that this was crew-only (`EP-04.md`, Out of scope, now updated) | must |

## User journeys
1. Solo Shoot Owner creates a shoot, adds references, adds three crew members by phone number,
   and sends each their link — done once, not repeated per person (R-02 through R-05).
2. An Invited Crew Member opens their link on the day of the shoot to check the location and
   their reference, without installing anything or creating an account (R-06).
3. A self-registered crew member checks their own schedule across shoots booked by different
   photographers (R-08) — the only journey that depends on a "should," not a "must."

## Success metrics
| Metric | Target | How measured |
|---|---|---|
| Less time spent preparing/organizing a shoot and on client communication (`01-discovery/vision.md`, "Success signals") | No numeric target — judged qualitatively | Ilona's own experience using the app, plus feedback from early/free users (owner's answer in chat, 2026-08-22) |

No number or fixed measurement method was set, by the owner's own choice. Note the overlap
with `01-discovery/challenge.md`'s point D: the people judging success (Ilona, plus users she
recruits) are the same non-independent group already flagged there — this makes "is it
working" a judgment call by interested parties, not a separate risk, just the same one
resurfacing here.

## Constraints and dependencies
- Platform: iOS app plus web/browser access, so people without the app installed can still
  use a link (`00-intake/s01-2026-08-20/transcript.md`, lines 20–26).
- One-person build (Vitalii); Ilona is domain source, co-owner, and the only distribution
  channel identified so far (`00-intake/s02-2026-08-22/transcript.md`, lines 125–131, 236–264).
- Target price: fixed monthly subscription, $5/month without file-sharing
  (owner's answer in chat, 2026-08-22) — the file-sharing-included $10 tier does not apply to
  v1, since file delivery is deferred. **2026-10-03:** file delivery is undeferred
  (`ADR-020`); the price is open again — 200 GB for $10 is a working assumption, and no payment
  is built yet.
- Client and crew permission boundaries are resolved (see Requirements) — no longer a
  dependency blocking 03-design.

## Epics
| ID | Epic | Covers |
|---|---|---|
| [EP-01](epics/EP-01-registration-and-role-selection/EP-01.md) | Registration and role selection | R-01, R-13, R-14, R-15 |
| [EP-02](epics/EP-02-shoot-creation-and-references/EP-02.md) | Shoot creation and references | R-02, R-03, R-09, R-16, R-17, R-18, R-19 |
| [EP-03](epics/EP-03-crew-management-and-crew-link/EP-03.md) | Crew management and the crew-facing link | R-04, R-05, R-06, R-07, R-08, R-20, R-21 |
| [EP-04](epics/EP-04-client-view/EP-04.md) | Client view | R-11, R-22, R-23, R-24 (R-12 retired) |
| [EP-05](epics/EP-05-localization/EP-05.md) | Localization | R-10 |

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Market beyond Ilona is unvalidated — the survey was never sent, and the owner has decided to skip running it (`01-discovery/challenge.md`; owner's answer in chat, 2026-08-22) | Building for a market of one, not a product, with no plan to find out otherwise | None — explicitly not being pursued, by owner decision |
| $5/month is below every competitor found by 3–14× (`01-discovery/competitors.md`) | May not cover build/support cost | None planned; accepted risk (`01-discovery/challenge.md`) |
| v1's Client access covers viewing shoot info but not confirming attendance or reacting to references (both removed/never added), part of the original pitch (`00-intake/s02-2026-08-22/transcript.md`, lines 328–342) | The named success signal (less time on client communication) may move less than expected, since confirmation and reaction both still happen outside the app | None planned; surfaced here so the gate decision is made with this gap visible |
| R-20/R-24 let crew members and clients see personal details (contact info; notes, for crew peers) with no opt-out for the person being viewed | Could expose more personal information than any one crew member or client expects, since the person described has no say in it | Not decided — the owner confirmed the field lists directly (round r02) but no one asked the crew/client themselves; accepted as-is |

## Open questions
Two remain open (calendar tap behavior, whether the profile becomes editable) — see
`open-questions.md` for the full, current list. Item 11 (which fields peers see) was resolved
in review round r02: all fields, including notes.
