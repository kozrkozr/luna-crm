# Environments and app variants

Since 2026-10-04. Which backend a build talks to is decided by **the script you run**, not by
the `.env` file on disk.

## Three environments

| Target | Env file | App on the phone | Supabase | Link surface |
|---|---|---|---|---|
| `local` | `.env.local` | **Luna Dev** | local (`supabase start`) | `serve:link`, LAN |
| `dev` | `.env.dev` | **Luna Dev** | dev project | Pages `dev` branch |
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
