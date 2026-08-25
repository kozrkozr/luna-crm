# ADR-015 — Email and password for authentication; phone optional

- **Date:** 2026-08-25
- **Status:** accepted
- **Phase:** 04-tech
- **Deciders:** owner (chosen at the phase-05 review, 2026-08-25)

## Context
`US-001` (register) and `US-013` (log in) both explicitly left auth mechanics to 04-tech, and
neither names a credential. `04-tech/data-model.md` required only that a `User` carry **email or
phone**, so an account could exist with no email address at all — which left password reset with
no defined path (`04-tech/risks.md` R-6, `04-tech/open-questions.md` #5). This blocked `EP-01`,
the first epic in `04-tech/backlog-order.md`.

Separately, `02-product/open-questions.md` item 8 (answered 2026-08-22) had already settled that
a manually-added crew member is matched to a later self-registered account **by email or mobile
phone**, and item 10 made phone-or-email *required* on the add-crew form for exactly that reason.
So whatever credential registration uses, both keys must remain available for matching.

## Options considered
### Option A — Email + password required, phone optional (chosen)
- **Pros:** password reset is built into Supabase Auth (`ADR-011`) and costs nothing; no SMS
  provider joins the architecture, so the monthly floor stays flat at $34.35 rather than becoming
  variable per login; one auth flow to build and test
- **Cons:** a person added as crew by phone number only must also enter that phone on their
  profile before the `user_id` match in `data-model.md` can fire — the match is not automatic
  from the credential alone

### Option B — Phone + SMS one-time code, no password
- **Pros:** closest to how crew are actually added (`US-005` accepts a phone); nothing to forget,
  so no reset flow exists at all
- **Cons:** an SMS provider and a **per-message charge on every login**, converting a flat cost
  floor into one that scales with usage; SMS deliverability to Ukrainian numbers would need its
  own spike before the choice could be trusted

### Option C — Either email or phone, the user's choice
- **Pros:** most flexible; matches `data-model.md` exactly as it was written
- **Cons:** a phone-only account still needs SMS-based reset, so the provider and its cost arrive
  anyway — this buys Option B's cost *and* Option A's complexity, plus two auth flows to build
  and test instead of one

## Decision
Option A. The deciding reason: it is the only option that keeps password recovery free and the
cost floor flat, and the friction it introduces falls on an already-optional capability
(`US-009`, a `should`) rather than on logging in.

## Consequences
- **Accepted cost:** crew-to-account matching is no longer automatic for someone added by phone
  alone — they must supply that phone on their profile. This lands on `US-009`, which
  `04-tech/risks.md` R-3 already flags as a `should` carrying a whole user journey.
- **Now easier:** `EP-01` is unblocked and can start. `04-tech/risks.md` R-6 is retired: reset is
  email-based and free.
- **Now harder:** a photographer who works only by phone number cannot register at all without an
  email address. Nothing in the sources suggests that is the case for Ilona or her audience, but
  it is an assumption this decision makes rather than a fact it rests on.
- **Revisit when:** a real user cannot or will not give an email address, or if `US-009` adoption
  turns out to hinge on matching happening without the user doing anything.

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `04-tech/data-model.md` | `User.email` becomes **required**; `User.phone` optional |
| `04-tech/risks.md` | R-6 retired |
| `04-tech/open-questions.md` | #5 answered |
| `US-001`, `US-013` | credential is now specified; neither story's AC changes |

## Open questions
None.
