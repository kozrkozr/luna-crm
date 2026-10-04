# Product specification — frozen snapshot

**Do not edit anything in this folder.**

This is a point-in-time copy of the handoff package produced by the discovery pipeline in
`my-ai-agency/clients/001-luna-crm/`. It is the specification this repository implements.

- **Frozen:** 2026-10-04 *(first freeze 2026-08-25; re-frozen five times on 2026-08-26, then 2026-09-29 and 2026-10-03)*
- **Source:** `~/WebstormProjects/my-ai-agency/clients/001-luna-crm/`
- **Source commit:** `4877af2` — *docs(ADR-021): the photographer's app in a desktop browser, uploads from there*.
  Diff this folder against that commit to see any drift since the last freeze.
- **Gate:** 05-handoff returned `go` on 2026-08-25. DoD verified with 2 deliberate failures —
  see `HANDOFF.md`. Neither 2026-08-26 re-freeze reopened that gate: scope, cost and
  buildability did not move (`04-tech/reviews/r01-2026-08-26/`, `r02-2026-08-26/` in the source
  repo).

## What moved in the 2026-10-04 re-freeze (`ADR-021`)
**The photographer's app is supported in a desktop browser, and files upload from there** — not
from the iOS app, which is deferred for uploads. `ADR-021` amends `ADR-020` decision 7 and
extends `ADR-012`: Cloudflare Pages serves the creator's app at **`app.lunashoots.com`**, beside
the link surface on `lunashoots.com`. This repo's `docs/open-questions.md` #26 is answered —
publishing the creator's routes is now intended.

- **`US-040` is new** (in `EP-07`): every creator story in any modern desktop browser; the phone
  layout, centred; one auth email link that opens the iOS app on a phone and the web app on a
  computer.
- **`US-036`** uploads from the browser — a file picker and drag-and-drop. Its AC-6 (Photos and
  Files on iOS) is parked with the deferred iOS upload.
- `backlog-order.md`: spike **`S-6`** now tests a browser upload; **`US-040` comes before
  `US-036`**.

## What moved in the 2026-10-03 re-freeze (`ADR-020`)
**Raw files and finished photos are hosted now.** `ADR-020` supersedes `ADR-008` and `ADR-005`
in part: files go to **Backblaze B2** (EU Central), not Supabase Storage, are deleted **30 days
after the first upload to a shoot**, and count against **200 GB per account**. The creator gets
a push warning 3 days before. No payment is built; the price is undecided.

- **`EP-07` is new** — `US-036` (upload), `US-037` (deletion date), `US-038` (early delete),
  `US-039` (push warning). Spike **`S-6`** (a multi-GB upload from the iPhone to B2) comes first
  in `backlog-order.md`.
- **`US-024` and `US-025` are rewritten**: the client views and downloads the files; the pasted
  link stays beside them; **only the client payload carries files** — not the crew's.
- `data-model.md` gains `Shoot.files_delete_at` and the `ShootFile` entity (glossary:
  файл зйомки). `architecture.md` gains a file-hosting section, `risks.md` R-5 a note.
- **`ADR-014` is unchanged** — the shoot link never expires; only the files do.
- **Small images stay in Supabase Storage** (`US-003`, `US-005`, `US-018`), behind the same
  storage interface so they can move to B2 later.
- `EP-07.md` lists the questions still open — answer them before `US-036`'s schema.

## What moved in the 2026-09-29 re-freeze (review `r06`, and `8627fea` before it)
**`ADR-019` amends `US-001` AC-1: registration now confirms the email** before the reader lands
on the shoot list. AC-3 (logging in unconfirmed) and AC-4 (an invalid link) are new.
`data-model.md` says an email matches crew only once confirmed; the phone key is unchanged, so
`docs/open-questions.md` #31 in this repo is half closed, not closed. The copy for the new
screens is in the source repo's `02-product/reviews/r06-2026-09-29/notes.md` — it was approved
in chat and is not in the criteria.

**This freeze also brings in `8627fea`, which was never frozen.** `ADR-017` (the dark-frame
design system), `ADR-018` (the client as a persisted entity), `EP-06`, `US-028`–`US-035`, and
the redesign wave in `backlog-order.md` were written in the source repo on 2026-08-28 and built
here against the source directly. They are in this folder for the first time now; the build
history that cites them predates their arrival here.

## What moved in the fifth 2026-08-26 re-freeze (review `r05`)
**`US-027` is a new story in EP-04 — share the client's link.** The build reached `US-010` and
found that nothing creates the link it opens: `AccessLink` has modelled a `client` audience
since 04-tech and the gateway resolves one, but no story let the creator make one.

It is the client's counterpart to `US-006`, and deliberately parallel — one link per shoot
rather than per person, because the client is a field on the shoot and never an account. It also
gives `client_name` and `client_contact` their first home on any screen; `US-002` collects both
and nothing has ever shown them.

`backlog-order.md` puts EP-04 in dependency order — `US-027` first — and notes that `US-010`
was built before it, so the build's history runs out of order against the backlog.

**IDs continue from the highest ever issued**, so this is `US-027` even though `US-011` and
`US-012` are retired (`id-conventions` rule 1). Do not read the gap as a free number.

## What moved in the fourth 2026-08-26 re-freeze (review `r04`)
**`US-004` gained AC-3 (month navigation) and AC-4 (tapping a date filters the list).** The
second answers the spec's own open question #12, open since the 2026-08-23 prototype review.

**This reversed three of `US-004`'s Out of scope lines**, so that section was rewritten rather
than left to contradict the new criteria — filtering by date and month navigation are in;
searching and multi-month view stay out. Read the story, not this folder's earlier state.

Two sub-decisions are recorded in the criteria because the owner was asked before anything was
written: **every date is tappable**, including ones with no shoot (so there is a second empty
state, distinct from AC-2's), and **the filter is cleared by a visible control**, not only by
tapping the date again.

No new entity, column or query — the filter is screen state over an already-loaded list, which
is why `open-questions.md` records #12 as having no technical bearing before or after.

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
| `epics/` | 7 epics, 38 live stories with Given/When/Then acceptance criteria |
| `architecture.md` | Components, data flow, service costs by stage |
| `data-model.md` | 5 entities and their relationships |
| `risks.md` | Technical risks, spikes, assumed effort per epic. **R-1 and R-2 retired; R-6 retired earlier** |
| `open-questions.md` | 4 open, all safe to start without |
| `decisions/` | `ADR-001`–`ADR-021`. Do not silently overturn any of them. `ADR-010` is superseded by `ADR-016` |
| `glossary.md` | Ukrainian↔English. **English is canonical for code and entity names** |
| `personas.md`, `flows.md`, `ux-notes.md` | Who this is for, and the screens |
| `prototype/index.html` | The reviewed prototype — open in a browser |

## Retired — do not build
- `US-011` — client reactions to references. Removed after trial (`ADR-009`).
- `US-012` — split into `US-014` and `US-015`.
