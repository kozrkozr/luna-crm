# ADR-010 — React Native with Tamagui as the UI stack

- **Date:** 2026-08-23
- **Status:** accepted
- **Phase:** 04-tech (decided early, in a 03-design chat, ahead of that phase formally starting)
- **Deciders:** owner

## Context
While reviewing the design-canvas prototype, the owner stated an authentic Apple look is a
priority for the eventual build (chat, 2026-08-23; noted in this file's parent `CLAUDE.md`
under "Local notes"). We discussed the realistic options for hitting that bar and their
platform trade-offs. The owner then directly chose one: "давай виберемо tamagui" [let's go
with Tamagui].

## Options considered
### Option A — Native SwiftUI (iOS only)
- **Pros:** maximum fidelity to Apple HIG — it *is* Apple's own component set
- **Cons:** iOS-only, no Android path; also outside what this repository can hold or build
  (the root `CLAUDE.md` rule 6 — no build tooling/native code here, only HTML/React prototypes)

### Option B — React Native + `@expo/ui`
- **Pros:** wraps genuine native SwiftUI components (via `UIHostingController`), so closer to
  authentic than a styled-to-look-native kit
- **Cons:** young/experimental, covers only a limited set of standard controls — not a full
  component library yet

### Option C — React Native + Tamagui (chosen)
- **Pros:** cross-platform (iOS + Android) from one codebase; can be styled to closely
  resemble native iOS conventions; mature enough for a full app's component needs
- **Cons:** styled-to-resemble, not literally native Apple components — some fidelity gap
  against Option A/B remains

### Option D — React Native + a Material-style kit (Paper, NativeBase)
- **Pros:** most mature, most examples
- **Cons:** wrong visual language for an "authentic Apple look" goal — ruled out earlier in
  the same conversation

## Decision
Option C. Build on React Native with Tamagui. The owner picked this directly; no further
reason was given beyond the general "authentic Apple look" preference already on record.

## Consequences
- **Accepted cost:** some visual fidelity gap vs. native SwiftUI or `@expo/ui` — Tamagui
  approximates the Apple look rather than using Apple's real components.
- **Now easier:** one codebase covers iOS and Android, if Android ever matters for this
  product.
- **Now harder:** nothing structural yet — no code has been written against this decision.
- **Revisit when:** an actual build attempt shows Tamagui can't hit the visual bar the owner
  wants, or Android support turns out not to matter and native SwiftUI's extra fidelity
  becomes worth the iOS-only trade-off.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | Does this product need Android at all, or is it iOS-only for the foreseeable future? | Whether Option A/B (more native, iOS-only) should have been preferred over Option C |
