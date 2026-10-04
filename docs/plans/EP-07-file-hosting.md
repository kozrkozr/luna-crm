# EP-07 — file hosting: implementation plan

- **Spec:** `docs/product/decisions/ADR-020-*.md`, `ADR-021-*.md` (uploads from the
  photographer's app in a desktop browser; iOS upload deferred), `docs/product/epics/EP-07-file-hosting/`,
  `US-024`/`US-025` in `EP-04`
- **Date:** 2026-10-03, revised 2026-10-04 for `ADR-021`
- **Status:** draft — for review before spike S-6
- **Effort figures are assumptions**, not measurements.

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
Asked of the owner on 2026-10-03.

**Creator, web app** (`ADR-021`: the phone layout, centred on a desktop screen)
1. **Shoot detail → Files section** (`MaterialsTab`): raw files and finished photos as two
   sections with the uploaded files, the upload button, «Файли доступні до {дата}», the pasted
   link beside the files. States: empty; uploading; uploaded; deleted; upload blocked after the
   date.
2. **Choosing files**: the upload button and **drag-and-drop** — the drop zone and its states
   (owner supplies the design, 2026-10-04).
3. **Upload in progress**: several files, per-file and total progress, a failed or interrupted
   upload, cancel.
4. **Quota**: how much of the 200 GB is used — where it lives (shoot? profile?), and the
   quota-full state.
5. **Delete**: one file and all files, and the confirmation.

**Creator, iOS app**
6. **Push permission ask**, if it gets its own screen before the system prompt (#7).

**Client, web link view** (mobile browser, logged out)
7. **Files section**: finished photos (previews? a full-screen viewer?) and raw files (a list),
   download one / download all, the date, the link beside them, the deleted placeholder.
8. **Download all in progress** — if S-6 shows the browser needs one.
