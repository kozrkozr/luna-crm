# ADR-018 — The client becomes a persisted entity with cross-shoot identity

- **Date:** 2026-08-28
- **Status:** accepted
- **Narrows:** `data-model.md` — "the client is **fields on the shoot, not an account**" and
  "No global crew/person table"
- **Extends:** `ADR-013` — a third visibility level, owner-only, above crew and client
- **Does not change:** `ADR-003` (manual crew entry, no crew directory), `US-010` (no client
  ever registers)
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-08-28)

## Context
Today a client is two `not null` text columns on the shoot — `client_name`, `client_contact`.
Booking the same client three times produces three unrelated strings with nothing tying them
together. That was a deliberate simplification: `US-010` establishes that no client ever
registers, so there seemed to be nothing for an entity to hang on.

The design system adopted in `ADR-017` requires more than that. Two of its six mockups —
`client-profile-screen` and `client-match-flow` — describe a client that exists **between**
shoots:

- a profile screen with shoot count, first-shoot date, completed count, and full shoot history;
- notes labelled «зберігається між зйомками» [kept between shoots];
- contacts auto-filled at creation with «Контакти підтягнулись автоматично — ця клієнтка вже
  знімалась раніше» [contacts filled in automatically — she has shot with you before];
- a name/phone search with deduplication when creating a shoot.

None of that is expressible over two text columns. The client needs identity that outlives one
shoot, which makes it an entity.

**Why this does not contradict `ADR-003`.** `ADR-003` rejected a searchable crew directory with
visible availability, and its reason was cold start: "at launch there are no registered gaffers,
stylists, or makeup artists to search" — a two-sided marketplace that is empty until strangers
join. A client record has neither property. It is **single-sided** (nobody but the photographer
ever reads it), **private to one creator**, and **self-populating** — it fills as she creates
shoots, so it is useful on the second booking and never empty in a way that matters.
`ADR-003`'s reasoning does not reach it, and crew entry is untouched by this ADR.

**The resulting asymmetry is deliberate and worth stating**, because it looks inconsistent until
you see why: crew stay per-shoot rows, clients become entities. The reason is `user_id`. A crew
member can self-register and become a `User`, so their cross-shoot identity already has somewhere
to live — `CrewMember.user_id`, a match result (`open-questions.md` item 8, `US-009`). A client
never registers (`US-010`), so nothing else can carry their identity. If the client is to be
recognised on a second booking, a client row is the only place that recognition can be stored.

**`US-010` is unaffected.** A profile is a record the photographer keeps about someone, not an
account that someone holds. The client still arrives by token with no credentials, sees read-only
information, and cannot log in. Nothing in this ADR gives a client a way to authenticate.

## Options considered
### Option A — keep the two text columns, drop the two client mockups
- **Pros:** no schema change, no migration, no new table in `ADR-014`'s soft-delete rule or
  rule 2's blast radius; `data-model.md` stays as written
- **Cons:** discards the strongest new idea in the design system. Notes that persist between
  shoots are the one thing here that a photographer's spreadsheet cannot do, and they are the
  reason the profile screen exists. Without an entity, «зберігається між зйомками» is a lie on
  the screen

### Option B — a `clients` table, private per creator (chosen)
- **Pros:** identity across shoots, so notes, history and auto-filled contacts all follow from
  one mechanism; scoped by `creator_id` under RLS exactly as `shoots` already is; no new access
  model, since the client still never authenticates
- **Cons:** a real migration on a `not null` column pair; a third table that every read must
  filter for `deleted_at` (`ADR-014`); two more fields the link gateway must never leak; the
  dedup rule is advisory, so duplicate profiles are possible

### Option C — one `persons` table shared by crew and clients
- **Pros:** one contact record per human, no duplication between a client who is also
  occasionally crew; the eventual crew directory of `ADR-003` would build on it
- **Cons:** reverses `ADR-003` for crew, which nothing asks for. It also breaks the reason crew
  are per-shoot rows: a `CrewMember` row carries per-shoot `role`, `note`, `response` and
  `removed_at`, none of which belong to a person. This is a bigger change than the mockups
  require, made for a feature that is deferred indefinitely

## Decision
Option B.

**Shape.** A `clients` table owned by one creator: `id`, `creator_id` → `User`, `name`, `phone`,
`instagram`, `notes`, `created_at`, `deleted_at`. `shoots.client_id` → `clients`, **`not null`** —
today's `client_name` and `client_contact` are both `not null`, so a shoot has always had a
client and that stays true. The two text columns are dropped once the migration has moved them.

