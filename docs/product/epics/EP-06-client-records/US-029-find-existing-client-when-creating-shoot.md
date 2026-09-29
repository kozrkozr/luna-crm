# US-029 — Find an existing client when creating a shoot

- **Parent epic:** [EP-06 — Client records](EP-06.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **the client field to recognise someone I have booked before**,
so that **I do not retype their number, and I do not end up with three copies of the same
person**.

## Context
Specified by the `client-match-flow` mockup, the most logically involved of the six. The matching
rule below **is the prototype's own JavaScript**, chosen as-is by the owner (chat, 2026-08-28)
over a stricter phone-as-identity alternative. It is recorded here rather than left in the
mockup because it is a product rule, not a UI detail.

The rule is **advisory**. A phone collision asks a question; answering "no" creates a second
profile, so two profiles may share a number and no unique index prevents it (`ADR-018`,
Decision). That is the accepted consequence of matching this way.

All searching is scoped to the creator's own clients by RLS — one photographer never sees
another's client list.

## Acceptance criteria

### AC-1 — Name suggests matches
- **Given** a creator filling in the client field on the creation form (`US-002`)
- **When** they have typed at least 2 characters
- **Then** clients whose name contains that text, case-insensitively, are offered in a list
  showing each one's name, phone and shoot count

### AC-2 — No match says so
- **Given** the creator has typed at least 2 characters
- **When** no client matches
- **Then** the form says a new client profile will be created automatically, and save is **not**
  blocked

### AC-3 — Choosing a match attaches the client
- **Given** the suggestion list is open
- **When** the creator picks a client
- **Then** the field is replaced by that client, their phone is filled in, and a way to open
  their profile (`US-028`) is offered

### AC-4 — A phone belonging to another name asks
- **Given** the creator has typed a name that matched nothing, and then a phone of at least 9
  digits
- **When** those digits equal a stored number, or a stored number ends with them
- **Then** the form asks whether this is that existing client, naming them, and waits for an
  answer before saving

### AC-5 — Declining the match creates a second profile
- **Given** the question in AC-4 is on screen
- **When** the creator answers that this is a new client
- **Then** the shoot is created against a new client profile, which may hold the same phone
  number as the existing one, and the creator is told a new profile was created

### AC-6 — Accepting the match reuses the profile
- **Given** the question in AC-4 is on screen
- **When** the creator confirms it is the same person
- **Then** the shoot is attached to the existing client, and the name typed is discarded in
  favour of the stored one

### AC-7 — Removed clients never match
- **Given** a client whose record has been soft-deleted
- **When** the creator types their name or number
- **Then** they are not offered as a match (`ADR-014`)

## Out of scope
- Merging the duplicate AC-5 permits (`EP-06` Out of scope).
- Matching by Instagram — the mockup searches name and phone only.
- Matching across creators.

## Dependencies
- `US-002` — this changes the client field on the creation form it owns.
- `US-028` — AC-3's link to the profile.

## Open questions
None of its own — the matching thresholds (2 characters, 9 digits) and the duplicate-phone
consequence are decided above, per the owner's choice.
