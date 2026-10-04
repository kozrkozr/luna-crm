# ADR-021 — The photographer's app in a desktop browser; files upload from there, not from iOS

- **Date:** 2026-10-04
- **Status:** accepted
- **Amends:** `ADR-020` decision 7 — the upload source is the browser, not the iOS app; iOS upload
  is deferred
- **Extends:** `ADR-012` — Cloudflare Pages serves the photographer's app as well as the link
  surface
- **Does not change:** `ADR-020` decisions 1–6 (B2, retention, warning, quota, price),
  `ADR-013` (anonymous reads through the gateway), `ADR-016` (the UI layer)
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-04)

## Context
`ADR-020` (2026-10-03) put uploading in the iOS app and left a web app for the photographer to a
separate ADR, noting that 30–40 GB of raw files per shoot "is not realistic from a phone". The
next day the owner put it the other way round: a photographer's raw files and finished photos
sit on a computer — imported from the card, edited there — so the computer's browser is the
likely place they are uploaded from, not the phone.

The build already exports the photographer's app to the web: `expo export -p web` emits the
creator's routes alongside the link views, and the Pages deploy publishes them. That was kept
deliberately as a development convenience (build repo, `docs/open-questions.md` #26, owner
2026-08-27) — a surface "nobody designed, tested on a phone, or intended to support".

## Options considered
### Option A — upload from iOS first, web later (`ADR-020` as written)
- **Pros:** one platform; push and the app are already there
- **Cons:** the files are not on the phone; a 40 GB transfer from an iPhone is the hardest case
  to make reliable

### Option B — a web page for uploading only
- **Pros:** the smallest web surface
- **Cons:** the photographer needs the shoot list and the shoot to find where to upload; a
  separate page duplicates them

### Option C — the whole photographer's app in a desktop browser *(chosen)*
- **Pros:** the codebase already renders on the web (`ADR-016`); one app, two platforms; the
  browser is the easier place to upload large files from (`File.slice`, resumable parts)
- **Cons:** every creator screen now has to work at desktop widths and in desktop browsers —
  a design and testing surface that did not exist

## Decision
Option C.
1. **The whole photographer's app is supported in a desktop browser** — every creator story,
   not only files.
2. **Raw files and finished photos upload from the browser.** Uploading from the iOS app is
   **deferred**, not dropped.
3. **Browsers:** any modern desktop browser — Chrome, Safari, Firefox, Edge.
4. **Hosting:** Cloudflare Pages, as for the link surface (`ADR-012`). `open-questions.md` #26 in
   the build repo is answered: publishing the creator's routes is now intended.

## Consequences
- **Accepted cost:** every creator screen needs a desktop layout and testing in four browsers.
  So far the app was designed and tested at phone width only.
- **Now easier:** large uploads — a browser reads a file in slices without loading it into
  memory, and retries a failed part; no App Store review for upload fixes.
- **Now harder:** auth on the web — the confirmation and recovery emails (`ADR-019`) were tested
  opening the iOS app; on a computer they must open the web app.
- **Unchanged:** the 3-day push warning (`US-039`) still goes to the iOS app — a photographer who
  uploads on the computer still gets it on the phone, if the app is installed.
- **Revisit when:** photographers ask to upload from the phone — then iOS upload is undeferred.

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `ADR-020` | decision 7 marked as amended by `ADR-021` |
| `US-036` | uploads from the browser; AC-6 (Photos/Files) moves to the deferred iOS upload |
| `EP-07` | out of scope: iOS upload; the web app is a dependency |
| `US-040` | new — use the photographer's app in a desktop browser |
| `04-tech/backlog-order.md` | spike `S-6` tests the browser; the web app comes before `US-036` |
| `04-tech/architecture.md` | the creator's app is a third surface on Pages |

## Answered after acceptance — owner, chat 2026-10-04
1. **Desktop layout:** the phone layout, centred. No separate desktop screens.
2. **Address:** `app.lunashoots.com`. The link surface stays on `lunashoots.com`.
3. **Auth emails:** one link for both — on a phone it opens the iOS app, on a computer the web
   app.
4. **Choosing files:** a file picker **and** drag-and-drop; the owner supplies the design.
   Whether a whole folder can be dropped at once is still open.
5. **Language:** the web app follows the account's language (uk/en), as the iOS app does.

## Open questions
1. Can a whole folder be picked or dropped at once? (`US-036`)
