# ADR-020 — Host raw files and finished photos on Backblaze B2, 30 days per shoot, 200 GB per account

- **Date:** 2026-10-03
- **Status:** accepted
- **Supersedes in part:** `ADR-005` — file delivery is no longer deferred
- **Supersedes:** `ADR-008` — the placeholder/pasted-link sections give way to hosted files
- **Does not change:** `ADR-011` (Supabase stays the backend; its Storage keeps the small images
  of `US-003`, `US-005`, `US-018`), `ADR-013` (anonymous reads still go through the link gateway)
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-03)

## Context
`ADR-005` deferred raw-file and finished-photo delivery so the crew/call-sheet half could ship
first; its "revisit when" was the owner deciding file delivery is still needed. `ADR-008` filled
the gap with a placeholder or a pasted link to a file-sharing service (`US-024`, `US-025`). The
crew half is now in beta, and on 2026-10-03 the owner decided to host the files in the product.

Three facts shaped the decision:
- **Volume.** Ilona runs ~15 shoots a month (`00-intake/s02-2026-08-22/summary.md`, line 43) and
  produces 30–40 GB of raw files per shoot (Ilona, via the owner, chat 2026-10-03) — up to
  ~600 GB a month if every shoot's raw files were uploaded.
- **Transfer cost.** Supabase Storage bills egress at $0.09/GB, which rules it out for files a
  client downloads in tens of gigabytes.
- **Competitors** (desk research, 2026-10-03, not in `01-discovery/competitors.md` yet): gallery
  tools (Pixieset, Pic-Time, ShootProof) quota storage per account — ~10 GB at ~$8–10/month — and
  mostly do not accept raw files; "expiry" there closes client access and keeps the files.
  File-transfer tools (WeTransfer, FEX.NET) delete files after a fixed period.

## Options considered
### Provider
- **Supabase Storage** — already in the stack; egress at $0.09/GB rules it out at this volume.
- **Cloudflare R2** — $15/TB stored, zero egress.
- **Backblaze B2** *(chosen)* — ~$6.95/TB stored; egress free up to 3× the stored volume, which
  covers a client downloading their files a couple of times. S3-compatible API.

### Retention
- **A. Expiry closes client access, files stay** (Pic-Time) — storage only grows.
- **B. Expiry deletes the files; the photographer may delete earlier** *(chosen)* — storage stays
  bounded; the cost is that a photographer can lose files they still wanted.
- **C. Access closes first, deletion later** — two periods to explain.

### When the period starts
- **Per file, from its upload** — B2 lifecycle rules do it natively, but a shoot loses its files
  piecemeal. Rejected by the owner.
- **Shoot date** — editable, so the deletion date would move with it. Rejected by the owner.
- **Last upload to the shoot** — each upload extends the whole shoot; can be kept alive forever.
- **First upload to the shoot** *(chosen)* — fixed once set; files added later get less time.
- **An explicit "deliver" action** — needs a new action and a rule for when it never happens.

### Quota
- **Per shoot** — rejected; **per account** *(chosen)*, as every gallery competitor does.
- In GB *(chosen)* rather than a photo count — raw file sizes vary too much for a count.

## Decision
1. **Provider:** Backblaze B2, region EU Central (Amsterdam), through its S3-compatible API,
   behind an abstraction that allows a later move to Cloudflare R2.
2. **What is hosted:** raw files (`вихідники`) and finished photos (`готові фото`).
3. **Retention:** a shoot's hosted files are deleted **30 days after the first file was uploaded
   to that shoot**. The shoot creator may delete them earlier. The period is per shoot, not per
   file, so B2 lifecycle rules do not apply — the deletion is the product's own scheduled job.
4. **Warning:** the shoot creator gets an in-app **push notification 3 days before** the deletion.
5. **Quota:** **200 GB per account**, across all of its shoots. When it is full, uploads are
   blocked until the creator deletes something. **No per-file size limit.**
6. **Price:** not decided. For now the 200 GB quota applies to every account, with no payment.
   200 GB for $10/month is the working assumption, with a larger tier for heavy raw users later.
7. **Upload source:** this ADR covers uploading from the iOS app. Uploading raw files from a
   computer (a web app for the photographer) is a separate ADR — 30–40 GB per shoot is not
   realistic from a phone.

## Consequences
- **Accepted cost:** a photographer who misses the warning loses the files — deletion is final.
  200 GB holds about five of Ilona's raw shoots, not a month of them; until the larger tier
  exists, heavy raw users will hit the quota.
- **Accepted cost:** the app gains push notifications, which it does not have today — a new
  dependency (APNs, device tokens) for a single notification.
- **Now easier:** the "one record" premise of `ADR-004` holds for file delivery; the client no
  longer leaves the product for a file-sharing service.
- **Now harder:** a second storage provider beside Supabase Storage, a scheduled deletion job,
  per-account usage accounting, and large uploads on mobile networks.
- **Cost at full use** (assumption: every account fills its quota): 200 GB on B2 ≈ $1.39/month
  per account. At $10 through the App Store — assuming Apple withholds 20% VAT and a 15%
  commission, unverified — ≈ $7.08 reaches the owner, ≈ $5.69 after storage.
- **Revisit when:** Supabase Storage nears its limits — the small images of `US-003`, `US-005`,
  `US-018` can then move to B2 through the same storage interface (owner, chat 2026-10-03);
  a price is set (then the quota and period may vary by tier), or the web
  upload ADR is written.

## Consequences for existing artifacts
| Artifact | Change |
|---|---|
| `ADR-005` | status: superseded in part by `ADR-020` |
| `ADR-008` | status: superseded by `ADR-020` |
| `US-024`, `US-025` | rewritten for hosted files |
| `EP-07` | new — `US-036`–`US-039`, the creator's side |
| `01-discovery/glossary.md` | `файл зйомки` / shoot file / `ShootFile` |
| `04-tech/backlog-order.md` | `EP-07` and spike `S-6` |
| `04-tech/data-model.md` | `raw_files_url`/`finished_photos_url` and the "no stored files" note change; a per-file record and per-account usage are added |
| `04-tech/architecture.md` | B2 as a second storage layer; a scheduled deletion job; push notifications |
| `04-tech/risks.md` | R-5 rewritten |
| `02-product/prd.md` | the "$10 tier does not apply to v1" line and the file-delivery non-goal |
| `01-discovery/competitors.md` | the 2026-10-03 storage research |

## Open questions
The seven story-level questions raised with this ADR were answered in the same chat
(2026-10-03) and are recorded in `US-024`, `US-025` and `EP-07`: the pasted link stays beside
hosted files; only the client sees the files for now; the client views and downloads them, one
by one or all at once; after deletion the section shows the pasted link, or otherwise
«Файли видалено. Зверніться до фотографа, якщо вони ще потрібні.» — the shoot link itself keeps
working, `ADR-014` unchanged; the creator and the client see «Файли доступні до {дата}»; the
entity is `ShootFile` (файл зйомки). What remains open is listed in `EP-07`.
