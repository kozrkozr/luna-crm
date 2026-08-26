# Open questions — 04-tech

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-25 (updated the same day — item 5 answered; item 1 re-sourced 2026-08-26)
- **Carries forward:** `02-product/open-questions.md` items 12–13 (still open, still
  non-blocking); `decisions/ADR-010-*.md`'s own open question, which is item 1 below and now
  carried by `ADR-016`.

Questions are never deleted or silently reworded — answered, carried, or dropped with a reason.
Nothing here was resolved by the agent's own reasoning.

## Answered this phase

| # | Question | Answer | Where |
|---|---|---|---|
| 5 | What is the login credential, and how does password reset work for a phone-only account? | Email and password required; phone optional. Reset is email-based and free — no SMS provider. `EP-01` is unblocked; `risks.md` R-6 retired | owner's answer in chat, 2026-08-25 → `decisions/ADR-015-*.md` |

## Still open

**1. Is this product iOS-only, or does it need Android?** *(carried from `ADR-010`, now `ADR-016`)*
Both UI-layer decisions kept cross-platform capability partly *because* it was free, but nobody
has said Android is wanted. **Blocks:** whether the more-native, iOS-only options (`ADR-010`
Option A/B, `ADR-016` Option C) should have won on the owner's own "authentic Apple look"
priority; also $25 one-time for Google Play and a doubled build/test matrix. **If iOS-only:**
the UI-layer choice deserves a third look — note that code now exists, so this is no longer free
to reverse.

**2. Who pays the $34.35/month floor before subscriber #7?**
Infrastructure costs $34.35/mo from the day the app is live, and the $5/month price point needs
7 paying subscribers to cover it (`architecture.md`). **Blocks:** nothing technical — but it
decides whether the build starts before any revenue exists, and that is a decision, not a
detail.

**3. Is `US-009` in v1 or not?**
It is marked **should** in `prd.md` (R-08) and left out of the prototype, yet PRD Journey 3 is
entirely `US-009`, and it is the only reason a crew member would ever register
(`risks.md` R-3). **Blocks:** whether v1 is single-player. Not re-scoped by this phase — the
owner's call.

**4. How does a crew link actually reach a crew member?**
`US-006` deliberately left delivery unspecified. Manual copy-paste costs nothing. In-app SMS or
email sending means a provider and a **per-message** charge, turning a flat $34.35/mo floor into
a variable one. **Blocks:** the cost model, and whether a fifth third-party service joins
`architecture.md`.



## Carried, unchanged
- **`02-product/open-questions.md` #12** — what tapping a calendar date does. Still open, still
  built as its simplest version. No technical bearing.
- **`02-product/open-questions.md` #13** — whether the profile becomes editable. Still open. If
  yes, it is a small story, not an architectural change.

## Carried, closed — tracked as risk, not fact
**Market validation.** Unchanged from `02-product/open-questions.md` item 4: the owner decided
not to pursue it. Restated in `risks.md`'s top section only because 04-tech is the first phase
that can price the other side of that bet.

## Dropped
None.
