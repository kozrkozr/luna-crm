# Luna Shoots — build repository

A CRM where a solo photographer keeps one record per shoot — client info, references, crew,
location, status — and shares it by link with crew and clients who have **no account and no app
installed**.

## The specification lives in `docs/product/`
Frozen snapshot from the discovery repo (`~/WebstormProjects/my-ai-agency/clients/001-luna-crm/`).
**Read-only.** Start with `docs/product/HANDOFF.md`, then `docs/product/backlog-order.md`.

**Never edit `docs/product/`.** A product change goes to the discovery repo first (story or ADR),
then the folder is re-copied. See `docs/product/README.md`.

## Stack
- **App:** React Native + React Native Reusables / NativeWind, Expo Router (`ADR-016`,
  superseding `ADR-010`) — iOS first
- **Link views:** the same codebase exported to static web, served by Cloudflare Pages (`ADR-012`)
- **Backend:** Supabase — Postgres, Auth, Storage, Edge Functions (`ADR-011`)
- **Auth:** email + password required, phone optional (`ADR-015`)

Development costs $0 — Supabase Free, Pages Free, local Xcode builds. See
`docs/product/architecture.md`, Stage 1.

## Rules that are not negotiable

### 1. Never invent requirements
If a story's acceptance criteria do not cover a case — an error message, a limit, a field, a
behaviour — **ask. Do not decide.** Plausible invention is the main failure mode here. Unanswered
cases go in `docs/product/open-questions.md`'s successor in the discovery repo, not into code.

### 2. A client must never receive a crew member's `note` (`ADR-013`)
`US-023` gives a crew member every field including notes; `US-026` gives the client the same
fields **minus notes**, and requires the field to be absent — "not even an empty one".

Anonymous link reads go through the **link gateway** Edge Function, which resolves the token and
builds the payload per audience. The client's response must never contain a notes value at any
point. Do not hide it in the UI. Do not return the row and filter client-side.

### 3. Every read filters soft-deleted rows (`ADR-014`)
`CrewMember.removed_at` and `Shoot.deleted_at` are how access is revoked — there is no expiry
column, deliberately. Any query that forgets the filter resurrects a removed person onto a live
shoot. `docs/product/risks.md` names this the most likely bug in v1.

### 4. Ukrainian UI copy, English code
All user-facing strings are Ukrainian by default, English switchable for registered accounts only
(`US-014`, `US-015`). Link views are Ukrainian-only, no switcher.

Identifiers, props, filenames, comments, commit messages: **English**. Russian is deliberately
excluded — never add it.

**`посилання`, never `лінк`** — one confirmed term for *link* (glossary, 2026-08-25).

### 5. Entity names come from the glossary
`Shoot`, `CrewMember`, `Reference`, `AccessLink`, `User` — as in `docs/product/data-model.md`,
which took its names from the confirmed glossary. Do not invent `Booking`, `TeamMember`, or
`ShareToken`; the code must stay greppable against the backlog.

### 6. Commits carry a story ID
`<type>(<ID>): <imperative summary>` — e.g. `feat(US-005): add crew member with contact and note`.
**One ID per commit.** A change touching two stories is two commits.

### 7. Build in the order given
`docs/product/backlog-order.md`. Spikes **S-1** (UI-layer fidelity on a device) and **S-2**
(static export of a link view) ran before any story and are **both complete (2026-08-26)** —
`risks.md` R-1 and R-2 are retired. **S-3**–**S-5** remain, each before the epic it de-risks;
both rules still apply to them: they can invalidate a foundational choice, and they are cheap
only while nothing sits on top of them.

## Things that will surprise you
- **v1 does host files**, despite "no file hosting" in the PRD's non-goals. That non-goal covers
  only raw/finished photos. `US-003` uploads gallery images, `US-005` a note image, `US-018` an
  image **or a video**. A Storage bucket and signed URLs are needed from day one
  (`docs/product/risks.md` R-5).
- **Signed media URLs expire; link tokens never do.** An idle link view can break its video while
  the page itself stays valid. Re-request the payload on media error.
- **`US-009` is a `should` that carries a whole user journey** — and is the only reason a crew
  member would ever register. Still an open question; build it last.
- **Two of three user flows have no account at all.** Test them logged out, in a real mobile
  browser, not just in the app.
