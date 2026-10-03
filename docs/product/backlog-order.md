# Backlog order — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-25 (spike S-1 and the foundation line revised 2026-08-26 — `ADR-016`;
  both spikes marked complete later the same day — review `r02-2026-08-26`; the redesign wave and
  `EP-06` added 2026-08-28 — `ADR-017`, `ADR-018`)
- **Derived from:** story `Dependencies` sections under `02-product/epics/`,
  `04-tech/risks.md` (effort and spikes), `04-tech/architecture.md`
- **Effort figures are assumptions** carried from `risks.md`, not measurements.

## Before any story: two spikes — **both complete, 2026-08-26**
Both could invalidate a foundational choice, and both were cheap only while nothing was built on
top of them (`risks.md`, Spikes).

| # | Spike | Outcome |
|---|---|---|
| ~~S-1~~ | Two real screens on a device, shown to Ilona | **Done 2026-08-26 — she approved.** `risks.md` R-1 retired; the UI-layer rewrite it held in reserve is not being spent. She saw the React Native Reusables build on the stock palette, so this is not sign-off on Luna's visual identity — see R-1 for the limits |
| ~~S-2~~ | Static-export one link view via RN Web to Cloudflare Pages | **Done**, and re-verified for NativeWind on 2026-08-26 before any screen was ported (`ADR-016` open question 1). `risks.md` R-2 closed. One item still open: the `_redirects` rewrite has never run on a live Cloudflare Pages deployment (`S-2` F-3) |

## Then: foundation — mapped to no story
**Assumed 3–4 weeks.** Supabase project, schema, RLS, the design system (React Native
Reusables — `ADR-016`), dual-target routing, i18n scaffolding, media pipeline. Roughly a quarter
of the build lives here and is invisible in a backlog of 24 small-looking stories.

## Epic order

| Order | Epic | Stories, in dependency order | Why here |
|---|---|---|---|
| 1 | **EP-01** Registration and role selection | `US-001` → `US-013` → `US-016` → `US-017` | Every other epic depends on an account existing. **Blocked:** `open-questions.md` #5 (login credential, phone-only password reset) must be answered before this starts |
| 2 | **EP-02** Shoot creation and references | `US-002` → `US-003` → `US-004` → `US-018` → `US-020` → `US-019` → `US-021` | `Shoot` is the record every later epic attaches to. `US-002` first because `US-003`/`US-005`/`US-010` all require a shoot to exist |
| 3 | **EP-03** Crew management and the crew-facing link | `US-005` → `US-006` → `US-007` → `US-008` → `US-023` → `US-022` → `US-009` | Builds the link gateway (`ADR-013`), which EP-04 then reuses. `US-009` last — it is the only `should`, and `open-questions.md` #3 may remove it |
| 4 | **EP-04** Client view | `US-027` → `US-010` → `US-026` → `US-024` → `US-025` | ~1 week only because the gateway already exists from EP-03. Reversing 3 and 4 would mean building the gateway twice. `US-027` is first by dependency — a link has to be created before anyone can open one — though it was added after `US-010` was already built, which is why it appears out of order in the build's history |
| 5 | **EP-05** Localization | `US-014` → `US-015` | Full uk+en string coverage across every screen — cheapest once every screen exists. The *scaffolding* is in foundation, so no screen is built untranslatable |
| 6 | **EP-06** Client records | `US-029` → `US-028` | Added 2026-08-28 (`ADR-017`, `ADR-018`). After EP-02 because `US-029` changes `US-002`'s creation form, and after EP-05 only in the sense that it arrived later — it carries its own uk strings |

## The 2026-08-28 redesign wave

Sits after the v1 backlog above, and interleaves with it: the token layer is foundation work, the
new stories are schema work, and the theme-only pass touches screens all five epics already built.
Derived from the design system's own §10 plan (`ADR-017`), amended in one place — see the note.

