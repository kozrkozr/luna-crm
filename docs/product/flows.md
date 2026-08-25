# Flows — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Derived from:** `02-product/prd.md`, all epics/stories under `02-product/epics/`
- **Date:** 2026-08-23 (revised after two rounds of Ilona's review, `reviews/r01-2026-08-23/`
  and `r02-2026-08-23/`)

Three flows, each spanning multiple epics — chosen because this is where the product's actual
value (one record instead of five scattered tools) is visible, not because each epic needs its
own flow.

## Flow 1 — Shoot creator sets up, adjusts, and closes out a shoot
*(EP-01 → EP-02 → EP-03)*

1. Register an account, select a professional role, and optionally add a social-media field
   (`US-001`), or log in if already registered (`US-013`).
2. From the shoot list — a calendar plus a list, empty on first use (`US-004`) — create a new
   shoot with client contact info and date (`US-002`; location is no longer collected here).
3. Attach references, either a pasted link or an image from the phone's gallery (`US-003`);
   once there are more than fit, the rest live on a dedicated page (`US-021`).
4. Add crew members manually by name, role, phone or email, and optional notes (`US-005`).
5. Generate and share each crew member's own link, now attached to their row in the crew list
   (`US-006`).
6. Edit the shoot later — date, and location with its own address+notes section
   (`US-018`) — or set a raw-files/finished-photos link for the client (`US-024`/`US-025`).
7. Mark the shoot Finished once it's done, or Delete it if it was a mistake (`US-020`,
   `US-019`).
8. Remove a crew member if plans change (`US-022`); see who has confirmed or declined
   (reflects `US-008`, seen from the creator's side).
9. Check a personal profile and log out when done (`US-016`, `US-017`).

## Flow 2 — Crew member responds to a booking and meets the rest of the crew
*(EP-03, via a link — no account)*

1. Open the link sent for a specific shoot (`US-006`).
2. See the shoot's date, location, references up to the display limit, and the rest of the
   crew (`US-007`).
3. Click through to another crew member's *complete* details, including notes — the same
   info the creator entered (`US-023`).
4. Confirm or decline (`US-008`) — a submitted response is final in v1.
5. *Error path:* open a link that's been invalidated (the person was removed from the shoot) —
   see a clear "this link no longer works" state, not shoot data (`US-007` AC-2).

## Flow 3 — Client views their shoot and checks on the team and deliverables
*(EP-04, via a link — no account)*

1. Open the client link for a shoot (`US-010`).
2. See the shoot's date, location, team, and references, entirely read-only — reacting to
   references was tried and then removed (`US-011`, retired; `decisions/ADR-009-*.md`).
3. Click through to a crew member's details — same as crew see each other, minus notes
   (`US-026`).
4. Check the raw-files and finished-photos sections — a placeholder, or the link the creator
   pasted in (`US-024`, `US-025`).

## Not a separate flow
Localization (`US-014`/`US-015`) is a cross-cutting UI control (language switch in the header
for registered accounts only), not its own flow.
