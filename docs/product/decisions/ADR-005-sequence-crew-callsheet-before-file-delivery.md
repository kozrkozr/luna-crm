# ADR-005 — Sequence the crew/call-sheet half before file delivery

- **Date:** 2026-08-22
- **Status:** accepted — amended 2026-08-23 by `ADR-008-*.md`, which adds a
  placeholder/link-only file section to the Client view; real file hosting is still deferred
  exactly as decided below
- **Phase:** 01-discovery
- **Deciders:** owner

## Context
ADR-004 committed to building both halves of the product — client-facing (file delivery) and
crew-facing (call sheet, team coordination, references) — but a v1 build has to sequence the
work somehow (`01-discovery/open-questions.md`, item 2). The owner was asked which half ships
first if the MVP must be sequenced.

## Options considered
### Option A — Client-facing half first (references, raw/finished file delivery)
- **Pros:** closer to what existing competitors already validate as sellable (Pixieset,
  `01-discovery/competitors.md`)
- **Cons:** does not touch the pain the owner led with — team coordination, not file delivery
  (`00-intake/s01-2026-08-20/transcript.md`, lines 150–182)

### Option B — Crew/call-sheet half first (team, references, logistics; no file delivery yet)
- **Pros:** matches the owner's own priority, stated directly; file delivery ("what happens to
  the shoot afterward") can be figured out once the coordination half is proven
- **Cons:** ships without the "deliver finished photos to the client" loop that was part of the
  original pitch (`00-intake/s01-2026-08-20/transcript.md`, lines 48–51) — that gap has to be
  closed before v1 is a complete replacement for her current tools

### Option C — Build both halves at once, no sequencing
- **Pros:** avoids shipping a partial product
- **Cons:** contradicts the reason for asking this question — a v1 build cannot do both at
  once; not a real option

## Decision
Option B — the crew/call-sheet half (client info, references, team, logistics) ships first;
raw/finished file delivery is deferred and revisited once that half is working. Owner's answer,
verbatim: «команда/кол-шит, з файлами пізніше розберемось вдруг що» [team/call-sheet, we'll
figure out the files later if it comes to that] (chat, 2026-08-22).

## Consequences
- **Accepted cost:** v1 does not yet replace the file-sharing service or delivery site she
  uses today (`00-intake/s02-2026-08-22/transcript.md`, lines 199–216) — those stay in use
  alongside the new tool until file delivery is built.
- **Now easier:** the epic list in 02-product can scope v1 tightly around one coherent flow
  (client + references + team + logistics) instead of two.
- **Now harder:** nothing structural — a shoot record already needs a place for files
  conceptually (`00-intake/s01-2026-08-20/transcript.md`, lines 49–51); this defers building
  that surface, not redesigning around its absence.
- **Revisit when:** the crew/call-sheet half is in real use and the owner decides whether file
  delivery is still needed, and if so, when.

## Open questions
None — this is the owner's own stated decision.
