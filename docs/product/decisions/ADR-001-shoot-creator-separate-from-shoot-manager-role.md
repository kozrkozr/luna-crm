# ADR-001 — Separate "who owns this shoot" from "what is my profession"

- **Date:** 2026-08-22
- **Status:** accepted
- **Phase:** 00-intake
- **Deciders:** owner, agent

## Context
The owner initially wanted one word to name "the primary user" of the app. On the call
(`00-intake/s02-2026-08-22/transcript.md`, lines 14–120) that collapsed two different things
into one: (a) a professional identity chosen at registration — photographer, stylist, gaffer,
or someone who mainly coordinates ("shoot manager") — and (b) whoever happens to have created a
given shoot and holds edit rights over it. Reusing one name for both broke down as soon as a
stylist creates her own shoot: is she now a "manager"? "Організатор" [organiser] and
"менеджмент" [management] were both proposed and rejected on the call itself (lines 37–40).

## Options considered
### Option A — One universal role name for "the primary user"
- **Pros:** simpler glossary, one concept to teach
- **Cons:** already failed twice on the call (organiser, management rejected); conflates a
  professional identity with a per-shoot permission, which breaks the moment someone acts in
  both capacities

### Option B — Two separate concepts: profession (chosen at registration) and per-shoot creator
- **Pros:** matches how the owner actually described the system once pressed (lines 106–120);
  a stylist can be a "shoot creator" for her own shoot and a regular crew member on someone
  else's, with no relabeling
- **Cons:** two terms to maintain in the glossary instead of one

### Option C — Do nothing / defer naming
- **Pros:** avoids a possibly-wrong choice
- **Cons:** blocks every later artifact that needs to name a role or a permission

## Decision
Option B: "shoot manager" [менеджер зйомок] stays as one selectable professional role; "shoot
creator" [автор зйомки] separately names whoever created and owns a specific shoot — chosen by
the owner directly, 2026-08-22 chat, over "shoot owner" and "shoot lead".

## Consequences
- **Accepted cost:** two related terms to explain in onboarding/glossary instead of one.
- **Now easier:** any registered user, whatever their profession, can create and own a shoot
  without a naming contradiction.
- **Now harder:** nothing structurally; reversing this means re-merging two concepts that are
  already distinct in the data model (a profession field vs. a shoot's creator reference).
- **Revisit when:** if user testing shows people confuse "shoot manager" (a profession) with
  "shoot creator" (a per-shoot permission) in the UI.

## Open questions
None — closed by the owner directly.
