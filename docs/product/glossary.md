# Glossary — Luna CRM

- **Subproject:** 001-luna-crm
- **Policy:** [company/standards/language-policy.md](../../../company/standards/language-policy.md)

The **English term is canonical** for story titles, entity names, file names, and code.
Ukrainian is the source of truth for what the term means. A `confirmed` mapping is never
silently changed.

Status values: `confirmed` — the owner approved this English term. `provisional` — the agent
proposed it and it awaits confirmation. Every `provisional` row must be raised at the gate.

| Ukrainian term | English term | Definition | Status |
|---|---|---|---|
| зйомка | shoot | The core unit: one calendar event with a client, references, location, date, team, raw files, and finished photos (`00-intake/s01`, lines 65, 108–110) | confirmed |
| вихідники | raw files | Unedited output from a shoot, before client selection or retouching (`00-intake/s01`, line 49) | confirmed |
| готові фото | finished photos | Edited photos delivered to the client after the shoot (`00-intake/s01`, line 51) | confirmed |
| референси | references | Reference images/links a photographer and client agree on before a shoot (`00-intake/s01`, line 44) | confirmed |
| візажист | makeup artist | Crew role responsible for makeup on a shoot (`00-intake/s01`, line 66) | confirmed |
| стиліст | stylist | Crew role responsible for wardrobe/styling on a shoot (`00-intake/s01`, line 66) | confirmed |
| гафер | gaffer | Crew role responsible for lighting on a shoot (`00-intake/s01`, line 66) | confirmed |
| команда | crew | The set of people (makeup artist, stylist, gaffer, etc.) working a given shoot alongside the photographer (`00-intake/s01`, line 66) | confirmed |
| менеджер зйомок | shoot manager | An optional professional role, chosen at registration, for someone whose main job is coordinating shoots rather than shooting/styling/lighting them (`00-intake/s02`, lines 115–120) | confirmed |
| зйомочна площадка | shoot set | The people and space involved in producing a shoot, used when generalising beyond photography alone (`00-intake/s01`, line 161) | confirmed |
| каталог команди | crew directory | A searchable list of crew members with visible availability; deferred past v1 (`00-intake/s02`, line 345; `decisions/ADR-003-*.md`) | confirmed |
| файл зйомки | shoot file | One file the shoot creator uploaded to a shoot — raw files or finished photos — hosted by the product; `ShootFile` in code (`decisions/ADR-020-*.md`) | confirmed — owner, chat 2026-10-03 |
| файлообмінник | file-sharing service | A generic third-party service used today to send large files to clients or crew, outside the app (`00-intake/s02`, lines 199, 201) | confirmed |
| рейт | rate | A photographer's or crew member's day rate/pricing tier (`00-intake/s02`, line 157) | confirmed |
| автор зйомки | shoot creator | Whoever created a specific shoot and holds edit rights over it — a per-shoot relationship, distinct from the "shoot manager" profession (`decisions/ADR-001-*.md`) | confirmed |
| посилання | link | The per-person URL that gives a crew member or client access to one shoot without an account or an app — the product's core sharing mechanism (`02-product/prd.md` R-05, R-11; `04-tech/data-model.md`, AccessLink) | confirmed |
| підписка | subscription | The monthly payment that gives a registered account full access — $4.99, sold through the App Store (`ADR-023`) | provisional |
| пробний період | free trial | The first 14 days of a subscription, free — Apple's introductory offer, started on the paywall (`ADR-023`) | provisional |
| екран оплати | paywall | The screen that offers the free trial and the subscription (`US-051`) | provisional |
| режим перегляду | view mode | An account without access: sees its shoots, cannot create, edit or delete (`US-052`) | provisional |

## Awaiting confirmation
None — all rows confirmed by the owner in chat, 2026-08-22; `посилання` confirmed 2026-08-25.

## Rejected synonyms
- **`лінк`** — do not use. The owner confirmed `посилання` as the single term for *link*
  (chat, 2026-08-25). The prototype previously used both words interchangeably for the same
  thing; corrected the same day.

## Deliberately not in the glossary
- **call sheet** — the owner's own «кол-шит» (`00-intake/s02-2026-08-22/transcript.md`, quoted in
  `decisions/ADR-005-*.md`) is **not** given a row: the concept never appears in the interface.
  No screen in `03-design/ux-notes.md` is a call sheet — crew see a shoot page through a link.
  The phrase stays internal to documents, where English is canonical (owner's answer, 2026-08-25).
  Revisit only if a user-facing screen ever needs the name.

## Changed mappings
None yet.

## Do not translate
None yet.
