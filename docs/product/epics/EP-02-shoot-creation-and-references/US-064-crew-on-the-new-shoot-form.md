# US-064 — Add crew while creating a shoot

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to add the crew on the «Нова зйомка» form itself**,
so that **a shoot is complete the moment I create it, instead of my opening it again to add the
people**.

## Context
Owner, chat 2026-10-17. Every decision below is the owner's, same chat.

The design is the «Команда» section of `New Shoot.dc.html` (Claude Design). It departs from that
mockup in one place: **the add screen is the existing «Додати учасника» screen** (`US-005`), both
tabs and every field, not the mockup's shorter «Новий контакт» form — one way to add a person in
the app.

As with references (`US-043`), the one thing that cannot be identical to the shoot's «Команда» tab
is when the row is written: on the tab the shoot exists and each person is saved at once; on the
form there is no shoot yet, so the people are held on the form and saved together with it.

## Acceptance criteria

### AC-1 — An optional section, second
- **Given** the «Нова зйомка» form
- **Then** «Команда» is offered as a dashed pill at the foot of the form, **second**, after
  «Оплата» and before «Нотатки для команди», «Нотатки для клієнта» and «Референси»
- **When** the creator taps it
- **Then** the «Додати учасника» screen opens straight away — there is no empty section

### AC-2 — The same add screen
- **Then** that screen is `US-005`'s, one to one: «Мої контакти» with search and multi-select,
  «Новий контакт» with every field it has today, the same validation and messages
- A contact already added on this form is marked «У команді» and cannot be picked again, as a
  contact already on a shoot is
- Confirming returns to the form. **No toast** is shown — nothing has been saved yet.

### AC-3 — The section
- **Given** at least one person added
- **Then** «Команда» shows on the form **after «Оплата» and before «Нотатки для команди»**, with:
  - in its heading, the count («2 учасники») and a × like the other optional sections
  - one row per person — initials, name, role and phone — with a «−» that removes that person
    **at once, without a question**
  - «Додати учасника» at the foot of the list, opening the same screen again
- **No hint under the section** — the mockup's «Після створення зйомки зможете надіслати команді
  запрошення…» line is not built
- When the last person is removed, the section closes and the pill returns

### AC-4 — Closing the section
- **When** the creator taps the section's ×
- **Then** it behaves as the other optional sections' ×: «Прибрати «Команда»? Введене буде
  стерто.», and confirming removes everyone added on the form

### AC-5 — Nothing is saved until the shoot is
- **Given** people added on the form
- **When** the creator leaves with «Скасувати» and confirms
- **Then** no crew member is saved, and nobody new is added to «Мої контакти»
- The people count as a change for «Скасувати»'s question, like any other field.

### AC-6 — Saving
- **When** the creator taps «Створити зйомку»
- **Then** the shoot is created first, then its crew members are saved in the order they were
  added — each exactly as `US-005` saves one, including remembering a new contact in
  «Мої контакти» — then its references (`US-043`), and the app opens the new shoot
- The button has **no text of its own** for this step (it is quick, unlike uploading references);
  it stays disabled as it is while the shoot is being created.

### AC-7 — A crew member that fails to save
- **Given** the shoot was created, but one of its crew members could not be saved
- **Then** nothing special happens: the shoot opens with the people who were saved, and the rest
  can be added on its «Команда» tab (owner, 2026-10-17 — the case is deliberately ignored, as in
  `US-043` AC-7)

### AC-8 — Not on the edit form
- **Given** the «Редагувати зйомку» form
- **Then** there is no «Команда» section and no pill for it. An existing shoot's crew is edited on
  its «Команда» tab only, as before.

### AC-9 — Language
Existing strings are reused: «Команда» / Crew, «Додати учасника» / Add crew member, the plural of
«учасник» / participant, and the section-removal question. New:

| UK | EN |
|---|---|
| Прибрати команду *(the section's × accessibility label)* | Remove crew |
| Прибрати {name} *(a row's «−» accessibility label)* | Remove {name} |

## Out of scope
- Crew on the edit form — AC-8.
- Reporting a crew member that failed to save — AC-7.
- Sending the crew their links from the form — links are shared from the shoot (`US-006`).
- A note image for a crew member — the add screen has none today.

## Dependencies
`US-002`, `US-005`, `US-043` (the held-until-save pattern).

## Open questions
None — the English for AC-9 was confirmed by the owner, chat 2026-10-17.
