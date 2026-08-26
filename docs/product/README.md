# Product specification — frozen snapshot

**Do not edit anything in this folder.**

This is a point-in-time copy of the handoff package produced by the discovery pipeline in
`my-ai-agency/clients/001-luna-crm/`. It is the specification this repository implements.

- **Frozen:** 2026-08-26 *(re-frozen; first freeze 2026-08-25)*
- **Source:** `~/WebstormProjects/my-ai-agency/clients/001-luna-crm/`
- **Source commit:** `93fc02a` — *docs(ADR-016): replace Tamagui with React Native Reusables as
  the UI layer*. Diff this folder against that commit to see any drift since the last freeze.
- **Gate:** 05-handoff returned `go` on 2026-08-25. DoD verified with 2 deliberate failures —
  see `HANDOFF.md`. The 2026-08-26 re-freeze did **not** reopen that gate: scope, cost and
  buildability did not move (`04-tech/reviews/r01-2026-08-26/notes.md` in the source repo).

## What moved in the 2026-08-26 re-freeze
`ADR-016` replaces Tamagui with React Native Reusables as the UI layer. **React Native itself,
and `ADR-011`–`ADR-015`, are unchanged.** `ADR-010` stays on disk marked superseded.

- `risks.md` **R-1** is rewritten, not renamed: React Native Reusables also *approximates*
  Apple's controls, so the fidelity risk survives the swap. `ADR-016` neither answered it nor
  was motivated by it, and **Ilona still has not seen the app on a device.**
- `risks.md` **R-2** now requires re-verifying the Cloudflare Pages static export. `S-2`
  verified it for Tamagui; NativeWind produces web output differently, and two of three user
  flows ride on that export. **Re-verify it before porting any screen.**
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
| `risks.md` | Technical risks, spikes, assumed effort per epic |
| `open-questions.md` | 4 open, all safe to start without |
| `decisions/` | `ADR-001`–`ADR-016`. Do not silently overturn any of them. `ADR-010` is superseded by `ADR-016` |
| `glossary.md` | Ukrainian↔English. **English is canonical for code and entity names** |
| `personas.md`, `flows.md`, `ux-notes.md` | Who this is for, and the screens |
| `prototype/index.html` | The reviewed prototype — open in a browser |

## Retired — do not build
- `US-011` — client reactions to references. Removed after trial (`ADR-009`).
- `US-012` — split into `US-014` and `US-015`.
