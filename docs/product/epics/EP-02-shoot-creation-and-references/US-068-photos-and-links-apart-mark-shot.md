# US-068 — Photos and links apart on «Матеріали», and photos marked «Знято»

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** M

## Story
As a **shoot creator**,
I want **to tick off each reference photo as I shoot it**,
so that **on set I can see at a glance which frames are still to do**.

## Context
Owner, chat 2026-10-18. Every decision below is the owner's, same chat.

The designs are `Матеріали · відмітки «Знято»` (`Materials-Refs.dc.html`) and
`Матеріали · порожньо` (`Materials-Empty.dc.html`). Styling follows the app's own design system;
the mockups are read for structure and behaviour.

Today the «Матеріали» tab's «Референси» block is one grid mixing images and links (`US-003`,
`US-032`). This story splits it into **photos** and **links**, and lets the creator mark a photo
«Знято». **Only the «Матеріали» tab changes.** The «Нова зйомка» form keeps today's block exactly
(`US-043`, amended).

**Creator only.** The mark is never sent to a link view: crew and client see references as today
(`US-007`, `US-010`).

## Acceptance criteria

### AC-1 — Category chips stay, over both sections
- **Given** the «Матеріали» tab
- **Then** the category chips (`US-032`) stay above the references, as today, and filter photos,
  links and «Знято» together
- A reference added while a chip is active is filed under it, as today.

### AC-2 — «Референси»: the photos still to shoot
- **Then** «Референси» holds image references only, not yet marked, in a three-column grid in the
  order they were added, with a «+» tile last
- Its counter reads «N фото до зйомки», or «усе знято» when none are left to shoot.
- Each photo has its ✕ (asks before removing, as today) and a «Знято» button under it.
- Tapping a photo opens it full-screen (`US-003` AC-3).

### AC-3 — Marking a photo «Знято»
- **When** the creator taps «Знято» under a photo
- **Then** the mark is saved at once and the photo moves to the «Знято» section
- There is no toast and no undo: tapping again unmarks it (AC-5).

### AC-4 — The «Знято» section
- **Given** at least one marked photo (in the active chip)
- **Then** a «✓ Знято · N» section is shown last on the tab, its photos in the order they were
  marked, drawn dimmed with a green «Знято» button
- Under it: «Тапніть «Знято» ще раз, щоб повернути нагору.»
- Each photo keeps its ✕ and opens full-screen on tap.

### AC-5 — Unmarking
- **When** the creator taps the green «Знято» on a marked photo
- **Then** the mark is cleared at once and the photo returns to «Референси» in its original place

### AC-6 — Everything shot
- **Given** photos exist (in the active chip) and every one is marked
- **Then** «Референси» shows only its «+» tile, and its counter reads «усе знято»
- No separate «Усі фото-референси відзнято» note under the grid — the counter already says it
  (owner, 2026-10-18).

### AC-7 — «Посилання»
- **Then** «Посилання» holds link references, in the order they were added, one row each: a link
  glyph, the host in bold, the full URL under it
- Its counter is the number of links.
- Tapping a row opens the link in the phone's browser (`US-003` AC-3).
- Each row has a ✕, asking before removing as a photo's ✕ does.
- The last row is «+ Додати посилання», which asks for the link as the «+» tile's «Посилання»
  does today, with the same validation and messages (`US-003` AC-2).
- Links cannot be marked «Знято».

### AC-8 — Adding photos
- **When** the creator taps the «+» tile
- **Then** the gallery opens straight away, several images at once, as today's «Зображення»
- There is no image-or-link sheet on this tab any more; each section adds its own kind.

### AC-9 — Empty states
- **Given** no photos (in the active chip)
- **Then** «Референси» reads «0 фото» and shows a card: «Референсів поки немає», «Додайте фото,
  які треба повторити на зйомці. На знімальному майданчику відмічайте їх «Знято».», and
  «+ Додати фото», which opens the gallery as the «+» tile does
- **Given** no links (in the active chip)
- **Then** «Посилання» reads «0» and shows only the «Додати посилання» row, with the subtitle
  «Pinterest, Instagram, Notion, Google Диск…»

### AC-10 — A mark that fails to save
- **When** marking or unmarking fails (e.g. no connection)
- **Then** the photo stays where it was and the tab says «Не вдалося зберегти відмітку. Спробуйте
  ще раз.»

### AC-11 — Unchanged
- «Файли» and the delivery deadline stay first on the tab (`US-024`, `US-025`, `US-042`).
- The tab's badge counts every reference, marked or not, plus the set file links, as today.
- View mode (`US-052`): marking, unmarking, adding and removing open the paywall.
- The link views and the «Нова зйомка» form are unchanged.

### AC-12 — Language
| UK | EN |
|---|---|
| Знято *(button)* | Shot |
| Знято · N *(section)* | Shot · N |
| N фото до зйомки | N to shoot |
| усе знято | all shot |
| 0 фото | 0 photos |
| Тапніть «Знято» ще раз, щоб повернути нагору. | Tap "Shot" again to move a photo back up. |
| Посилання *(section)* | Links |
| Додати посилання | Add link |
| Pinterest, Instagram, Notion, Google Диск… | Pinterest, Instagram, Notion, Google Drive… |
| Референсів поки немає | No references yet |
| Додайте фото, які треба повторити на зйомці. На знімальному майданчику відмічайте їх «Знято». | Add the photos you want to recreate. On set, mark each one "Shot". |
| Додати фото | Add photos |
| Не вдалося зберегти відмітку. Спробуйте ще раз. | Could not save the mark. Please try again. |
| Відмітити «Знято» — {категорія} *(accessibility)* | Mark "Shot" — {category} |
| Повернути до зйомки — {категорія} *(accessibility)* | Move back to shoot — {category} |

Without a category, the accessibility labels end before the dash.

## Data
`Reference.shot_at` — nullable timestamp; null is «до зйомки». Set on marking, cleared on
unmarking; it also orders the «Знято» section. Only image references are ever marked.

## Out of scope
- A title or preview picture for a link (the mockup's board collage and «дошка · 24 піни») —
  owner, 2026-10-18: the host only.
- Marking links.
- The mark in the link views, the «Нова зйомка» form, or `US-021`'s all-references page.
- A toast or undo on marking — owner, 2026-10-18.

## Dependencies
`US-003`, `US-032`, `US-043`.

## Open questions
None. The English copy and AC-10's message were proposed by Claude and await the owner's review.
