# US-069 — Swipe through reference photos, and mark or remove one from the preview

- **Parent epic:** [EP-02 — Shoot creation and references](EP-02.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As a **shoot creator**,
I want **to swipe through the reference photos full-screen and mark each one «Знято» there**,
so that **on set I can look at a reference properly and tick it off without closing it first**.

## Context
Owner, chat 2026-10-18. Every decision below is the owner's, same chat. No mockup.

Today a tapped photo opens full-screen alone, with «Готово» (`US-003` AC-3). This story changes
that preview **on the «Матеріали» tab only** (`US-068`). Everywhere else — the link views, location
photos, the «Нова зйомка» form, the all-references page — keeps today's preview.

## Acceptance criteria

### AC-1 — Swiping
- **Given** the «Матеріали» tab
- **When** the creator taps a photo
- **Then** the preview opens on that photo, and swiping left and right moves through **every photo
  of the active chip**, in the tab's order: «Референси» first, then «Знято»
- Tapping the photo itself does nothing. There is no zoom.
- The photo fills the space between the header and the buttons, never under them (owner,
  2026-10-18 — the controls were lost against it).

### AC-2 — The header
- **Then** the top of the preview shows a title and, at the right, a round ✕ that closes it:
  «‹чип› · N з M» — e.g. «Світло · 3 з 6»; with «Всі» active, only «N з M»

### AC-3 — «Знято» in the preview
- **Then** the bottom of the preview shows two full-width buttons, one above the other; the upper
  one is «✓ Позначити як відзняте» in the colour of «+ Нова зйомка» (the app's CTA) — green, «✓ Відзнято», once the photo is marked
- **When** the creator taps it
- **Then** the mark is saved — or cleared, from «✓ Відзнято» — at once (`US-068` AC-3, AC-5) and
  the button changes
- The photo stays where it is in the preview, and N and M do not change: the tab re-orders once the
  preview is closed.
- A failed save says «Не вдалося зберегти відмітку. Спробуйте ще раз.» in the preview
  (`US-068` AC-10).

### AC-4 — Removing from the preview
- **Then** the lower button is red, outlined, «Видалити» with a bin icon
- **When** the creator taps it
- **Then** it asks «Видалити цей референс? Це незворотньо.», as the tile's ✕ does; once removed,
  the preview shows the next photo — or the previous one if it was the last — and closes when none
  is left

### AC-5 — View mode
- **Given** an account without access (`US-052`)
- **When** the creator taps either button in the preview
- **Then** the preview closes and the paywall opens

### AC-6 — Language
| UK | EN |
|---|---|
| ‹чип› · N з M | ‹chip› · N of M |
| N з M | N of M |
| ✓ Позначити як відзняте | ✓ Mark as shot |
| ✓ Відзнято | ✓ Shot |
| Видалити | Remove |
| Закрити *(✕, accessibility)* | Close |

## Out of scope
- Zoom — owner, 2026-10-18: not now. It competes with the swipe for the same gesture.
- Links in the preview; the preview anywhere but «Матеріали».

## Dependencies
`US-068`.

## Open questions
None. The English copy was proposed by Claude and awaits the owner's review.
