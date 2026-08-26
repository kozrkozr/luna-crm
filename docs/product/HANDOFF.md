# Handoff — Luna CRM (working name)

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-25
- **Target repository:** not created yet
- **DoD verified:** **no — 2 failures**, both deliberate owner decisions rather than oversights
  (listed below). Seven further failures found in this phase were fixed on 2026-08-25 and are
  listed as resolved. **Nothing now blocks starting the first epic.**

## What this is
A CRM where a solo photographer holds one record per shoot — client info, references, crew,
location, status — and shares it by link with crew who have no account and no app installed.
v1 is the crew/call-sheet half plus a read-only Client view; real file hosting for raw and
finished photos is deferred (`decisions/ADR-005-*.md`, amended by `ADR-008-*.md`).

## Read in this order
1. [`01-discovery/vision.md`](01-discovery/vision.md) — the problem, then
   [`01-discovery/challenge.md`](01-discovery/challenge.md), which argues against it and was
   accepted unresolved
2. [`02-product/prd.md`](02-product/prd.md) and [`02-product/scope.md`](02-product/scope.md)
3. [`02-product/epics/`](02-product/epics/) — 5 epics, 24 live stories
4. [`03-design/prototype/index.html`](03-design/prototype/index.html) — open in a browser;
   [`03-design/ux-notes.md`](03-design/ux-notes.md) maps every screen to story IDs
5. [`04-tech/architecture.md`](04-tech/architecture.md), then
   [`data-model.md`](04-tech/data-model.md), [`risks.md`](04-tech/risks.md)
6. [`04-tech/backlog-order.md`](04-tech/backlog-order.md) — what to build first
7. [`decisions/`](decisions/) — 14 ADRs

