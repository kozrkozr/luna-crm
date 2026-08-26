# Product specification — frozen snapshot

**Do not edit anything in this folder.**

This is a point-in-time copy of the handoff package produced by the discovery pipeline in
`my-ai-agency/clients/001-luna-crm/`. It is the specification this repository implements.

- **Frozen:** 2026-08-26 *(re-frozen twice; first freeze 2026-08-25)*
- **Source:** `~/WebstormProjects/my-ai-agency/clients/001-luna-crm/`
- **Source commit:** `befd916` — *docs(review r03): US-003 gains AC-3 — tapping a reference
  opens it*. Diff this folder against that commit to see any drift since the last freeze.
- **Gate:** 05-handoff returned `go` on 2026-08-25. DoD verified with 2 deliberate failures —
  see `HANDOFF.md`. Neither 2026-08-26 re-freeze reopened that gate: scope, cost and
  buildability did not move (`04-tech/reviews/r01-2026-08-26/`, `r02-2026-08-26/` in the source
  repo).

## What moved in the third 2026-08-26 re-freeze (review `r03`)
**`US-003` gained AC-3 — tapping a reference opens it.** A link opens in the phone's browser;
an image opens full-screen and can be dismissed. The owner decided this after testing the built
story on his own iPhone, so the criterion is dated and marked as arriving *after* the story was
built rather than reading as though it was always there.

The prototype's reference thumbnails are inert and predate the decision — do not read them as
the design. `ux-notes.md` now says so, and states that the behaviour applies on **every**
surface showing references: the creator's shoot page, `US-021`'s all-references page, and both
link views. `US-007`, `US-010` and `US-021` gain no criteria of their own; they inherit it.

No other story, epic, PRD or scope change.

## What moved in the second 2026-08-26 re-freeze (review `r02`)
**`risks.md` R-1 is retired.** Ilona reviewed the app on a physical iPhone and approved it —
the judgement spike `S-1` existed to trigger. The UI-layer rewrite R-1 held in reserve is not
being spent.

Read the three limits recorded inside R-1 before citing it. In short: she saw the **React Native
Reusables** build on the **stock neutral palette**, not the terracotta she approved twice in
design review, and no component-level feedback was captured. It is an approval, not a punch
list, and **not** sign-off on Luna's visual identity — that design is still unbuilt.

- **`risks.md` R-2 is closed.** The NativeWind re-verification the first re-freeze demanded was
  done before any screen was ported and again after. `S-2` F-3 — the `_redirects` rewrite on a
  live Cloudflare Pages deployment — stays open and is *not* part of R-2.
- **Spikes `S-1` and `S-2` are complete** in `risks.md` and `backlog-order.md`. `S-3`–`S-5`
  remain, each before the epic it de-risks.
- **`ADR-016`'s two open questions are answered**, both from the build. Question 2's answer
  weakens the ADR's own reason 2: NativeWind reintroduces the `react-native-reanimated`
  coupling non-optionally, so the swap did not buy what that reason implied. The decision is
  unaffected — reason 1 (theming) decided it. The ADR's fidelity paragraph is annotated, not
  rewritten.
- `HANDOFF.md` and `architecture.md` (Stage 2 note) re-sourced. No story, epic, PRD or scope
  change.

## What moved in the first 2026-08-26 re-freeze (review `r01`)
`ADR-016` replaces Tamagui with React Native Reusables as the UI layer. **React Native itself,
and `ADR-011`–`ADR-015`, are unchanged.** `ADR-010` stays on disk marked superseded.

- `risks.md` **R-1** is rewritten, not renamed: React Native Reusables also *approximates*
  Apple's controls, so the fidelity risk survives the swap. `ADR-016` neither answered it nor
  was motivated by it, and **Ilona still has not seen the app on a device.**
  *(Superseded by `r02` the same day — she has now seen it, and R-1 is retired.)*
- `risks.md` **R-2** now requires re-verifying the Cloudflare Pages static export. `S-2`
  verified it for Tamagui; NativeWind produces web output differently, and two of three user
  flows ride on that export. **Re-verify it before porting any screen.**
  *(Done in `r02`; R-2 closed.)*
- `backlog-order.md` spike `S-1`, `architecture.md`, `open-questions.md` #1 and `HANDOFF.md`
  are de-branded or re-sourced. No story, epic, PRD or scope change.

## Why frozen and not linked
A dated copy means acceptance criteria cannot shift while a story is being built, this repository
stays self-contained (`git clone` gives code *and* spec), and drift is visible — diff this folder
against the source to see exactly what moved since kickoff.

## How to change the spec
Never here. The sequence is:

1. Change the story or add an ADR in **`my-ai-agency`** (use `/review` there)
2. Re-copy this folder
3. Commit with a message naming what moved, e.g.
   `docs(product): re-freeze after review r03 — US-005 AC-2 changed`

That commit is the visible record that the specification moved, and why.

## What is here
| Path | What it is |
|---|---|
| `HANDOFF.md` | Start here — DoD status, known gaps, contradictions, reading order |
| `backlog-order.md` | **What to build, in order.** Spikes first, then foundation, then EP-01→EP-05 |
| `prd.md`, `scope.md` | Requirements `R-01`–`R-24`, and what is deliberately out |
| `epics/` | 5 epics, 24 live stories with Given/When/Then acceptance criteria |
| `architecture.md` | Components, data flow, service costs by stage |
| `data-model.md` | 5 entities and their relationships |
| `risks.md` | Technical risks, spikes, assumed effort per epic. **R-1 and R-2 retired; R-6 retired earlier** |
| `open-questions.md` | 4 open, all safe to start without |
| `decisions/` | `ADR-001`–`ADR-016`. Do not silently overturn any of them. `ADR-010` is superseded by `ADR-016` |
| `glossary.md` | Ukrainian↔English. **English is canonical for code and entity names** |
| `personas.md`, `flows.md`, `ux-notes.md` | Who this is for, and the screens |
| `prototype/index.html` | The reviewed prototype — open in a browser |

## Retired — do not build
- `US-011` — client reactions to references. Removed after trial (`ADR-009`).
- `US-012` — split into `US-014` and `US-015`.
