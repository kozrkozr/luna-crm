# ADR-016 — React Native Reusables replaces Tamagui as the UI layer

- **Date:** 2026-08-26
- **Status:** accepted
- **Supersedes:** `ADR-010` (React Native with Tamagui as the UI stack)
- **Phase:** 04-tech, revisited post-handoff from build feedback (`04-tech/reviews/r01-2026-08-26/`)
- **Deciders:** owner

## Context
`ADR-010` chose React Native + Tamagui on 2026-08-23, before any code existed. Code now exists:
the build repository (`~/WebstormProjects/luna-crm`) has six screens and four shared components
built against Tamagui — foundation, `US-001`, `US-013`, `US-016`, `US-017`, `US-002` — plus the
`S-1`/`S-2` spike project.

**React Native itself is not in question.** Only the UI layer above it is. The owner decided on
2026-08-26 to replace Tamagui with **React Native Reusables** (RNR) — a shadcn-style kit whose
CLI copies component source into the repository, built on NativeWind (Tailwind for React
Native) over unstyled primitives.

Three reasons were given (owner, chat 2026-08-26):

1. **Theming.** Ilona has approved the warm terracotta prototype palette twice
   (`03-design/reviews/r01-`, `r02-2026-08-23/`), and re-theming to it was deferred as a
   separate task. Owning component source and styling it with Tailwind classes is judged more
   tractable than driving Tamagui's token config toward the same result.
2. **Dependency coupling.** `@tamagui/config` pulls `react-native-reanimated` regardless of
   which animation driver is chosen, which cost two separate native build failures during `S-1`
   and constrains every future Expo SDK bump. The `S-1` report already recommended dropping
   `@tamagui/config` if it bit again.
3. **Agent-friendliness.** Components as plain source in the repository can be read and edited
   directly. Tamagui v2 was the opposite: `S-1` finding F-4 recorded that its shipped API had
   moved away from what its own documentation showed, which is exactly the case where an agent
   writes confidently wrong code.

Reason 1 is the owner's judgement, stated in chat — **not** a recorded build failure. Reasons 2
and 3 are sourced to `S-1` findings F-6/F-7 and F-4.

**This decision is not about visual fidelity.** Ilona has never seen the app on a device.
`risks.md` R-1 — whether the UI layer reaches the "authentic Apple look" bar — is neither the
reason for this change nor answered by it. It stays open, with a new subject.

> **Addendum, 2026-08-26 (review `r02`).** The paragraph above is left as written — it was true
> when this decision was made, and it is why the decision reads the way it does. It is no longer
> true of today: later the same day Ilona reviewed the ported build on a physical iPhone and
> approved it, and **R-1 is retired**. That does not change this ADR's reasoning. The point the
> paragraph was making still stands and is worth keeping: this decision was not evidence about
> the look, and should never be cited as though it were. What closed R-1 was her eye on a
> device, not the UI-kit swap.

## Options considered
### Option A — stay on Tamagui
- **Pros:** zero port cost; six screens already work; `S-1` verified every control v1 needs
  exists and the whole set compiles and renders on a physical iPhone
- **Cons:** none of the three reasons above goes away; the theming task, the reanimated
  coupling, and the docs-vs-API drift all remain, and the port only gets more expensive as
  screens accumulate

### Option B — React Native Reusables / NativeWind (chosen)
- **Pros:** component source lives in the repository, so styling and theming are ordinary code
  edits; Tailwind is a far more widely-documented styling vocabulary than Tamagui's prop API;
  still cross-platform iOS + Android from one codebase
- **Cons:** ~1,100 lines across six screens, four components and the theme config must be
  ported; owning the source means owning its bugs and its accessibility behaviour, with no
  upstream fixes; RNR is younger and thinner than Tamagui

### Option C — React Native + `@expo/ui`
- **Pros:** genuinely native SwiftUI controls, the highest fidelity available inside React Native
- **Cons:** unchanged from `ADR-010` Option B — still covers only a limited set of standard
  controls, not a full component library. Does not solve theming.

### Option D — hand-rolled `StyleSheet`, no UI kit
- **Pros:** no dependency at all; total control
- **Cons:** `S-1` already tried a version of this and recorded it as a mistake — hand-rolled
  stacks with a custom palette tested flexbox rather than any component library. Every control
  in v1 would be written from scratch.

## Decision
Option B. Replace Tamagui with React Native Reusables, keeping React Native and Expo Router.
The reason that decided it is theming: the palette Ilona has already approved is the next
visible piece of work, and the owner wants it as editable source rather than a token config.

## Consequences
- **Accepted cost:** a UI-layer port of ~1,100 lines while it is at its cheapest — six screens,
  not twenty-four stories' worth. `S-1`'s Tamagui-specific findings (F-4's API notes, F-5's
  animation-driver swap) are discarded with the library.
- **Now easier:** re-theming to the prototype palette; reading and editing any component;
  writing UI with an agent.
- **Now harder:** every component's correctness and accessibility is now this project's
  problem, with no upstream to fix it. The RNR/NativeWind stack has to re-earn what `S-1`
  already proved for Tamagui: that a full native build compiles and every control v1 needs
  exists.
- **Revisit when:** the port shows RNR cannot cover a control v1 needs, or NativeWind breaks
  the static web export that `ADR-012`'s whole link surface depends on.

## Open questions — **both answered by the port, 2026-08-26**
| # | Question | Answer |
|---|---|---|
| 1 | Does NativeWind survive the static web export to Cloudflare Pages? `S-2` verified this for Tamagui, and `ADR-012`'s entire link surface (two of three user flows) rides on it | **Yes.** Re-verified before any screen was ported and again after. All 13 routes export, `_redirects` ships, the `/s/*` rewrite serves the token page, and `S-2` F-2's rule holds — the invalid-link state is absent from the prerendered HTML, confirmed with JavaScript disabled. NativeWind emits one external stylesheet where Tamagui inlined `<style>` per page, which helps this surface: the token page's HTML fell 165 KB → 19 KB. `risks.md` R-2 closed |
| 2 | Does dropping Tamagui actually remove the reanimated coupling of reason 2, or do RNR's primitives reintroduce it? | **Re-sourced, not retired.** Tamagui's chain (`@tamagui/config` → `@tamagui/animations-reanimated`) does leave, but `nativewind` → `react-native-css-interop` declares `react-native-reanimated >=3.6.2` as a **non-optional** peer, and RNR's own `select.tsx` imports reanimated directly. Expo Router's reanimated peer is optional, so it is not the source either way. `risks.md`'s inherited SDK-bump constraint keeps its force under a new owner, and **reason 2 of this ADR is weaker than it looked** — the decision still stands on reasons 1 and 3 |

**Reason 2 is worth re-reading in that light.** It argued that `@tamagui/config` pulls reanimated
"regardless of which animation driver is chosen, which cost two separate native build failures".
That was true, and the failures were real — but the replacement carries the same dependency, so
the swap did not buy what reason 2 implied it would. It did not change the outcome: reason 1
(theming) is what decided it, per the Decision section.
