# US-043 — Add references while creating a shoot

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to attach references on the «Нова зйомка» form itself**,
so that **a shoot is complete the moment I create it, instead of my opening it again to add the
moodboard**.

## Context
Owner, chat 2026-10-06. Every decision below is the owner's, same chat.

There is no design for it: the section is **the «Референси» block of the shoot's «Матеріали» tab,
one to one** (`US-003`, `US-032`) — the category filter, the grid with its «+» tile, the choice
between an image from the gallery (several at once) and a link, a reference filed under the
active category. It is optional the way «Оплата» is (`US-002`, the 2026-09-05 optional sections).

The one thing that cannot be identical: on «Матеріали» the shoot already exists and each reference
is saved the moment it is added. On the form there is no shoot yet, so the references are held on
the form and saved together with it.

## Acceptance criteria

### AC-1 — An optional section, last
- **Given** the «Нова зйомка» form
- **Then** «Референси» is closed, and offered as the **fourth** dashed pill at the foot of the
  form, after «Оплата», «Нотатки для команди» and «Нотатки для клієнта»
- **When** the creator taps it
- **Then** the section opens **last** on the form, below «Нотатки для клієнта», with a × in its
  heading like the other optional sections

### AC-2 — The same as «Матеріали»
- **Then** the open section is the «Матеріали» tab's «Референси» block: the same filter chips, grid,
  «+» tile, image-or-link choice, link card, category rule and error messages (`US-003` AC-2)

### AC-3 — Nothing is saved until the shoot is
- **Given** references added on the form
- **When** the creator leaves with «Скасувати» and confirms
- **Then** nothing is uploaded and nothing is saved
- The references count as a change for «Скасувати»'s question, like any other field.

### AC-4 — Removing one
- **Given** a reference added on the form
- **When** the creator taps its ✕
- **Then** it is removed **at once, without a question** — nothing has been saved yet (owner,
  2026-10-06; «Матеріали» asks, because there it is final)

### AC-5 — Closing the section
- **When** the creator taps the section's ×
- **Then** it behaves as the other optional sections' ×: at once when empty, after «Прибрати
  «Референси»? Введене буде стерто.» when it holds any reference — and closing it discards them

### AC-6 — Saving
- **When** the creator taps «Створити зйомку»
- **Then** the shoot is created first, then its references are saved in the order they were added,
  and the app opens the new shoot (`US-002` AC-1)
- While the references are being saved, the button reads **«Зберігаємо референси…»** and cannot
  be tapped again.

### AC-7 — A reference that fails to save
- **Given** the shoot was created, but one of its references could not be saved (e.g. the
  connection dropped mid-upload)
- **Then** nothing special happens: the shoot opens with the references that were saved, and the
  rest can be added on «Матеріали» (owner, 2026-10-06 — the case is deliberately ignored)

### AC-8 — Not on the edit form
- **Given** the «Редагувати зйомку» form — the same screen in its edit mode
- **Then** there is no «Референси» section and no pill for it. An existing shoot's references
  are edited on «Матеріали» only, as before.

### AC-9 — Language
| UK | EN |
|---|---|
| Референси *(pill, section heading)* | References |
| Прибрати референси *(the × accessibility label)* | Remove references |
| Зберігаємо референси… | Saving references… |

## Out of scope
- References on the edit form — AC-8.
- Reporting a reference that failed to save — AC-7.
- Crew or files on the creation form.

## Dependencies
`US-002`, `US-003`, `US-032`.

## Open questions
None — the English copy was confirmed by the owner, chat 2026-10-06.
