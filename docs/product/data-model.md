# Data model — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-25
- **Derived from:** the 24 active stories under `02-product/epics/`,
  `02-product/open-questions.md` (answered items 5–11), `decisions/ADR-008-*.md`, `ADR-009-*.md`
- **Entity names** are the canonical English glossary terms (`01-discovery/glossary.md`).

Five entities. Several field-level questions were already answered by the owner and are
modelled as settled, not re-decided — each is marked **[answered]** with its source.

## Entities

### User — a registered account
| Field | Notes |
|---|---|
| `id` | |
| `name` | |
| `email` | **required** — the login credential (`ADR-015`). A crew-match key **only once confirmed** (`ADR-019`) |
| `phone` | optional profile field. Both it and `email` are match keys for `CrewMember.user_id` — **[answered]** item 8/10. A person added as crew by phone alone must supply that phone here before the match can fire (`ADR-015`) |
| `role` | professional role from the glossary's confirmed list (`US-001`) |
| `social_handle` | optional, added in review r02 (`US-001`, `US-016`) |
| `language` | `uk` \| `en`, defaults to `uk` (`US-014`, `US-015`); persists across logins |

Only registered users have a language preference — link views are Ukrainian-only, no switch
— **[answered]** item 9.

### Shoot — the core record
| Field | Notes |
|---|---|
| `id`, `creator_id` → User | `creator_id` is the shoot creator (`ADR-001`) and the RLS key |
| `client_name`, `client_contact` | the client is **fields on the shoot, not an account** — no client ever registers (`US-010`) |
| `date` | **required** at creation and at edit (`US-002` AC-2, `US-018` AC-3) |
| `status` | `new` \| `finished` only, defaults to `new` (`US-020` AC-2) |
| `location_address` | set on edit, never at creation (`US-002`, `US-018`) |
| `location_note` | free text |
| `location_attachment` | one image **or** one video (`US-018` AC-2) |
| `raw_files_url`, `finished_photos_url` | nullable pasted external links. Kept beside hosted files as an alternative (`US-024`, `US-025`; `ADR-020`) |
| `files_delete_at` | **new, `ADR-020`** — set once, at the first `ShootFile` upload, to that moment + 30 days; never moved by later uploads. Null while the shoot has no hosted files (`US-036` AC-2) |
| `deleted_at` | soft delete — see Link validity |

### Reference
| Field | Notes |
|---|---|
| `id`, `shoot_id` → Shoot | |
| `kind` | `link` \| `image` (`US-003`) |
| `url_or_path` | external URL, or a Storage path for a gallery image |

No per-role tagging and no reaction table. Every crew member sees every reference —
**[answered]** item 5. Client reactions were removed outright (`ADR-009`), so `US-011`'s
reaction entity **is not modelled**.

### CrewMember — a person on one shoot
| Field | Notes |
|---|---|
| `id`, `shoot_id` → Shoot | |
| `name`, `role` | |
| `phone`, `email` | **at least one required** (`US-005` AC-2) — this is what makes `user_id` matching possible |
| `instagram` | optional |
| `note`, `note_image` | text plus one optional image (`US-005`) |
| `response` | `pending` \| `confirmed` \| `declined`; final once set (`US-008`) |
| `user_id` → User | **nullable.** Set when a manual entry is matched to an account by email or phone — **[answered]** item 8 |
| `removed_at` | soft delete — kills their link (`US-022`, `US-006` AC-2) |

**This is per-shoot, not a global address book.** Adding the same makeup artist to three shoots
creates three rows. That is `ADR-003` (manual entry, no crew directory) expressed in the
schema, and it is why `user_id` is a match result rather than the primary relationship.

`note` is the **only** field that differs between the crew and client views (`US-023` vs
`US-026`) — the one column the link gateway must strip. See `ADR-013`.

### AccessLink
| Field | Notes |
|---|---|
| `id`, `token` | unguessable; the whole credential |
| `shoot_id` → Shoot | |
| `audience` | `crew` \| `client` |
| `crew_member_id` → CrewMember | set for `crew`, null for `client` |

One link per crew member per shoot, plus one client link per shoot (`US-006`, `US-010`).

## Relationships
```
User 1──n Shoot            (creator)
Shoot 1──n Reference
Shoot 1──n CrewMember
Shoot 1──n AccessLink      (n crew links + 1 client link)
CrewMember n──1 User       (nullable — matched, not required)
```

## Link validity — derived, never stored
**There is no `expires_at` column, deliberately.** Links do not expire on a timer —
**[answered]** item 7. A link is valid exactly when its parent rows are alive:

| Link | Dies when |
|---|---|
| crew | that `CrewMember.removed_at` is set (`US-022`) |
| client | that `Shoot.deleted_at` is set (`US-019` AC-1) |
| both | the shoot is deleted |

This is why both deletes are **soft** (`ADR-014`). A hard delete would revoke access just as
effectively — `US-007` AC-2 is satisfied either way, since a vanished token and a revoked one can
render the same "no longer valid" state, shown in the prototype as «посилання більше не діє» [the
link no longer works] (`03-design/prototype/index.html`). Soft delete is chosen for what it
*keeps*: a removed crew member's confirm/decline response (`US-008`) and the record that they were
ever on the shoot at all.

### ShootFile — *added 2026-10-03, `ADR-020`*
One hosted file: raw files or finished photos (glossary: файл зйомки).

| Field | Notes |
|---|---|
| `id`, `shoot_id` → Shoot | creator-only writes, RLS via the shoot (`US-036` AC-6) |
| `kind` | `raw` \| `finished` |
| `object_key` | the object's key in Backblaze B2 — not in Supabase Storage |
| `size_bytes` | summed per account against the 200 GB quota (`US-036` AC-3) |
| `name`, `created_at` | |

Deleted by the scheduled job at `Shoot.files_delete_at` (`US-037` AC-3) or by the creator
(`US-038`) — a **hard** delete of the object and the row: unlike `CrewMember`, nothing here is
history worth keeping, and the point is to free the quota. Only the client payload carries them
(`US-024`/`US-025` AC-7).

## What is deliberately absent
- **No reaction entity** — `ADR-009` removed it (`US-011` retired).
- ~~**No stored files for raw/finished photos**~~ — reversed 2026-10-03 by `ADR-020`; see
  ShootFile below.
- **No global crew/person table** — `ADR-003`.
- **No availability entity.** `US-009`'s cross-shoot schedule is a query, not a table: the
  `CrewMember` rows where `user_id` = me. Nothing to store, which is why the *storage* side of
  that "should" is nearly free — the cost is the matching, not the schema (`risks.md` R-3).
