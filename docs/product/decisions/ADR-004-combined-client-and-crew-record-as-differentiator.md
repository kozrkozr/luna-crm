# ADR-004 — Position as one combined client+crew record, not a specialist tool

- **Date:** 2026-08-22
- **Status:** accepted (2026-08-25) — see **Scope of this decision** below: v1 delivers only
  the crew half, deliberately
- **Phase:** 01-discovery
- **Deciders:** agent (pending owner confirmation at the phase-01 gate)

## Context
Competitor research (`01-discovery/competitors.md`) shows the market splits cleanly into two
lanes: photographer CRM/gallery tools (Sprout Studio, Studio Ninja, Táve, Pixieset) handle
client booking, contracts, and photo delivery, but have no crew call-sheet feature; production
call-sheet tools (StudioBinder) handle crew coordination well but are priced and built for film
crews, not solo photographers, and have no client gallery/approval flow. Ilona's own description
spans both halves in one record — client info plus team plus files (`00-intake/s01-2026-08-20/
transcript.md`, lines 65–74, 108–110).

## Options considered
### Option A — Specialize in the crew/call-sheet half, integrate with an existing gallery tool
- **Pros:** smaller build; leans on a mature category (call sheets) with known patterns
- **Cons:** re-introduces the exact scattering problem being solved — client info would live
  in one tool, crew in another; contradicts the "one record for the shoot" premise

### Option B — Specialize in the client/gallery half, treat crew coordination as out of scope
- **Pros:** aligns with existing, well-priced tools like Pixieset (from $10/month,
  [pixieset.com/pricing](https://pixieset.com/pricing/))
- **Cons:** drops exactly the pain the owner led with — team logistics, not client galleries
  (`s01`, lines 150–182); this is the least differentiated option

### Option C — One combined record: client + team + files in a single shoot
- **Pros:** matches what the owner actually described; no existing competitor found in
  research occupies this combination at a comparable price point — CRM tools are $16–69/month
  ([capterra.com/p/143855/Studio-Ninja/pricing](https://www.capterra.com/p/143855/Studio-Ninja/pricing/),
  [capterra.com/p/92909/Tave-Studio-Manager/pricing](https://www.capterra.com/p/92909/Tave-Studio-Manager/pricing/))
  and don't do call sheets; StudioBinder does call sheets but starts around $49/month
  ([studiobinder.com/call-sheet-app](https://www.studiobinder.com/call-sheet-app/)) and is
  built for production crews, not solo photographers
- **Cons:** larger surface area to build and validate than either specialist option; unproven
  against Ilona's stated $5–10/month price point, which is well below every competitor found

## Decision
Option C — build the combined record, matching the owner's description, on the reasoning that
this combination is not currently served at a price a solo photographer would pay.

### Scope of this decision — what v1 actually ships
This ADR states the **destination**, not v1. Confirmed by the owner 2026-08-25.

`decisions/ADR-005-*.md`, decided the same day as this one, sequences the crew/call-sheet half
first and defers real file delivery. So **v1 is the crew half working properly, plus a client
half that is a window rather than a workflow**: a client can view their shoot, its team and its
references, but the thing they care about — receiving raw files and finished photos — still
happens outside the app, behind a pasted link (`US-024`, `US-025`; `decisions/ADR-008-*.md`).

That means v1 resembles this ADR's **rejected Option A** for as long as file delivery is
deferred. `01-discovery/challenge.md` §5 raised exactly this and the owner accepted it
unresolved at the 01-discovery gate. It is recorded here so no later reader mistakes the
combined record for something v1 already delivers. The combined record — and with it the
differentiation this ADR claims — arrives when file delivery does, not before.

## Consequences
- **Accepted cost:** more scope than a single-purpose tool; no existing competitor's UX to
  copy wholesale for either half.
- **Now easier:** the "one place, no re-explaining" value proposition is real, not marketing —
  it is structurally different from picking either lane.
- **Now harder:** justifying a $5–10/month price point against tools charging $16–69/month for
  less combined functionality is untested; if crew members refuse a lightweight no-login flow,
  the "combined" advantage shrinks back to a client-only tool.
- **Revisit when:** the photographer survey or early usage shows people only use one half of
  the app, which would mean specializing (Option A or B) after all.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | Between the client-gallery half and the crew-call-sheet half, which must ship first if the MVP has to be sequenced? | Epic/story sequencing in 02-product |
