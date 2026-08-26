# Backlog order — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-25 (spike S-1 and the foundation line revised 2026-08-26 — `ADR-016`;
  both spikes marked complete later the same day — review `r02-2026-08-26`)
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
| 4 | **EP-04** Client view | `US-010` → `US-026` → `US-024` → `US-025` | ~1 week only because the gateway already exists from EP-03. Reversing 3 and 4 would mean building the gateway twice |
| 5 | **EP-05** Localization | `US-014` → `US-015` | Full uk+en string coverage across every screen — cheapest once every screen exists. The *scaffolding* is in foundation, so no screen is built untranslatable |

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
