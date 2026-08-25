# ADR-014 — Link validity is derived from soft-deleted parent rows, not stored on the link

- **Date:** 2026-08-25
- **Status:** accepted (phase-04 gate, 2026-08-25)
- **Phase:** 04-tech
- **Deciders:** agent (proposed); owner accepted at the phase-04 gate, 2026-08-25

## Context
The owner settled link lifetime already: links never expire on a timer. A crew link stops working
only when that person is removed from the shoot; a client link only when the shoot itself is
removed (`02-product/open-questions.md`, item 7 — answered 2026-08-22).

So revocation is not a feature of its own — it is a side effect of two existing actions, `US-019`
(delete a shoot) and `US-022` (remove a crew member). The question this ADR settles is where that
side effect is recorded. It matters because `US-008` stores a confirm/decline response **on the
crew member being removed**, so how removal is implemented decides whether that response survives.

## Options considered
### Option A — No status on the link; validity derived from soft-deleted parents (chosen)
- **Pros:** one source of truth — removing a crew member (`US-022`) or deleting a shoot
  (`US-019`) revokes access as a side effect, with no second write to keep in sync; the crew
  member's `response` (`US-008`) and the record that they were ever on the shoot both survive
  their removal
- **Cons:** soft-delete discipline must hold everywhere — any query that forgets `removed_at is
  null` resurrects a removed crew member into a live call sheet

### Option B — A `revoked_at` / status column on AccessLink
- **Pros:** explicit and directly queryable
- **Cons:** two writes per revocation, which can diverge; and `US-019` (delete a shoot) would
  have to fan out to every crew link on that shoot. A cascade dressed up as a column

### Option C — Hard delete the parent rows
- **Pros:** simplest possible revocation; no discipline required
- **Cons:** revocation becomes destructive. Cascading the delete takes the crew member's
  confirm/decline response with it, so "who had actually confirmed before I removed them" is
  unanswerable; re-adding the same person starts from nothing; and the shoot loses any record
  that they were ever on it. Note this option **does** satisfy `US-007` AC-2 — a vanished token
  and a revoked one can render the same "no longer valid" state — so AC-2 is not what decides
  this

## Decision
Option A. The deciding reason is that revocation should be a *consequence* of `US-019`/`US-022`
rather than a second write that can drift from them — and that a crew member's response history
should outlive their removal from the shoot.

## Consequences
- **Accepted cost:** every read path must filter soft-deleted rows. This is the most likely place
  for a bug in v1, and the bug's shape is a removed person still appearing on a shoot.
- **Now easier:** revocation is free — it falls out of `US-019` and `US-022` with no extra
  mechanism; "no expiry" (item 7) is honoured by *absence*, so no timer logic can drift from the
  owner's decision; and the gateway can distinguish a revoked token from one that never existed,
  which is worth nothing to the UI (both render one state, `US-007` AC-2) but a great deal to
  support — "she says she removed him" becomes answerable from the data.
- **Now harder:** a genuine GDPR-style "erase this person" request is no longer a delete. Not a
  v1 requirement, and not raised by the owner — noted because the personal-data exposure in
  `prd.md`'s R-20/R-24 risk row already touches this ground.
- **Revisit when:** an actual erasure obligation appears, or the soft-delete filter is missed in
  practice — at which point the fix is a filtered view per table, not a change of decision.

## Open questions
None.
