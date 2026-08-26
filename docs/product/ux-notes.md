# UX notes — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Derived from:** `flows.md`, `02-product/prd.md`, `01-discovery/glossary.md`
- **Date:** 2026-08-23 (revised after two rounds of Ilona's review, `reviews/r01-2026-08-23/`
  and `r02-2026-08-23/`)
- **Prototype:** `prototype/index.html` — open directly in a browser, no install/build/backend.

Screen inventory, mapped to the stories each one covers. All copy in the prototype is
Ukrainian by default (`CLAUDE.md`, Product UI language) and uses confirmed glossary terms.

| Screen | Covers | States | Key interactions |
|---|---|---|---|
| Вхід / Реєстрація (Login / Register) | `US-001`, `US-013` | default; validation error (no role on register; wrong credentials on login) | Toggle login/register; select a role; optional social-media field; submit — now sets a logged-in session |
| Профіль (Profile) | `US-016`, `US-017` | populated | View name/contact/role/social (read-only); log out |
| Мої зйомки (Shoot list) | `US-004` | **empty**; populated | Calendar below "new shoot" (marks shoot dates; tapping a date is an open question, `open-questions.md` #12); click a shoot; language switch; profile icon |
| Нова зйомка (Create shoot) | `US-002` | default; **validation error** (missing date) | Client name/contact, date only — no location here anymore |
| Зйомка — деталі (Shoot detail, creator's view) | `US-002`, `US-003`, `US-005`, `US-006`, `US-018`, `US-019`, `US-020`, `US-024`, `US-025` | populated; references empty; crew empty | Edit; toggle status New/Finished; delete (confirm); add a reference (link field + gallery-picker icon); see location notes/attachments; per-crew-member link icon + remove icon; view raw-files/finished-photos preview |
| Редагування зйомки (Edit shoot) | `US-018`, `US-024`, `US-025` | default; **validation error** (date cleared) | Edit date; location address + notes + image/video attachment toggles; set raw-files/finished-photos links |
| Додати учасника команди (Add crew member) | `US-005` | default; **validation error** (no phone or email) | Name, role, phone or email (required), Instagram (optional), notes with an image toggle |
| Усі референси (All references) | `US-021` | populated | Reached from any view once references exceed the display limit (4) |
| Зйомка — для команди (Crew link view, no account) | `US-007`, `US-008`, `US-023` | valid link; **invalid/expired link (error state)** | View shoot info and all references; click another crew member for their *complete* details (incl. notes); confirm or decline once |
| Деталі учасника — команда (Crew peer detail, no account) | `US-023` | populated | Read-only: name, role, contact, Instagram, notes — every field, resolved in review round r02 |
| Зйомка — для клієнта (Client link view, no account) | `US-010`, `US-024`, `US-025`, `US-026` | valid link; invalid link (same error pattern as crew) | View shoot info, entirely read-only (no reactions — removed round r02); click a crew member for their details minus notes; see raw-files/finished-photos placeholder or link |
| Деталі учасника — клієнт (Client peer detail, no account) | `US-026` | populated | Same layout as the crew version, with the notes field omitted entirely |

## Notes
- The crew and client link views intentionally have **no** language switcher — resolved as
  Ukrainian-only in `02-product/open-questions.md`, item 9.
- A submitted confirm/decline response is final in this prototype — matches `US-008`'s scope.
- Every reference is visible to every crew member — no per-role filtering (`prd.md` R-06).
- **Tapping a reference opens it**: a link in the phone's browser, an image full-screen
  (`US-003` AC-3, added in review `r03`). The prototype's thumbnails are inert and predate the
  decision. The behaviour is the same on every surface that shows references — the creator's
  shoot page, `US-021`'s all-references page, and both link views.
- Deleting a shoot and removing a crew member both require an explicit confirmation step
  (`US-019`, `US-022`).
- The client's crew-detail view (`US-026`) is deliberately narrower than crew's own
  (`US-023`) — same fields, minus notes. Not absent, just different (revised in round r02;
  r01 had made it absent entirely).
- The client no longer reacts to references at all — tried in r01, removed in r02
  (`decisions/ADR-009-*.md`).
- Raw-files/finished-photos sections are a placeholder or a plain pasted link — never real file
  upload (`decisions/ADR-008-*.md`).
- Placeholder data is tagged "(демо)" throughout so nothing reads as a real person or shoot.

## Out of scope for this prototype
- Actual file hosting for raw/finished photos — deferred product-wide
  (`decisions/ADR-005-*.md`, `ADR-008-*.md`).
- The searchable crew directory — deferred (`decisions/ADR-003-*.md`).
- Self-registered crew's own cross-shoot schedule (`US-009`, a "should").
- Editing your own profile (`US-016` is read-only; see `open-questions.md` #13).

## Open questions
Two, tracked in `02-product/open-questions.md` (items 12–13) rather than duplicated here: what
tapping a calendar date does (`US-004`); whether the profile page becomes editable later. Item
11 (which fields peers see) was resolved in review round r02.
