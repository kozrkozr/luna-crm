# Product specification — frozen snapshot

**Do not edit anything in this folder.**

This is a point-in-time copy of the handoff package produced by the discovery pipeline in
`my-ai-agency/clients/001-luna-crm/`. It is the specification this repository implements.

- **Frozen:** 2026-08-25
- **Source:** `~/WebstormProjects/my-ai-agency/clients/001-luna-crm/`
- **Source commit:** *none — the discovery artifacts were still uncommitted when this snapshot
  was taken.* Commit them in `my-ai-agency` and record the hash here, so this snapshot points at
  something reproducible.
- **Gate:** 05-handoff returned `go` on 2026-08-25. DoD verified with 2 deliberate failures —
  see `HANDOFF.md`.

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
| `decisions/` | `ADR-001`–`ADR-015`. Do not silently overturn any of them |
| `glossary.md` | Ukrainian↔English. **English is canonical for code and entity names** |
| `personas.md`, `flows.md`, `ux-notes.md` | Who this is for, and the screens |
| `prototype/index.html` | The reviewed prototype — open in a browser |

## Retired — do not build
- `US-011` — client reactions to references. Removed after trial (`ADR-009`).
- `US-012` — split into `US-014` and `US-015`.
