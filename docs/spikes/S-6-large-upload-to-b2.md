# S-6 — A large upload from the browser straight to B2, and its download on a phone

- **Retires:** the assumption in `ADR-021` that a desktop browser can upload a raw set to
  Backblaze B2 directly, and `docs/plans/EP-07-file-hosting.md` Phase 1
- **Date:** 2026-10-22
- **Branch:** `spike/s-6-large-upload`
- **Status:** **holds** — 6 GB reached B2 from Chrome and Safari, survived a closed tab, a
  sleeping laptop and an evening of B2 server errors, and downloaded on an iPhone logged out.
  Not checked: Firefox, Edge, Android Chrome.

## What the spike was for
`ADR-020` puts raw files and finished photos on B2; `ADR-021` uploads them from the
photographer's browser. 30–40 GB per shoot cannot pass through an Edge Function, so the browser
has to send the bytes to B2 itself, with URLs our server signs. If that does not work in a real
browser on a real connection, `US-036` has no design.

## What was built
Kept for `US-036` to build on:
- `supabase/functions/_shared/storage.ts` — the storage interface over the S3 API:
  `createUpload`, `signPart`, `listParts`, `completeUpload`, `abortUpload`, `signDownload`,
  `listObjects`, `deleteObject`. B2 is configured by five settings (`B2_ENDPOINT`, `B2_REGION`,
  `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`); R2 later is a change of those, not of the code
  (`ADR-020` decision 1).
- Function secrets on dev: the five above. Locally: `supabase/functions/.env.local` (git-ignored,
  mode 600).

Throwaway, deleted by `US-036`: `supabase/functions/files-spike`, its `config.toml` entry,
`app/(app)/spike-s6.tsx` / `.web.tsx`, `public/spike-s6-dl/`.

Backblaze (owner, 2026-10-22): account in **EU Central** (`s3.eu-central-003.backblazeb2.com`);
bucket `luna-shoots-files-dev`, private; an application key restricted to that bucket. CORS rule
`devUploadsAndDownloads`: origins `https://dev.lunashoots.com`, `http://localhost:8081`; GET,
HEAD, PUT; exposes `ETag`. Card added; daily caps $0.50 storage, $0.50 download.

## How it works
1. The page asks `files-spike` to **start**; the function creates a multipart upload in B2 and
   returns its id.
2. The page slices the file with `File.slice` into 100 MB parts and, four at a time, asks the
   function to **sign** a part, then `PUT`s it straight to B2 with `XMLHttpRequest` (for upload
   progress). B2 answers with the part's `ETag`.
3. When every part is in, the function **completes** the upload with the list of ETags.
4. The upload id is kept in `localStorage` under the file's name + size + date. Picking the same
   file again asks B2 which parts it already holds (**listParts**) and sends only the rest.
5. Downloads are presigned GETs with `response-content-disposition: attachment`.

## The runs
| Run | Where | Result |
|---|---|---|
| 120 MB, interrupted halfway | Node, local function | resumed from the 6 parts B2 held; size, download, delete OK |
| 5.2 GB, 53 × 100 MB, 4 parallel | Node, local function | 123 s, ~360 Mbit/s |
| 6 GB | Chrome, dev | 394 s, 131 Mbit/s average — started on 2.4 GHz Wi-Fi, a 1 s network drop mid-way |
| 6 GB, tab closed at ~20 % | Chrome, dev | file picked again → «у B2 вже 12/62 частин», went on at ~320 Mbit/s |
| 6 GB | Safari, dev | stopped at 63 % — B2 storage cap (F-4); after the cap was raised, resumed from 39/62, done |
| 6 GB, lid closed ~5 min | Chrome, dev | woke and went on by itself; then stalled silently (F-2) |
| 6 GB, after F-2/F-3 fixes | Chrome, dev | 842 s, 36 Mbit/s, through dozens of B2 `500`/`503` — no part lost, no click needed |
| Screenshots + 6 GB, logged out | iPhone Safari | single file: View / Download, both work; «Завантажити все»: one prompt **per file**; 6 GB started downloading |

## Findings

### F-1 — The design holds. *(the spike's question)*
Browser → presigned part URLs → B2, with the function never touching the bytes, moved 6 GB in
both Chrome and Safari. Signing S3 requests in the Edge runtime works (`aws4fetch`). Downloads
need nothing but a presigned URL, so the link gateway can hand them to a logged-out client.