| Order | Work | Story | Why here |
|---|---|---|---|
| 1 | Token layer — `global.css` layers A+B, `elevation.ts`, scheme pinned dark, `NAV_THEME` pinned | none (foundation) | Half a day, three files, nothing depends on it being right the first time. Every later item reads from it |
| 2 | Start and end times | `US-030` | **Moved ahead of the pilot** — see the note below |
| 3 | Pilot: shoot detail + shoot edit | none (theme-only) | The system's §10 Step 2 picks exactly these two: the most component-dense screen and the form-heavy one. If the system cracks, it cracks here |
| 4 | Theme-only pass over the remaining ten screens | none | UX preserved exactly, visual system applied (`ADR-017` open question 2, owner's instruction). Includes both link views — test logged out in a real mobile browser, per `CLAUDE.md`. **Moved ahead of the gate — see the second note** |
| 5 | **Gate — Ilona reviews the dark frame on a device** | none | `ADR-017` open question 1. She approved terracotta twice and has never seen this. `S-1` F-2 is the precedent: showing her the wrong palette makes the palette swallow every other piece of feedback |
| 6 | Conflict warning between consecutive shoots | `US-031` | Needs `US-030`'s times to compare |
| 7 | Client records | `US-029` → `US-028` | The `clients` table and its migration (`ADR-018`). `US-029` first: a client row must exist and be attachable before a profile can show one |
| 8 | Reference categories | `US-032` | Independent of everything above; held until after the gate because it changes a section the mockups redesign |
| 9 | Location photos | `US-033` | Widens `risks.md` R-5's file surface from one object per shoot to several |
| — | Directions to the location | `US-034` | **Held, not ordered.** Its open question 1 may merge it into `US-033`; building it first risks building the wrong schema |

**Note — why the theme pass moved ahead of the gate.** This table originally put
Ilona's device review before the remaining screens, reasoning that a review is
expensive to repeat and so should come as early as possible. That was wrong, and
the pilot showed why: after it, **38 sites across 10 screens still carried
light-theme tokens on the dark frame** — `text-muted-foreground` at 1.9:1,
`variant="h4"` headings at 1.04:1 — heaviest in the shoot list (11) and the
client link view (14). Two screens were finished and ten were visibly broken.

Reviewing that is worse than reviewing nothing. It is `S-1` F-2's lesson one
level up: she saw the stock palette and the palette swallowed every other piece
of feedback. An app where most screens are half-converted swallows it the same
way, except the notes come back about breakage rather than about design. The gate
is worth holding once, on a coherent app, so the mechanical pass goes first.

**Note — why `US-030` moved ahead of the pilot.** The system's §10 puts tokens then pilot, with no
schema work between. But both pilot screens show the time range as their largest numeric element,
and the shoot record has only a `date`. A pilot built on the current schema would show Ilona a
faithful *palette* on an unfaithful *screen* — and item 4 is the one gate in this wave that is
expensive to repeat. `US-030` is small and specified, so it buys a truthful pilot cheaply. Its
AC-3 stays unbuilt either way (`open-questions.md` item 14).

## EP-07 File hosting — *added 2026-10-03, `ADR-020`*

| Order | Work | Story | Why here |
|---|---|---|---|
| 1 | **Spike S-6** — a multi-GB file from the iOS app to B2 by presigned multipart upload, on a mobile network, then downloaded by a logged-out phone browser | none | The one thing that can invalidate `ADR-020`'s "upload from iOS" — cheap only before anything sits on top of it |
| 2 | Upload | `US-036` | Everything else needs files to exist |
| 3 | Client sees and downloads | `US-024` → `US-025` | Rewritten for hosted files; reuses the gateway |
| 4 | Deletion date, early delete | `US-037` → `US-038` | `US-037` brings the scheduled job |
| 5 | Push warning | `US-039` | Last: it brings push notifications, a new dependency, for one message |

`EP-07`'s open questions (10, listed in `EP-07.md`) — #1, #2 and #5 bear on `US-036`'s schema
and should be answered before step 2.

## Notes on the order
- **EP-03 before EP-04 is the one non-obvious call.** Both are link views; EP-03 builds the
  gateway, audience shaping, and the revoked-link state, and EP-04 is then mostly a second
  payload shape (`ADR-013`). Doing the client view first would build the same machinery for the
  simpler of the two audiences and then extend it.
- **EP-05 last, but not deferred.** i18n scaffolding belongs to the foundation; leaving it out
  and retrofitting means touching every screen twice.
- **`US-009` is deliberately the final story.** It is marked `should` in `prd.md` (R-08), yet PRD
  Journey 3 depends entirely on it and it is the only reason a crew member would ever register
  (`risks.md` R-3). Last position keeps that decision open as long as possible without blocking
  anything.
- **Retired IDs are not in this order** and must not be built: `US-011` (`ADR-009`), `US-012`
  (split into `US-014`/`US-015`).
