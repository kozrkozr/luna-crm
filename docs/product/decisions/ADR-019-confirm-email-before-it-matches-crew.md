# ADR-019 — Confirm the email at registration, and match crew by a confirmed email only

- **Date:** 2026-09-29
- **Status:** accepted
- **Amends:** `US-001` AC-1 — registration no longer lands straight on the shoot list
- **Narrows:** `data-model.md` — `User.email` is a crew-match key only once confirmed
- **Does not change:** `ADR-015` (email + password, phone optional), the phone match key
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-09-29)

## Context
`US-001` AC-1 says a registered user "land[s] on their (empty) shoot list". The build honoured
that literally: email confirmation is off, so `signUp` returns a session at once.

The build then surfaced a consequence (build repo, `docs/open-questions.md` #31). `CrewMember`
rows are matched to a `User` by email or phone (item 8/10, `ADR-015`), and `US-009`'s schedule
aggregates a matched account's shoots **across every photographer**. Neither key is verified.
Anyone who registers with an address they do not own inherits that person's crew rows — dates,
locations and the crew's notes on other photographers' shoots.

Two facts made confirmation cheap on 2026-09-29, which is why this is being decided now rather
than at `US-009`: the production project sends mail through its own SMTP on a verified domain,
and the recovery link was tested opening the app from both Mail and Gmail on an iPhone. The
confirmation link rides the same mechanism.

## Options considered
### Option A — confirm the email; only a confirmed email matches (chosen)
- **Pros:** closes the email half of #31 with infrastructure already in production; the phone
  key and `ADR-015`'s consequence are untouched
- **Cons:** registration gains a step — leave the app, open the mail, come back. The phone half
  of #31 stays open: an account can still claim crew rows with a number it does not own

### Option B — Option A, and drop the phone as a match key
- **Pros:** closes #31 completely
- **Cons:** reverses `ADR-015`'s stated consequence — a person added as crew by phone alone can
  never be matched

### Option C — the crew link's own token is the claim
- **Pros:** every crew member already holds an unguessable per-person `AccessLink`; registering
  from it proves identity for both keys, with no extra step and no SMS
- **Cons:** a new registration entry point and a change to `US-009`'s journey — a feature, not
  a setting. Nothing about it is ready today

### Option D — do nothing until more than one photographer uses the product
- **Pros:** no work; for a closed beta of known testers the risk is theoretical
- **Cons:** beta and release share one production database, so matches made unverified during
  the beta persist into the release

## Decision
Option A — it closes the half of the risk that can be closed with what is already running, and
it reverses no accepted decision.

## Consequences
- **Accepted cost:** one more step in registration, and the first screen after it is a "check
  your mail" screen rather than the shoot list. The phone half of #31 remains open.
- **Now easier:** `US-009` can trust an email match.
- **Now harder:** nothing is closed off. Switching confirmation off again reverts the flow;
  matching simply resumes on unconfirmed addresses.
- **Revisit when:** a second, unrelated photographer relies on `US-009` — then the phone half
  needs Option B or C.

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `US-001` | AC-1 rewritten; AC-3 (login before confirming) and AC-4 (an invalid link) added |
| `04-tech/data-model.md` | `User.email` and `User.phone` rows say email matches only once confirmed |
| `ADR-015` | unchanged — its phone consequence stands |

## Open questions
None. The copy for the new screens was approved in the same chat and is recorded in
`02-product/reviews/r06-2026-09-29/notes.md`.