**Migration.** One client row per existing shoot, with **no retroactive deduplication.** Existing
`client_name` becomes `name`, `client_contact` becomes `phone`. Applying the new dedup rule
backwards to historical rows would silently merge records on a rule nobody applied when they were
entered; creating one row each preserves exactly what is there, and any real duplicates surface
in the UI where the photographer can see them. Merging profiles is out of scope (open question 2).

**Dedup rule** — mirrors the prototype's own JavaScript, which the owner chose as-is over a
stricter alternative:
- **Name:** case-insensitive substring match, from 2 characters typed.
- **Phone:** digits only; matches on exact equality, or when the stored number ends with what was
  typed, from 9 digits.
- Both searches are scoped to the creator's own clients by RLS.
- When a typed phone matches a profile with a different name, the flow asks; answering
  «Ні, новий клієнт» creates a second profile. **Two profiles may therefore share a phone
  number.** This follows directly from mirroring the prototype and is recorded because it is
  surprising: the dedup is a suggestion, not a constraint, and no unique index enforces it.

**Visibility.** Three levels, `ADR-013` extended:

| Field | Owner | Crew link | Client link |
|---|---|---|---|
| `clients.name` | yes | **no** | no — it is their own name, but nothing needs to send it |
| `clients.phone`, `clients.instagram` | yes | **no** | **no** |
| `clients.notes` | yes | yes — *implied, not built: see below* | **no** |
| `CrewMember.note` (existing) | yes | yes | **no** |

The "yes" for crew on `clients.notes` is **inferred from a label, not from a screen.** The design
system tags that section «Бачить лише команда» [only the team sees it] on the *owner's* profile
screen, which implies crew may see it — but no mockup shows a crew link view at all, so nothing
specifies where or how. Per `CLAUDE.md` rule 1 this is not built: `clients.notes` stays
owner-only in code until a story says otherwise, which keeps the field strictly less exposed
than the label suggests rather than more. Tracked as `open-questions.md` item 15.

The cheap part: **the gateway already omits client identity.** Its `ShootRow` type selects
`id`, `date`, `location_*` and the two file URLs and nothing else, so no link audience has ever
seen `client_name` or `client_contact`. Owner-only is therefore not a new branch in the gateway —
it is the existing behaviour, now named and given a reason to stay that way even though a richer
client record exists to tempt someone into exposing it. The one genuinely new case is
`clients.notes`, which behaves exactly like `CrewMember.note`: present for crew, absent for the
client.

So `ADR-013` gains a level conceptually while the gateway gains no third code path. What changes
is the count of fields under `CLAUDE.md` rule 2: **two** the client must never receive
(`CrewMember.note`, `clients.notes`) and **two** nobody but the owner may receive
(`clients.phone`, `clients.instagram`).

## Consequences
- **Accepted cost:** a new table with RLS, a migration on two `not null` columns, and the dedup
  UI. Duplicate client profiles are possible by design, including two profiles sharing one phone
  number.
- **Now easier:** the product's genuinely new capability — notes about a client that persist
  between shoots, and contacts that fill themselves in on the second booking. Shoot history per
  client falls out of the same relation.
- **Now harder:** `risks.md` names a forgotten soft-delete filter the most likely bug in v1, and
  this adds a third table with a `deleted_at` to forget. Rule 2's surface doubles from one field
  to four, and two of those must be withheld from **both** anonymous audiences rather than one —
  a distinction easy to lose when adding a field to the gateway later.
- **Unchanged:** `ADR-003`, `ADR-013`'s mechanism, `ADR-014`, `US-010`. Crew remain per-shoot
  rows with no directory.
- **Revisit when:** a client is ever given an account, which would reverse `US-010`; or when
  duplicate profiles become common enough in real use that merging stops being optional.

## Open questions
| # | Question | Blocks |
|---|---|---|
| 1 | **Deleting a client who has shoots.** Soft delete per `ADR-014`, but what does the shoot then show — the last known name, or does the delete refuse while shoots reference it? The mockups have no delete action on the profile screen at all | The profile screen's action menu. Not the migration or the schema |
| 2 | **Merging two profiles.** Follows directly from a dedup rule that permits duplicates. Not in the mockups, so out of scope for now — recorded so it is not mistaken for an oversight | Nothing in v1 |
| 3 | **Does the crew link view show the client's name?** It does not today, and this ADR keeps it that way. But a crew member arriving at a shoot arguably needs to know whose shoot it is, and no story covers the question either way | Nothing — current behaviour is the default. Would be a new story |
