# EP-07 — file hosting: implementation plan

- **Spec:** `docs/product/decisions/ADR-020-*.md`, `ADR-021-*.md` (uploads from the
  photographer's app in a desktop browser; iOS upload deferred), `docs/product/epics/EP-07-file-hosting/`,
  `US-024`/`US-025` in `EP-04`
- **Date:** 2026-10-03, revised 2026-10-04 for `ADR-021`
- **Status:** **paused 2026-10-04** — see the next section
- **Effort figures are assumptions**, not measurements.

## ⏸ Paused 2026-10-04 — resume here
Paused by the owner to ship tester fixes and an App Store release first. Nothing of EP-07 is
built yet. To resume:

1. **Bring this branch up to date** — rebase `docs/refreeze-adr-020` on `main`. If `main`
   re-froze `docs/product` meanwhile, resolve `docs/product/README.md` by hand: keep both
   "What moved" sections, newest first, and the newest source commit.
2. **Check `fix/us-010-media-reload`** (`fix(US-010)`, `fix(US-021)`) — merged into `main` before
   the release, or still open?
3. **Ask the owner** for what blocks the next step:
   - a Backblaze account and two B2 buckets in EU Central (`dev`, `prod`), a key for each — blocks
     spike S-6;
   - the file types (proposed in Phase 0: raw = any file; finished = JPEG, PNG, HEIC, TIFF, WebP;
     video?);
   - the product decisions the design needs: where the quota shows; previews or a list for the
     client; copy for the after-date block and the delete confirmation; a section with no files
     and no link; whole folders; a push pre-prompt or not.
4. **Then:** spike S-6 (Phase 1) → foundation → `US-040` → `US-036` … (Phase 3).

Agreed approach (owner, 2026-10-04): build on the existing components, logic kept apart from
presentation; the owner's design is applied afterwards; Ilona sees it only once designed.
The design list (screens and states) was given in chat on 2026-10-04 and is mirrored in
"Screens that need design" below.

**Spec state:** discovery repo at `4877af2` (`ADR-020`, `ADR-021`, `EP-07`, `US-036`–`US-040`),
frozen into `docs/product` on this branch. `ADR-021` open question 1 (whole folders) is still
open.

## Where the code is today
What this plan builds on (surveyed 2026-10-03):

- **Uploads read the whole file into memory** — `fetch(asset.uri).arrayBuffer()` then
  `supabase.storage…upload` (`src/features/references/api.ts:160`, `crew/api.ts:203`,
  `shoots/locationMedia.ts:49`). Fine for a photo; impossible for a 40 GB raw set.
- **Only `expo-image-picker`.** No `expo-document-picker`, `expo-file-system`,
  `expo-notifications`, and no S3 library.
- **No storage abstraction** — each feature declares its own `BUCKET` and signed-URL TTL.
- **One Edge Function**, `link-gateway`. It reads only the two auto-injected secrets; B2 keys
  will be the first custom secrets. `clientPayload` already returns `rawFilesUrl` /
  `finishedPhotosUrl` (`index.ts:546`, `:633`), and the crew payload carries no file links.
- **No `pg_cron`, `pg_net`, no scheduled anything.** v1 grants no `DELETE` anywhere
  (`20260825140000_grants.sql`).
- ~~**Existing gap:** the link view did not re-request the payload on a media error~~ — fixed
  2026-10-04 in `fix(US-010)` and `fix(US-021)`, branch `fix/us-010-media-reload`.
- **The creator's app already exports to the web** (build `open-questions.md` #26) but was never
  designed or tested there. `ADR-021` makes it a supported surface.
- **Tests** are end-to-end acceptance suites against local Supabase (`tests/acceptance/`), with a
  guard that refuses hosted projects. B2 cannot be reached from them as-is.

## Phase 0 — decisions still open
Owner questions, from `EP-07.md`. Answered ones struck through.

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | File types | `US-036` | **proposed below — awaiting owner** |
| 2 | Quota shown to the creator | `US-036` | **yes** (owner, 2026-10-03) — where: from the design |
| 3 | What "view" means for the client: previews for finished photos, a list for raw files? | `US-024`/`025` | open |
| 4 | Copy: upload blocked after the deletion date (`US-036` AC-7) | `US-036` | open |
| 5 | Delete confirmation and its copy (`US-038`) | `US-038` | open |
| 6 | Interrupted upload — resumed or restarted | `US-036` | depends on S-6 |
| 7 | When to ask for push permission; what if refused | `US-039` | open |
| 8 | Where a tap on the push leads | `US-039` | open |
| 9 | `{назва}` in the push copy — the shoot has no title | `US-039` | open |
| 10 | Section with no files ever and no link — what the client sees | `US-024`/`025` | open |

### Proposed file types (#1)
**Raw files section — accept any file.** Raw formats are per manufacturer and per camera
generation: Canon `.CR3`/`.CR2`, Nikon `.NEF`/`.NRW`, Sony `.ARW`, Fujifilm `.RAF`, Panasonic
`.RW2`, OM System/Olympus `.ORF`, Pentax `.PEF`, Hasselblad `.3FR`, Phase One `.IIQ`, and Adobe
`.DNG` (also Leica and iPhone ProRAW). A whitelist would sooner or later reject a real camera's
files, and the product does nothing with their content — it stores and returns bytes. Same
reasoning as `ADR-020`'s "no per-file size limit".

**Finished photos section — images, and video?** The common delivery format is JPEG; TIFF for
print on request; PNG, HEIC and WebP occasionally. Proposed: JPEG, PNG, HEIC, TIFF, WebP.
**Video (MP4/MOV) is not in the spec** — the glossary defines finished photos as photos.
Owner to decide.

**What a browser can preview:** JPEG, PNG, WebP everywhere; HEIC in Safari only; TIFF and raw
formats nowhere. Anything else is shown as a file row with a download — which is #3.

## Phase 1 — spike S-6 *(assumed 2–3 days)*
**Retires:** the assumption that a browser can upload a raw set to B2 directly (`ADR-021`).
Written up as `docs/spikes/S-6-large-upload-to-b2.md`, in the S-1/S-2 format.

Questions, each pass/fail:
1. **Upload:** can a 5+ GB file reach B2 from Chrome, Safari, Firefox and Edge on a desktop —
   sliced with `File.slice` and `PUT` part by part to presigned S3 multipart URLs from an Edge
   Function? Needs CORS on the B2 bucket for `app.lunashoots.com` and exposed `ETag`.
2. **Interruption:** a closed tab, a laptop going to sleep, a dropped network — which completed
   parts survive, and can the upload resume? (Answers `US-036` open question 4.)
3. **Throughput:** real time for 30 GB on a home connection, and how many parts in parallel.
4. **Download all, on a phone:** in iPhone Safari and Android Chrome, logged out — can the link
   view download many large files in sequence (presigned GET with
   `response-content-disposition`), or does the browser block or prompt each one?
5. **Edge runtime:** can a Supabase Edge Function sign S3 requests for B2 (e.g. `aws4fetch`)?

**Needed from the owner before the spike:** a Backblaze account, and two B2 buckets in EU
Central (`dev`, `prod`) with an application key scoped to each.

## Phase 2 — foundation *(assumed 3–4 days; no story ID → `chore`)*
- **B2 buckets:** private, EU Central; CORS for `app.lunashoots.com` (uploads) and the link
  surface (downloads); no lifecycle rules (deletion
  is ours, `ADR-020` decision 3).
- **Storage interface** (Edge Functions side): `createUpload`, `signPart`, `completeUpload`,
  `abortUpload`, `signDownload`, `deleteObject`, over the S3 API. B2 is the only implementation;
  R2 later is a config change. The small-image paths (`shoot-media`) stay on Supabase Storage
  for now but go through the same shape so they can move (`ADR-020`, "revisit when").
- **Secrets:** `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT` via
  `supabase secrets set`; documented in `docs/deploy-dev.md`.
- **Tests:** a local S3 (MinIO in Docker) behind the same interface, so acceptance suites stay
  local-only and never touch B2.

## Phase 3 — stories, in `backlog-order.md` order
Each story: migration → Edge Function → app → acceptance suite → commit `feat(US-xxx): …`.

| Order | Story | Main work | Assumed |
|---|---|---|---|
| ~~0~~ | ~~fix: link view re-requests on media error~~ | done 2026-10-04 | — |
| 1 | **US-040** the app in a desktop browser | phone layout centred; `app.lunashoots.com` on Pages (its own deploy of the creator's routes); auth emails as universal links — the iOS app on a phone, the web app on a computer; a pass over every creator screen in four browsers | 4–6 days |
| 2 | **US-036** upload | migration: `shoot_files` table (`ShootFile`), `shoots.files_delete_at`, per-account usage function; Edge Function `files` (start: quota + date check, sign parts; complete; abort); web: file picker + drag-and-drop, sliced upload queue, progress, quota display | 5–7 days |
| 3 | **US-024 → US-025** client sees and downloads | gateway `clientPayload` adds files with presigned GETs; crew payload unchanged (AC-7, tested); link view: list/previews, single download, download all, date, deleted placeholder | 3–4 days |
| 4 | **US-037** deletion date | date in both sections; enable `pg_cron` + `pg_net`; daily job → Edge Function `files-sweeper` deletes objects and rows past `files_delete_at` | 2 days |
| 5 | **US-038** early delete | Edge Function delete (one / all), creator-only; confirmation | 1–2 days |
| 6 | **US-039** push warning | `expo-notifications`, `push_tokens` table, permission flow; `files-sweeper` sends the 3-day warning via Expo's push API. **Needs from the owner:** an APNs key in the Apple Developer account | 3 days |

**Total, assumed:** ~5 weeks including the spike and `US-040`.

## Screens that need design
The list given to the owner on 2026-10-04. Built first on existing components; the owner's
design is applied afterwards.

### Changes to existing screens
1. **Shoot → Materials tab → Files section** (creator, web). Per section (raw files, finished
   photos): uploaded files (name, size), upload button, drop zone, «Файли доступні до {дата}»,
   the pasted link beside the files, delete one / delete all. States: empty; link only; files;
   files + link; uploading; deleted (date passed); upload blocked after the date; quota full.
2. **Shoot → file counter** in the header/summary — counts hosted files too, not only links.
3. **Client link view → Files card** (mobile browser): finished photos (previews or a list —
   decision 2), raw files as a list with per-file download, «Завантажити все», the date, the link
   beside. States: files; files + link; after deletion — the link, or «Файли видалено. Зверніться
   до фотографа, якщо вони ще потрібні.»; no files and no link.
4. **Web frame** — the phone layout centred on a desktop screen: what surrounds the column.

### New screens and components
Creator, web:
5. **Drop zone** and its drag-over state.
6. **Upload progress panel** — several files, per-file and total progress, cancel, failure and
   retry, "interrupted — resume" (depends on S-6).
7. **Quota indicator** — «Використано X з 200 ГБ»; nearly full; full.
8. **Quota full message** — «Сховище заповнене (200 ГБ). Видаліть файли інших зйомок, щоб
   завантажити нові.»
9. **Upload blocked after the deletion date** — copy not chosen.
10. **Delete confirmation** — one file / all files; copy not chosen.

Client, mobile browser:
11. **Full-screen viewer** for a finished photo (the references' `ImageViewer` as a base).
12. **A file row that cannot be previewed** (raw, TIFF) — type icon, name, size, download.
13. **"Download all" progress** — if S-6 shows the browser downloads one file at a time.

Creator, iOS:
14. **Push pre-prompt** before the system permission dialog — only if wanted.

### Decisions the design depends on
1. Where the quota shows — the shoot, the profile, or both?
2. What "view" means for the client — previews for finished photos and a list for raw, or a list
   for everything?
3. Copy for items 9 and 10.
4. A section with no files and no link — what the client sees (item 3, last state).
5. Whole folders — can one be picked or dropped?
6. Push — a pre-prompt (item 14), or the system dialog only?
