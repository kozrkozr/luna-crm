# Personas — Luna CRM

- **Subproject:** 001-luna-crm
- **Derived from:** `00-intake/s01-2026-08-20/transcript.md`, `00-intake/s02-2026-08-22/transcript.md`

## Primary — Solo Shoot Owner
Modeled directly on Ilona; the only validated instance of this persona. In product usage this
persona takes the "shoot creator" role — the confirmed glossary/entity term for whoever creates
and owns a shoot (`01-discovery/glossary.md`; `decisions/ADR-001-*.md`) — used as the role in
`02-product` epics and stories.

- **Job:** Book, prepare, and run ~15 shoots a month solo, pulling together client contact
  info, references, location, and a small ad hoc crew for each one, then deliver the finished
  files afterward. *(shoots/month: `s02`, line 155)*
- **Pains:**
  - Waits on client replies before she can move a shoot forward, with no way to speed that up.
  - Hunts through past chats to find a reference, location, or contact she already discussed
    weeks earlier (`s02`, lines 163–216).
  - Re-explains the same shoot's logistics separately to each new crew member, and fields
    logistics questions mid-shoot from people she can't respond to while working: «він мені
    пише, як дібратись до студії, як її знайти» [he messages me asking how to get to the
    studio, how to find it] (`s02`, line 278).
  - Manually reminds every client and crew member before a shoot instead of one shared
    confirmation.
- **Current workaround:** Instagram DMs and Telegram for communication, a rejected Notion setup
  («Основно Notion мені не подобається» [Basically I don't like Notion] — `s02`, line 192), a
  separate file-sharing service, and a separate delivery/gallery site for finished photos
  (`s02`, lines 187–216).

## Secondary — Invited Crew Member
Not yet validated directly; inferred from how Ilona describes booking a makeup artist,
stylist, or gaffer (`s01`, lines 150–178; `s02`, lines 361–385). Flagged here so the client- and
crew-facing views aren't designed around the owner's persona alone.

- **Job:** Show up prepared for shoots she's invited to, possibly by several different
  photographers, without personally managing bookings or paperwork.
- **Pains:**
  - Gets logistics questions and answers repeated to her informally, shoot to shoot, instead of
    through one consistent source.
  - Has no single view of her own commitments if she's booked by multiple different
    photographers, unless she separately tracks it herself.
  - Can be added to a shoot by name and phone number alone, with no account and no visibility
    into anything beyond that one shoot (`s01`, lines 173–178).
- **Current workaround:** Reachable by a link sent manually by whichever photographer books
  her; no self-service schedule unless she registers herself, at which point her availability
  starts syncing automatically across the shoots she's added to (`s02`, lines 361–385).

## Also interacts with the product — Client
Not a primary persona (the playbook scopes discovery to 1–2), but named here so 02-product can
trace requirements to a real need instead of inventing one. The person being photographed, or
a brand representative overseeing a booked shoot.

- **Need:** confirm attendance, see who's on the shoot and what's planned, and react to
  references — without being able to edit anything (`00-intake/s02-2026-08-22/transcript.md`,
  lines 328–342; brand-oversight variant, `00-intake/s01-2026-08-20/transcript.md`, lines
  69–74).
- **Resolved in 02-product:** the Client gets a read-only view of shoot info, including crew
  details minus notes, in v1 (`02-product/prd.md` R-11, R-24). Reacting to references was
  tried in the prototype and then removed (`decisions/ADR-009-*.md`); confirming attendance
  and proposing their own references were never in v1 (`decisions/ADR-006-*.md`).

## Explicitly excluded
- Large production companies with dedicated coordinators/ops staff — the crew-scheduling need
  they have is already served by tools like StudioBinder (see `competitors.md`) and is heavier
  than what this product targets.
- Photographers who never hire outside crew and only need client booking/delivery — already
  served by existing CRM/gallery tools (see `competitors.md`); this product's differentiation
  (combined client+crew record) offers them little.
