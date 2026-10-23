# Environments and app variants

Since 2026-10-04. Which backend a build talks to is decided by **the script you run**, not by
the `.env` file on disk.

## Three environments

| Target | Env file | App on the phone | Supabase | Link surface |
|---|---|---|---|---|
| `local` | `.env.local` | **Luna Dev** | local (`supabase start`) | `serve:link`, LAN |
| `dev` | `.env.dev` | **Luna Dev** | dev project | Pages `dev` branch → `dev.lunashoots.com` |
| `prod` | `.env.prod` | **Luna Shoots** | prod project | Pages `main` → `lunashoots.com` |

**Two apps, side by side.** `APP_VARIANT` (set by `scripts/variant.mjs`) picks the variant in
`app.config.ts`:

| Variant | Name | Bundle id | URL scheme |
|---|---|---|---|
| `production` | Luna Shoots | `com.lunashoots.ios` | `lunashoots` |
| `development` | Luna Dev | `com.lunashoots.ios.dev` | `lunashoots-dev` |

A dev build no longer replaces the TestFlight beta. Unset `APP_VARIANT` means `development` — a
forgotten variable gives an app that can neither overwrite the beta nor be uploaded.

## Commands

| What | Command |
|---|---|
| Luna Dev on the phone, against dev | `npm run ios` |
| Luna Dev in the simulator, against local | `npm run ios:local` |
| Metro for an installed Luna Dev | `npm run start` (dev) · `npm run start:local` |
| Luna Shoots, Release, on the phone, against prod | `npm run ios:prod` |
| Prepare an App Store archive | `npm run prebuild:prod` → Xcode → Product → Archive |
| Link surface to dev / prod | `npm run deploy:web:dev` · `npm run deploy:web` |

`--prebuild` regenerates `ios/` when it was generated for another variant or backend; the
bundle id, the scheme and the baked env all live there. Switching costs one `prebuild` (with
`pod install`).

**The Xcode project is named after the app:** `ios/LunaDev.xcworkspace` for Luna Dev,
`ios/LunaShoots.xcworkspace` for Luna Shoots. Close Xcode before switching — otherwise it reports
that the open workspace "has disappeared". Harmless: close that window and open the new one.

## The dev link surface: `dev.lunashoots.com` (2026-10-06)
Dev links used to point at `https://dev.luna-crm-107.pages.dev`, and **never opened**, for two
reasons found together:
- **Nothing had ever been deployed to the `dev` branch.** Every Pages deployment was Production
  from `main`, so the `dev.` alias answered Cloudflare's own 404. `npm run deploy:web:dev` creates
  it; check with `npx wrangler pages deployment list --project-name=luna-crm` (a `Preview` row on
  branch `dev`).
- **Some networks do not resolve `*.pages.dev` at all** — the owner's home router answers
  NXDOMAIN, and the phone failed on mobile data too. `lunashoots.com` resolves everywhere.

So the dev surface has its own subdomain, set up in Cloudflare by the owner:
1. Pages → `luna-crm` → Custom domains → `dev.lunashoots.com` → Activate.
2. DNS → `lunashoots.com` → the `dev` CNAME's target changed from `luna-crm-107.pages.dev` to
   **`dev.luna-crm-107.pages.dev`**, **Proxied** — unproxied, Cloudflare serves production.

`.env.dev` holds `EXPO_PUBLIC_LINK_BASE_URL=https://dev.lunashoots.com`. The host is baked into
the export **and** into Luna Dev, so a change needs `deploy:web:dev` and `npm run ios` both.

## How the backend is pinned
- `scripts/variant.mjs <target>` loads `.env.<target>` into the command's environment. Variables
  already in the environment win over `.env`, so `.env` is not read for these values.
- `plugins/withVariantEnv.js` writes `APP_VARIANT`, `EXPO_PUBLIC_*` and `NODE_BINARY` into
  `ios/.xcode.env` at prebuild. Xcode's bundling phase sources that file, so an archive made in
  the Xcode window bundles against the variant `ios/` was prebuilt for.
  *Verified 2026-10-04:* a dev-prebuilt project bundled with `.env` set to prod carried the dev
  project's ref and no prod ref.
- `app.config.ts` refuses `APP_VARIANT=production` with any Supabase URL other than `.env.prod`'s.
- `deploy:web*` → `env:verify` checks `dist/` against the build's environment.

## What still uses `.env`
Plain `expo` commands, `npm run web`, and the acceptance suites (`tests/acceptance/env.mjs`).
`use:dev` / `use:prod` / `env:status` stay for those, and for `supabase link` — **`supabase db
push` still goes to whichever project the CLI is linked to**; check `env:status` first.

## One-time setup for Luna Dev
- **Dev Supabase project** → Authentication → URL Configuration → add
  `lunashoots-dev://reset` and `lunashoots-dev://confirm`, or its auth emails are refused
  (`src/features/auth/authLink.ts`). The local `supabase/config.toml` has them already.
- **Signing:** the first `npm run ios` registers `com.lunashoots.ios.dev` under the paid team
  (`appleTeamId` in `app.config.ts`) through Xcode's automatic signing.
- **`.env.local`** — for `ios:local` / `start:local`: copy `.env.local-backup` and update the LAN
  address.

## Hosted files: where each environment keeps them (EP-07, 2026-10-23)

Raw files and finished photos go to an S3-compatible store, not Supabase Storage (`ADR-020`;
the small images of `US-003`, `US-005`, `US-018` stay in Supabase Storage). The functions read
five settings — `B2_ENDPOINT`, `B2_REGION`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY` — and
nothing else names the provider, so a move to Cloudflare R2 is a change of these.

| Target | Store | Settings |
|---|---|---|
| `local` | SeaweedFS in Docker — `bash scripts/local-s3.sh start` | `supabase/functions/local-s3.env` (fake keys, committed) |
| `dev` | B2 bucket `luna-shoots-files-dev`, EU Central | function secrets on the dev project; a copy in `supabase/functions/.env.local` (git-ignored, mode 600) |
| `prod` | **not set up yet** — EP-07 does not reach prod before the PRO tier ADR | — |

Setting the dev secrets again (the CLI must be linked to dev):

```bash
npx supabase secrets set --env-file supabase/functions/.env.local
```

The bucket itself — private, SSE-B2, CORS, no lifecycle rules — is set by a script, not by hand:
`node scripts/b2-bucket.mjs dev supabase/functions/.env.local`.

**Never point the acceptance suites at B2.** `files-storage` refuses any endpoint but localhost.

### Before EP-07 reaches prod
From `docs/spikes/S-6-large-upload-to-b2.md`:
1. A `prod` bucket in the same EU Central account, private; a key restricted to it with
   writeBuckets; `node scripts/b2-bucket.mjs prod <file with that key>`.
2. The key into the prod project: `supabase secrets set` with the CLI linked to prod, then relink
   dev.
3. **Caps & Alerts** — the caps are per account, so dev and prod share them. Set the storage cap
   above the expected use of all accounts with a margin, not at "200 GB × accounts"; alerts at
   75 % / 100 % go to the owner. A reached cap stops uploads for **everyone** (S-6 F-4).
4. The settings row (`file_hosting_settings`) checked on prod: retention, warning, quota, URL
   lifetime.
