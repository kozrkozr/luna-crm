# S-5 — Phone normalization and crew-to-account matching

- **Retires:** `risks.md` R-3's technical half — "the real work is the email/phone matching
  underneath it"
- **Assumed effort:** 1–2 days (`risks.md`, Spikes)
- **Date:** 2026-08-27
- **Status:** **normalization is solved; matching is solved; one half of it cannot fire in v1
  as built.** See F-3, which is the finding worth the spike.

## What the spike was for
`US-009` gives a self-registered crew member one view of every shoot they are on, across
photographers. `data-model.md` says the storage side is nearly free — "a query, not a table: the
`CrewMember` rows where `user_id` = me" — and that the cost is the matching.

Matching means deciding that the person a photographer typed into a crew form is the person who
later registered an account. The keys available are email and phone (`US-005` AC-2 requires one
of them). Phones are the hard part: a photographer types them however they think of them, and
`ADR-015` made phone optional at registration, which `risks.md` R-6 notes moved "residual cost
to R-3 — crew-to-account matching is no longer automatic for someone added by phone alone".

## What was built
A Postgres normalization function and a candidate matching rule, both in a throwaway `s5` schema
against the local database, driven by a table of the formats a Ukrainian photographer would
plausibly type. Nothing in this spike touched a real table.

## Findings

### F-1 — Ukrainian phone formats normalize cleanly. 21 of 21 cases. *(the easy half)*
Strip everything that is not a digit, then interpret by length and prefix:

| digits | shape | example typed | result |
|---|---|---|---|
| 12, starts `380` | international | `+38 (050) 111-22-33` | `+380501112233` |
| 11, starts `80` | old intercity | `80501112233` | `+380501112233` |
| 10, starts `0` | domestic | `050 111 22 33` | `+380501112233` |
| 9 | no trunk prefix | `50 111 22 33` | `+380501112233` |
| anything else | — | `+1 555 010 0000` | `null` |

Spaces, non-breaking spaces, parentheses, ASCII and Unicode dashes, surrounding whitespace and a
trailing note (`+380501112233 (Telegram)`) all normalize to the same string. So does a bare
9-digit form, which is the one concession to guesswork and is noted in F-2.

### F-2 — Refusing to guess is the whole safety property *(a design decision, not an observation)*
An unrecognized value returns `null`, and `null` never matches anything — not even another
`null`. A foreign number, a name, an Instagram handle or a half-typed number produces no match
rather than a wrong one.

This is deliberately asymmetric. A **missed** match is an inconvenience: a crew member does not
see a shoot on their schedule, and the photographer's link still works exactly as it did. A
**wrong** match shows one person another person's shoots, across photographers — a privacy
failure, in the one feature whose entire point is aggregating across accounts. Every ambiguity
below resolves toward the miss.

Two ambiguities were found by testing rather than by reasoning, and both would have silently
produced a wrong match under an obvious `limit 1` implementation:

| case | candidates | rule's answer |
|---|---|---|
| crew row carrying one person's email and another's phone | 2 | no match |
| two accounts registered with the same phone (there is no unique constraint on `users.phone`) | 2 | no match |

So the rule is **match only when exactly one user matches**, never "the first user found".
Email is compared case-insensitively and trimmed, which is how three of the ten scenarios pass.

### F-3 — Phone matching cannot fire in v1 as built *(the finding worth the spike)*
The registration form collects name, email, password, role and social handle. **It does not
collect a phone**, and there is no profile editing (`docs/open-questions.md` #4). The column
exists, the trigger already reads `raw_user_meta_data ->> 'phone'`, and nothing ever supplies it.

Measured on the local database:

```
users with a phone:            0 of 715
crew members added email-only: 24 of 379
crew members added phone-only: 355 of 379
```

**The first number is structural**; the second and third are not. Those 379 crew rows are
fixtures from the acceptance suites, and they skew phone-heavy because `US-005`'s placeholder
reads «+380… або email» and my fixtures followed it. They are not evidence about photographers.

But `0 of 715` is not fixture bias — no code path can set `users.phone`, so the phone half of
the matching rule is unreachable, and a crew member added by phone alone can never be matched to
an account. That is `R-6`'s "residual cost moved to R-3", and it is not a degradation: it is
total, for that population.

**This does not block `US-009`.** Matching by email works, and the story's AC-1 is satisfiable
whenever the photographer used an email. The normalization is worth building anyway — it is
cheap, it is correct, and it starts working the day a phone can be entered — but it should not
be described as working when nothing can exercise it.

**What would make it fire** is a phone field at registration or an editable profile. Neither is
in any story. Recorded as `docs/open-questions.md` #24; related to #4.

### F-4 — Matching has to run in both directions, as a definer
`US-009` AC-1 says "added to two different shoots by two different creators" and does not say
whether the person registered before or after being added. Both orders must work, so matching
runs twice:

- when an account is created — over the crew rows that already exist
- when a crew member is added — against the accounts that already exist

Both must be `security definer`. RLS restricts `users` to `auth.uid() = id`, so a photographer
adding a crew member cannot read the `users` table to find a match, and should not be able to:
being told which of the contacts they type has an account is a disclosure no story asks for.
The photographer's own query never sees `users`; the trigger does the lookup and writes only
`crew_members.user_id`.

## What this changes
- `US-009` is buildable, by email.
- The normalization and the exactly-one rule go in as written here.
- One gap is named rather than discovered later: phone-added crew cannot be matched until
  something collects a phone from a registering user.