## Artifact inventory
| Artifact | Path | DoD |
|---|---|---|
| Brief | `00-intake/brief.md` | pass — 18 citations corrected to the real folder names, 2026-08-25 |
| Vision | `01-discovery/vision.md` | pass — Differentiation now states that it describes the destination, not v1 (2026-08-25) |
| Personas | `01-discovery/personas.md` | pass |
| Glossary | `01-discovery/glossary.md` | pass — `посилання \| link` confirmed and added 2026-08-25; «лінк» recorded as a rejected synonym; "call sheet" deliberately omitted |
| Challenge | `01-discovery/challenge.md` | pass — findings accepted, not resolved |
| PRD | `02-product/prd.md` | **fail** — success metrics have no target or method (#1, deliberate). Status line corrected 2026-08-25 |
| Scope | `02-product/scope.md` | pass |
| Epics | `02-product/epics/EP-01…EP-05` | pass |
| Stories | 24 live under `02-product/epics/` | pass — `US-024`/`US-025` gained AC-3, 2026-08-25. All 24 carry a required negative case |
| Flows | `03-design/flows.md` | pass |
| UX notes | `03-design/ux-notes.md` | pass |
| Prototype | `03-design/prototype/index.html` | pass — three UI strings changed from «лінк» to «посилання» for term consistency, 2026-08-25 |
| Architecture | `04-tech/architecture.md` | **fail** — no template exists (#2) |
| Data model | `04-tech/data-model.md` | **fail** — no template exists (#2) |
| Tech risks | `04-tech/risks.md` | **fail** — no template exists (#2) |
| Backlog order | `04-tech/backlog-order.md` | pass |
| ADRs | `decisions/ADR-001…ADR-015` | pass — `ADR-004`/`ADR-007` accepted, `ADR-015` added, broken refs and the unglossed quote fixed, all 2026-08-25 |

## Backlog order
Full reasoning in [`04-tech/backlog-order.md`](04-tech/backlog-order.md). Spikes **S-1** and
**S-2** run before any story; foundation work (~3–4 weeks, mapped to no story) comes next.

| Order | Epic | Stories | Note |
|---|---|---|---|
| 1 | EP-01 | `US-001`, `US-013`, `US-016`, `US-017` | Everything depends on an account. **Blocked by gap #5 below** |
| 2 | EP-02 | `US-002`, `US-003`, `US-004`, `US-018`, `US-020`, `US-019`, `US-021` | `Shoot` is the record every later epic attaches to |
| 3 | EP-03 | `US-005`, `US-006`, `US-007`, `US-008`, `US-023`, `US-022`, `US-009` | Builds the link gateway EP-04 reuses |
| 4 | EP-04 | `US-010`, `US-026`, `US-024`, `US-025` | ~1 week, because EP-03 already built the gateway |
| 5 | EP-05 | `US-014`, `US-015` | Full string coverage once every screen exists |

**Do not build:** `US-011` (retired, `ADR-009`), `US-012` (split into `US-014`/`US-015`).

## Decisions a developer must not silently overturn
- **ADR-001** — "shoot creator" (per-shoot ownership) is a different concept from the "shoot manager" profession.
- **ADR-002** — v1 serves photographers who organize their own shoots; not the wider industry.
- **ADR-003** — crew are entered manually per shoot. There is no crew directory and no global person table.
- **ADR-005** (amended by **ADR-008**) — no real file hosting. Raw/finished photos are a placeholder or a pasted external link.
- **ADR-006**, superseded in part by **ADR-009** — the client does not react to references at all, and never proposed them.
- **ADR-010**, superseded by **ADR-016** — React Native stays; the UI layer is React Native
  Reusables, not Tamagui (changed 2026-08-26, six screens into the build).
- **ADR-011** — Supabase (Postgres, Auth, Storage, Edge Functions).
- **ADR-012** — Cloudflare Pages for the public link surface. Vercel's free tier forbids commercial use.
- **ADR-013** — anonymous link payloads are shaped server-side per audience. The client's response must never contain a crew member's `note`.
- **ADR-014** — no link expiry column. Validity is derived from soft-deleted parents.
- **ADR-015** — email and password are the credential; phone is an optional profile field.
- **ADR-004** — the combined client+crew record is the *destination*, and its "Scope of this
  decision" section states plainly that v1 delivers only the crew half. Do not read it as a
  description of v1.

## Known gaps
**Every remaining gap is safe to start without.** The one that was not — the login
credential — was answered 2026-08-25 (`decisions/ADR-015-*.md`).

| # | Gap | Safe to start without? | Why |
|---|---|---|---|
| 1 | **#3** — is `US-009` in v1? | yes to start, **no to finish EP-03** | Nothing before EP-03's last story depends on it. But it is the only reason a crew member would register, so shipping without it makes v1 single-player |
| 2 | **#1** — iOS-only, or Android too? | yes | iOS-first is buildable either way. It decides Google Play's $25 and whether `ADR-010` should be revisited, not any story |
| 3 | **#4** — how does a crew link reach a crew member? | yes | `US-006` only requires a shareable link. Manual copy-paste is the default; in-app SMS would add a provider and per-message cost |
| 4 | **#2** — who pays the $34.35/mo floor before subscriber #7? | yes | Development costs $0 (`architecture.md`, Stage 1). The question only becomes live at Ilona's first real shoot |
| 5 | **#12** — what happens when a calendar date is tapped? | yes | Built as its simplest version — dates marked, no tap behaviour (`US-004`, Out of scope) |
| 6 | **#13** — is the profile editable later? | yes | `US-016` is read-only by AC. A yes adds a new story; it changes nothing already built |
| 7 | Market validation | yes, with eyes open | Deliberately not pursued by owner decision at the 02-product gate. v1 is built for one confirmed user |

## DoD failures
**Two remain. Both are deliberate, and neither is an oversight.**

1. **PRD success metrics have no target and no measurement method.** The DoD requires "a target
   and a measurement method"; `02-product/prd.md` states "No numeric target — judged
   qualitatively," measured by Ilona's own experience plus early-user feedback. The owner's
   explicit choice, recorded at the 02-product gate and reaffirmed since. The box stays unchecked
   rather than being satisfied with an invented number.
2. **No template exists for the three 04-tech artifacts.** `company/templates/` has no
   `architecture.md`, `data-model.md`, or `risks.md`, and `company/standards/definition-of-done.md`
   has no section for them — so "created from the matching template" cannot be checked for
   `architecture.md`, `data-model.md`, or `risks.md`. Declared when they were written. Left open
   deliberately: a template extracted from a single example is a guess, and a second subproject
   is what would prove the sections.

### Fixed on 2026-08-25
Seven failures found during this phase were corrected the same day, after the owner answered the
four questions the phase raised.

| Was | Fix |
|---|---|
| Glossary had no row for "link", the product's central mechanism — and the prototype used «лінк» and «посилання» interchangeably for the same thing | Owner confirmed **`посилання` = link**. Row added as `confirmed`; «лінк» recorded under **Rejected synonyms**; the prototype's three offending strings changed. "Call sheet" deliberately gets no row — the concept never appears in the interface (owner's decision) |
| `ADR-004` still `proposed` after three gates, and claimed a differentiation v1 does not deliver | Accepted, with a new **"Scope of this decision"** section stating that this ADR is the destination, that `ADR-005` ships the crew half first, and that v1 therefore resembles this ADR's own rejected Option A until file delivery exists |
| `ADR-007` still `proposed` | Accepted. It only recorded what the prototype already did and what the owner reviewed twice without objection |
| `US-024`, `US-025` had no negative acceptance criterion | Both gained **AC-3**, formalising the behaviour their own Out-of-scope sections already pointed at (`US-003` AC-2) rather than inventing new behaviour |
| `ADR-009` had a bare Ukrainian quote, `"видалити."` | Now «видалити» [delete] |
| `ADR-009` and `ADR-010` cited `company/CLAUDE.md`, which does not exist | Both now cite the root `CLAUDE.md` |
| `00-intake/brief.md` body cited `s01/transcript.md`; the folders are `s01-2026-08-20/` | All 18 citations corrected. The transcripts themselves were not touched |

### Also resolved: the one blocking open question
`04-tech/open-questions.md` #5 — the login credential — is answered: **email and password
required, phone optional** (`decisions/ADR-015-*.md`). Consequences propagated:
`data-model.md` (`User.email` now required), `risks.md` (R-6 retired), `04-tech/backlog-order.md`
(EP-01 unblocked). `US-001` and `US-013` needed no AC changes.

### Contradictions between artifacts — disclosed, not resolved
All four still stand as real tensions — none was resolved by editing. All four are now
**disclosed inside the artifacts** that carry them, so no reader meets a claim v1 does not
support.

1. **`ADR-004` vs `ADR-005` — now disclosed.** ADR-004 rejected "specialize in the
   crew/call-sheet half" because it "re-introduces the exact scattering problem being solved";
   ADR-005, the same day, ships exactly that. v1 is ADR-004's rejected option for as long as file
   delivery is deferred. As of 2026-08-25 ADR-004 says so in its own "Scope of this decision"
   section, so a reader can no longer mistake it for a description of v1. The underlying tension
   is unchanged — it was accepted unresolved at the 01-discovery gate.
2. **`vision.md` vs `ADR-005` — now disclosed.** Vision, Differentiation: "None found combine
   both in one lightweight record at a solo-photographer price point… Underpricing existing tools
   while covering more ground." v1 covers only the crew half, so it does not cover more ground
   than a specialist competitor. As of 2026-08-25 the Differentiation section carries a
   "**This describes the destination, not v1**" paragraph pointing at `ADR-005`, `ADR-008`, and
   `ADR-004`'s scope section — so the first document in the reading order no longer overstates
   what ships.
3. **"No file hosting" vs three stories that upload media — disclosed.** `prd.md` Non-goals:
   "**Actual file hosting/upload** for raw files or finished photos — still deferred." But
   `US-003` uploads gallery images, `US-005` a note image, and `US-018` an image **or a video**.
   The non-goal is true only of raw/finished photos; v1 needs a real storage bucket and signed
   URLs from day one. Stated plainly in `risks.md` R-5, where a developer will meet it.
4. **`US-009`'s priority vs its role — disclosed.** `prd.md` R-08 marks it `should`; the same
   PRD's Journey 3 consists entirely of it and notes it is "the only journey that depends on a
   'should,' not a 'must.'" Tracked as `risks.md` R-3 and `open-questions.md` #3.

### Language verification — otherwise clean
`00-intake/` sources are untouched. Every artifact outside it is in English. All 14 glossary rows
are `confirmed`; no `provisional` term appears in any epic, story, or entity name. The prototype
holds Ukrainian UI copy with English identifiers throughout, 21 placeholder items tagged
"(демо)", no external scripts, and zero Russian-language markers — matching `Product UI language`
and the deliberate Russian exclusion. Every Ukrainian quote across the repository now carries a
bracketed English gloss. **No language failures remain.**

### Integrity verification — clean
26 story files, IDs `US-001`–`US-026`, no duplicates, no gaps, no reuse. Every story links to a
live parent epic and sits in that epic's folder. `EP-01`–`EP-05` each hold their own `EP-NN.md`.
`ADR-001`–`ADR-015`, no gaps, none left at `proposed`. Every live PRD requirement (`R-01`–`R-24`, `R-12` retired) is
claimed by exactly one epic, and no epic claims an undefined requirement. All relative markdown links resolve, and no artifact
cites a path that does not exist. Retired items (`US-011`, `US-012`) carry `Status: retired` in-file and
appear in the subproject `CLAUDE.md` under Retired IDs.
