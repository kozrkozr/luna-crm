# Workflow — development and release

The day-to-day loop, and the release, step by step. Which command talks to which backend is in
[`environments.md`](environments.md); first-time setup of a hosted environment in
[`deploy-dev.md`](deploy-dev.md); Apple paperwork in [`release-appstore.md`](release-appstore.md).

Two apps can sit on the phone at once: **Luna Dev** (your builds, over USB) and **Luna Shoots**
(TestFlight / App Store). Luna Dev never goes to TestFlight.

---

## Development

### 0. Is it a product change?
A new behaviour, field, limit or copy the stories do not cover goes to the discovery repo first
(story or ADR), then `docs/product/` is re-frozen — never edited here (`CLAUDE.md` rules 1, 7).

### 1. Branch
```bash
git switch main && git pull
git switch -c fix/us-010-short-name        # or feat/…, chore/…
```

### 2. Run it locally
```bash
npx supabase start                         # local Postgres, Auth, Storage
npm run ios:local                          # Luna Dev in the simulator, against local
npm run start:local                        # later: Metro only, JS hot-reloads
```
`ios:local` needs `.env.local` (`environments.md`, one-time setup). After a change to
`app.config.ts`, a plugin, or a native package, run `ios:local` again — it re-prebuilds.

The link views (crew and client) are a separate static export — see README, "Running the link
surface". Test them **logged out, in a mobile browser** (`CLAUDE.md`).

### 3. Database or gateway change
```bash
npx supabase migration new short_name      # write the SQL in supabase/migrations/
npx supabase db reset                      # re-applies every migration locally
npx supabase functions serve link-gateway --no-verify-jwt
```
Migrations are forward-only once they reach a hosted project. Every read filters soft-deleted
rows (`CLAUDE.md` rule 3).

### 4. Check
```bash
npm run typecheck
bash tests/acceptance/run-all.sh <suite>   # see tests/acceptance/README.md
```
**Known gap:** most suites seed `client_name`/`client_contact`, dropped on 2026-08-29, and fail
at setup. `us010-media` and `us021-media` seed through `clients`.

### 5. Commit
`<type>(<story ID>): <imperative summary>` — one story ID per commit (`CLAUDE.md` rule 6).
Work with no story: `chore(<area>): …`.

### 6. Try it on the phone, against dev
```bash
npm run use:dev && npm run env:status      # .env and the Supabase CLI both on dev
npx supabase db push                       # only if there are new migrations
npx supabase functions deploy link-gateway # only if the gateway changed
npm run deploy:web:dev                     # the link views, Pages `dev` branch
npm run ios                                # Luna Dev on the USB phone, against dev
```
`npm run ios` is a Debug build: it needs Metro (`npm run start`) running on the Mac. Its Xcode
project is `ios/LunaDev.xcworkspace`; close Xcode before switching between Luna Dev and Luna
Shoots (`environments.md`). Then send
yourself a crew or client link and open it from Messages, on mobile data.

### 7. Merge
```bash
git push -u origin <branch>
# review, then:
git switch main && git merge --ff-only <branch> && git push
```

---

## Release

### 1. `main` is ready
Everything for the release is merged; `npm run typecheck` passes; the changed flows were tried
on dev (step 6 above).

### 2. Bump the build number
In `app.config.ts`: `ios.buildNumber` +1 — **every upload**, App Store Connect rejects a
duplicate. Raise `version` too if the store page should show a new version.
```bash
git commit -am "chore(release): build <N>"
```

### 3. Backend to prod — before the app
```bash
npm run use:prod && npm run env:status     # both must say prod — STOP if they do not
npx supabase db push                       # if there are new migrations
npx supabase functions deploy link-gateway # if the gateway changed
```
The database goes first: the installed beta keeps running against it, so a migration must not
break the build people already have.

### 4. Link views to prod
```bash
npm run deploy:web                         # builds against .env.prod, verifies, deploys `main`
```
Then open a real crew and client link on a phone, logged out.

### 5. The app → TestFlight
```bash
npm run prebuild:prod                      # ios/ as Luna Shoots, pinned to prod
open ios/LunaShoots.xcworkspace
```
In Xcode: **Any iOS Device (arm64)** → **Product → Archive** → **Distribute App → App Store
Connect → Upload**. Apple's processing takes 20–60 minutes.

### 6. TestFlight
In App Store Connect, add the build to the tester group. Install it on your phone from
TestFlight (it updates **Luna Shoots**, Luna Dev is untouched) and open it once.

### 7. Tag it
```bash
git tag v<version>-build<N> && git push --tags
```

### 8. Point the CLI back at dev
```bash
npm run use:dev
npx supabase link --project-ref <dev ref>  # env:status prints the exact command
```
So the next `db push` cannot reach prod by accident.
