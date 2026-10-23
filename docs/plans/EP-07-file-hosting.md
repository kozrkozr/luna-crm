# EP-07 — file hosting: implementation plan

- **Spec:** `docs/product/decisions/ADR-020-*.md`, `ADR-021-*.md` (uploads from the
  photographer's app in a desktop browser; iOS upload deferred), `ADR-023` decision 7 and
  `ADR-024` (file storage is the planned PRO tier; the web app moved to `EP-10`),
  `docs/product/epics/EP-07-file-hosting/`, `US-024`/`US-025` in `EP-04`
- **Date:** 2026-10-03, revised 2026-10-04 for `ADR-021`, 2026-10-21 for `ADR-023`/`ADR-024`
  and the code as it stands after `EP-10`
- **Status:** **paused 2026-10-04; resume started 2026-10-21** — see the next section
- **Effort figures are assumptions**, not measurements.

## ⏸ Paused 2026-10-04 — resume here
Paused by the owner to ship tester fixes and an App Store release first. Nothing of EP-07 is
built yet. To resume:

1. ~~**Bring this branch up to date**~~ — done 2026-10-21: rebased on `main` (1.1.0 build 6).
   `main` already carried both re-freezes, so only the plan commits were kept.
2. ~~**Check `fix/us-010-media-reload`**~~ — merged into `main` 2026-10-04.
3. **Ask the owner** for what blocks the next step:
   - **the PRO tier** (Phase 0, #11) — `ADR-023` decision 7 puts file storage in a planned PRO
     tier that has no price, product or entitlement yet. Who may upload decides `US-036`'s
     server check, so this blocks `US-036`, not the spike;
   - a Backblaze account and two B2 buckets in EU Central (`dev`, `prod`), a key for each — blocks
     spike S-6;
   - the file types (proposed in Phase 0: raw = any file; finished = JPEG, PNG, HEIC, TIFF, WebP;
     video?);
   - the product decisions the design needs: where the quota shows; previews or a list for the
     client; copy for the after-date block and the delete confirmation; a section with no files
     and no link; whole folders; a push pre-prompt or not.
4. **Decided 2026-10-22 (owner):** build and test on `dev` first, settle the open questions
   after. The PRO tier (#11) is deferred: until its ADR, `can_host_files()` grants hosting to any
   account with base access (`has_access()`). **EP-07 does not reach prod before the PRO ADR.**
   Only the `dev` bucket is needed now; `prod` comes with the release.
5. ~~**Spike S-6**~~ — done 2026-10-22, holds: `docs/spikes/S-6-large-upload-to-b2.md`.
   Owner: stay on B2, keep R2 a configuration change, watch storage use.
6. ~~**Foundation**~~ — done 2026-10-23 (Phase 2): storage interface kept from S-6, settings row
   `file_hosting_settings`, local S3 (SeaweedFS — MinIO ships no images any more), bucket
   script `scripts/b2-bucket.mjs`, `docs/environments.md` "Hosted files". Settings migration
   still to push to dev.
7. **Then:** `US-036` … (Phase 3). `US-040` is no longer a
   step here: `ADR-024` moved it to `EP-10`, which is live on `app.lunashoots.com` since
   2026-10-21.

Agreed approach (owner, 2026-10-04): build on the existing components, logic kept apart from
presentation; the owner's design is applied afterwards; Ilona sees it only once designed.
The design list (screens and states) was given in chat on 2026-10-04 and is mirrored in
"Screens that need design" below.

**Spec state:** `docs/product` on `main`, frozen 2026-10-16 from discovery `28b4bdf`. `EP-07`
and `US-036`–`US-039` are unchanged since the 2026-10-04 freeze; `ADR-023` and `ADR-024` came
after and bear on it (PRO tier; `US-040` gone). `ADR-021` open question 1 (whole folders) is
still open.

## Where the code is today
What this plan builds on (surveyed 2026-10-03, re-surveyed 2026-10-21 on `main` after `EP-10`):

- **Uploads read the whole file into memory** — `fetch(asset.uri)` then `arrayBuffer()` and
  `supabase.storage…upload` (`src/features/references/api.ts:186`, `crew/api.ts:212`,
  `shoots/locationMedia.ts:57`, and since `US-033` `auth/profile.ts:101`). Fine for a photo;
  impossible for a 40 GB raw set.
- **Pickers:** only `expo-image-picker`. No `expo-document-picker`, `expo-file-system`, and no S3
  library. On the web the upload needs neither — a plain `<input type="file">` and drop zone in
  a `.web.tsx` file, sliced with `File.slice`.
- **No storage abstraction** — each feature declares its own `BUCKET` (`shoot-media`, `avatars`)
  and signed-URL TTL.
- **Edge Functions:** `link-gateway`, `revenuecat-sync`, `revenuecat-webhook`, `_shared`. Custom
  secrets already exist (`REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`), so the B2 keys
  follow a known path. `clientPayload` returns `rawFilesUrl` / `finishedPhotosUrl`
  (`link-gateway/index.ts:633`, `:635`); the crew payload carries no file links.
- **Access is per entitlement** — `account_access` has one row per (user, entitlement), built so
  PRO is "a second entitlement, not a rewrite" (`20261009120000_account_access.sql`).
  `has_access()` today counts any entitlement (`20261010120000_view_mode.sql`), so a PRO check
  is a new function beside it, not a change to it.
- **Web app is live** (`EP-10`): `app.lunashoots.com`, desktop layout (`US-057`), web-only code in
  `.web.tsx` files (`AppShell.web.tsx`, `DateField.web.tsx`, …). `US-040`'s work is done.
- **`expo-notifications` is installed** (`US-041`, `US-066` — local notifications only). `US-039`
  still needs server push: an APNs key, push tokens, and removing
  `plugins/withoutPushEntitlement.js`, which strips `aps-environment`.
- **No `pg_cron`, `pg_net`, no scheduled job.** v1 grants no `DELETE` anywhere
  (`20260825140000_grants.sql`).
- ~~**Existing gap:** the link view did not re-request the payload on a media error~~ — fixed
  2026-10-04 in `fix(US-010)` and `fix(US-021)`.
- **Tests** are end-to-end acceptance suites against local Supabase (`tests/acceptance/`), with a
  guard that refuses hosted projects. B2 cannot be reached from them as-is.

## Phase 0 — decisions still open
Owner questions, from `EP-07.md`. Answered ones struck through.

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | File types | `US-036` | **decided** (owner, 2026-10-23): raw files — any file, video included; finished photos — JPEG, PNG, HEIC, TIFF, WebP only, no video |
| 2 | Quota shown to the creator | `US-036` | **yes** (owner, 2026-10-03) — in the shoot's Files section (owner, 2026-10-23); the design may add more places |
| 3 | What "view" means for the client: previews for finished photos, a list for raw files? | `US-024`/`025` | open |
| 4 | Copy: upload blocked after the deletion date (`US-036` AC-7) | `US-036` | **decided** (owner, 2026-10-23) — see "Approved copy" below |
| 5 | Delete confirmation and its copy (`US-038`) | `US-038` | open |
| 6 | Interrupted upload — resumed or restarted | `US-036` | **resumed** — S-6 F-2, F-3, F-7: by picking the same file again after a closed tab |
| 7 | When to ask for push permission; what if refused | `US-039` | open |
| 8 | Where a tap on the push leads | `US-039` | open |
| 9 | `{назва}` in the push copy — the shoot has no title | `US-039` | open |
| 10 | Section with no files ever and no link — what the client sees | `US-024`/`025` | open |
| 11 | **PRO tier** (`ADR-023` decision 7): may only a PRO subscriber upload? Its price, product ID (`com.lunashoots.ios.pro.monthly`?), what a base subscriber sees in the Files section, what happens to stored files when PRO lapses. *Added 2026-10-21 — the EP-07 spec predates `ADR-023`* | `US-036`, `US-024`/`025` | **deferred** (owner, 2026-10-22) — temporary rule: base access; ADR before prod |

### Approved copy for `US-036` (owner, 2026-10-23)
`{quota}` comes from `file_hosting_settings`, never a literal 200.

| State | uk | en |
|---|---|---|
| Upload blocked after the deletion date (AC-7) | Термін зберігання файлів цієї зйомки минув {дата}. Завантажити нові файли вже не можна. | File storage for this shoot ended on {date}. New files can no longer be uploaded. |
| Quota full, or the new files would pass it (AC-3) | Сховище заповнене ({квота} ГБ). Видаліть файли інших зйомок, щоб завантажити нові. | Storage is full ({quota} GB). Delete files from other shoots to upload new ones. |
| Quota indicator | Використано {X} з {квота} ГБ | {X} of {quota} GB used |
| B2 slow, retrying (S-6 F-3) | Сховище відповідає повільно — завантаження триває. | Storage is responding slowly — still uploading. |
| Offline | Немає з'єднання. Завантаження продовжиться, щойно з'явиться мережа. | No connection. The upload will continue once you're back online. |
| Interrupted, file must be picked again (S-6 F-7) | Завантаження «{назва}» перервано. Виберіть цей файл ще раз, щоб продовжити з того ж місця. | The upload of “{name}” was interrupted. Choose this file again to continue where it stopped. |
| Not a photo, in finished photos | «{назва}» — не фото. У «Готові фото» можна завантажити JPEG, PNG, HEIC, TIFF або WebP. Відео та інші файли додавайте у «Вихідники». | “{name}” is not a photo. Finished photos accept JPEG, PNG, HEIC, TIFF or WebP. Add videos and other files to Raw files. |
| Failed for another reason | Не вдалося завантажити «{назва}». Спробуйте ще раз. | Couldn't upload “{name}”. Please try again. |

English section names: use the app's existing ones if it has them.

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

## Phase 1 — spike S-6 *(done 2026-10-22 — see the spike write-up)*
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

**Needed from the owner before the spike:** a Backblaze account and a `dev` B2 bucket in EU
Central with an application key scoped to it. The `prod` bucket waits for the release.

## Phase 2 — foundation *(done 2026-10-23; no story ID → `chore`)*
- **B2 buckets:** private, EU Central; CORS for `app.lunashoots.com` (uploads) and the link
  surface (downloads); no lifecycle rules (deletion
  is ours, `ADR-020` decision 3).
- **Storage interface** (Edge Functions side): `createUpload`, `signPart`, `completeUpload`,
  `abortUpload`, `signDownload`, `deleteObject`, over the S3 API. B2 is the only implementation;
  R2 later is a config change. The small-image paths (`shoot-media`) stay on Supabase Storage
  for now but go through the same shape so they can move (`ADR-020`, "revisit when").
- **Provider per file:** each `ShootFile` row records its `provider` (`b2`), so a move to R2 can
  send new uploads there while B2 files run out their 30 days — no migration of objects.
- **Retention in one place:** retention days (30), warning days (3) and quota (200 GB) are
  server-side settings; UI copy reads the numbers from them. `shoots.files_delete_at` is fixed at
  the first upload (`ADR-020`), so a changed setting applies to new shoots only.
- **Secrets:** `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT` via
  `supabase secrets set`; documented in `docs/deploy-dev.md`.
- **Tests:** a local S3 (MinIO in Docker) behind the same interface, so acceptance suites stay
  local-only and never touch B2.

## Phase 3 — stories, in `backlog-order.md` order
Each story: migration → Edge Function → app → acceptance suite → commit `feat(US-xxx): …`.

| Order | Story | Main work | Assumed |
|---|---|---|---|
| ~~0~~ | ~~fix: link view re-requests on media error~~ | done 2026-10-04 | — |
| ~~1~~ | ~~**US-040** the app in a desktop browser~~ | moved to `EP-10` by `ADR-024`; live 2026-10-21 | — |
| 2 | **US-036** upload | migration: `shoot_files` table (`ShootFile` + technical columns `provider`, `status`, `upload_id` — not in `data-model.md`; owner agreed 2026-10-23, note it in discovery at the next re-freeze), `shoots.files_delete_at`, per-account usage function, `can_host_files()` (base access until the PRO ADR, #11); Edge Function `files` (start: access + quota + date check, sign parts; complete; abort); web (`.web.tsx`): file picker + drag-and-drop, sliced upload queue, progress, quota display | 5–7 days |
| 3 | **US-024 → US-025** client sees and downloads | gateway `clientPayload` adds files with presigned GETs; crew payload unchanged (AC-7, tested); link view: list/previews, single download, download all, date, deleted placeholder | 3–4 days |
| 4 | **US-037** deletion date | date in both sections; enable `pg_cron` + `pg_net`; daily job → Edge Function `files-sweeper` deletes objects and rows past `files_delete_at` | 2 days |
| 5 | **US-038** early delete | Edge Function delete (one / all), creator-only; confirmation | 1–2 days |
| 6 | **US-039** push warning | `expo-notifications` (installed) gets server push: drop `withoutPushEntitlement.js`, Push capability on the App ID, `push_tokens` table, permission flow; `files-sweeper` sends the 3-day warning via Expo's push API. **Needs from the owner:** an APNs key in the Apple Developer account | 3 days |

**Total, assumed:** ~4 weeks including the spike (was ~5 with `US-040`).

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
4. ~~**Web frame**~~ — done by `US-057` (desktop layout). The Files section is designed into
   that layout instead.

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
1. ~~Where the quota shows~~ — the shoot's Files section (owner, 2026-10-23).
2. What "view" means for the client — previews for finished photos and a list for raw, or a list
   for everything?
3. Copy for items 9 and 10.
4. A section with no files and no link — what the client sees (item 3, last state).
5. ~~Whole folders~~ — yes; every file in it and its subfolders goes into one flat list (owner,
   2026-10-23; `US-036` open question 5).
6. Push — a pre-prompt (item 14), or the system dialog only?
7. A base (non-PRO) subscriber — what the Files section shows them (#11).
8. «Завантажити все» on a phone — iPhone Safari asks once per file (S-6 F-8); what it means
   for a raw set of hundreds of files.
9. States S-6 added to item 6: «B2 відповідає повільно, продовжуємо…» (F-3) and «Завантаження
   перервано — виберіть файл знову, щоб продовжити» (F-7). Copy not chosen.