### F-2 — A connection can hang with no error. Every part needs a stall timeout.
After the laptop slept and the Wi-Fi reconnected, one part's request neither progressed nor
failed — the page waited for six minutes and would have waited forever. Fixed in the spike: no
upload progress for **60 s** → abort and retry. `US-036` must do the same.

### F-3 — B2 answers `500` and `503` under load; retry them without a limit.
On the evening of 2026-10-22 B2 returned `500 InternalError: internal incident` and `503` on a
large share of parts, from the browser and from `curl` alike, and throughput fell from ~320 to
~30 Mbit/s for the same connection. A limit of 8 attempts per part was exhausted; with unlimited
retries and a pause growing to a minute, the same 6 GB finished without help. Whether this was
one bad evening or B2's normal is **not known** — one evening is not a measurement.

Retrying without a limit is right only for **transient** errors (network, stall, `429`, `500`,
`503`). A **permanent** one — quota full, the deletion date passed, the upload aborted — must stop
with a message. See F-5 for why the browser cannot tell them apart by itself.

### F-4 — The B2 account cap stops every upload at once, and frees up slowly.
The free account holds 10 GB. Past it B2 refuses every write with `403 storage cap exceeded` — for
all users, not one. Deleting files did **not** lift it at once (still refused minutes later);
raising the cap in Caps & Alerts did, within a minute. For prod: a card on the account and a cap
set deliberately above the sum of account quotas, with the 75 % / 100 % alerts going to the
owner. Into the release checklist.

### F-5 — B2's error responses carry no CORS headers; the browser sees only "network".
The cap's `403` reached the page as a bare network error (`status 0`), as do some `500`s. So the
page cannot tell "B2 is busy" from "you are out of quota". `US-036`: after a few failed attempts
in a row, ask **our** server whether the upload may continue — it can see quota, date and whether
the upload still exists — and either keep retrying or stop with the reason. Our own quota check
before signing parts means the B2 cap should never be what stops a photographer (F-4).

### F-6 — A plain S3 DELETE on B2 only hides the file.
The bytes stay — billed and counted — as a hidden version. `deleteObject` lists the key's
versions and deletes each one; checked: no versions and no open uploads left. Matters for
`US-037` (the sweeper) and `US-038` (early delete), where deletion must be final (`ADR-020`
decision 3).

### F-7 — A closed tab loses the file, not the parts.
Parts already in B2 survive; up to four in flight (≤ 400 MB) are sent again. The browser cannot
reopen the file by itself — the photographer has to pick the same file again. `US-036` needs an
"interrupted — pick the file again to continue" state (design list item 6).

### F-8 — «Завантажити все» on an iPhone asks once per file.
Safari asks View / Download for every file. Fine for a few dozen finished photos; for a raw set
of hundreds of files it is not usable. A zip of 40 GB is out of reach (neither an Edge Function
nor B2 builds one). **What «Завантажити все» means on a phone, especially for raw files, is a
product question for the owner** — added to "Decisions the design depends on".

### F-9 — Throughput is the connection's, not the browser's.
Chrome on 5 GHz Wi-Fi ran at ~320 Mbit/s, the same as Node on the same Mac; on 2.4 GHz it was a
fraction of that. 30 GB is ~13 min at 320 Mbit/s and ~2 h at 36. Four parts of 100 MB in
parallel was enough to fill the link; not tuned further.

## Not checked
- **Firefox and Edge** (owner's call, 2026-10-22). Same mechanisms as Chrome (`File.slice`, XHR,
  CORS); low risk.
- **Android Chrome download** (owner's call). The app ships on iOS only, but a **client's** link
  view opens in any phone's browser — a client on Android downloads through Chrome. Two minutes on
  any Android phone before `US-025` ships.
- **B2 against R2** on the same connection at the same time. Owner, 2026-10-22: stay on B2, keep
  the move to R2 a configuration change, watch storage use, and switch if needed.

## For `US-036` and after
- Server-side: quota, deletion date and access checked **before** signing parts (F-4, F-5).
- Client: stall timeout (F-2), unlimited retries for transient errors with a pause capped at a
  minute (F-3), a server check after repeated failures (F-5), resume by picking the file again
  (F-7), a visible "B2 is slow, retrying" state (design).
- `deleteObject` deletes all versions (F-6).
- Prod bucket: CORS for `app.lunashoots.com` (uploads) and the link surface (downloads); caps and
  alerts (F-4).
