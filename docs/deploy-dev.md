# Deploying a dev environment

Getting the app off this Mac: a hosted Supabase project, the link surface on Cloudflare Pages,
and the iPhone build talking to both. Everything below is free tier.

**What "dev" means here:** a real, reachable environment used for testing — not production. It
gets test data, email confirmation is off, and nothing in it is precious.

---

## The order, and why it is this order

Each step needs a value the one before it produces, so they do not reorder:

```
1. Supabase          → gives you the project URL + anon key
2. .env              → the app and the export both read these at BUILD time
3. Cloudflare Pages  → gives you the link host
4. .env again        → EXPO_PUBLIC_LINK_BASE_URL is the Pages host
5. Rebuild + redeploy
6. iPhone build
```

**The thing that catches people:** `EXPO_PUBLIC_*` values are baked into the bundle when it is
built, not read at runtime. Change `.env` and nothing updates until you rebuild — both the web
export and the iPhone app. That is why steps 5 and 6 exist rather than being folded in earlier.

---

## Step 0 — Save your local settings first

`.env` currently points at your Mac. You will overwrite it, and you want the old values back
when you next work locally.

```bash
cd ~/WebstormProjects/luna-crm
cp .env .env.local-backup
cat .env.local-backup      # keep this visible somewhere
```

`.env` is gitignored, so none of this is committed.

---

## Step 1 — Create the Supabase project

1. <https://supabase.com/dashboard> → **New project**
2. Name `luna-crm-dev`, region **Frankfurt** or **London** (closest to Ukraine of the free
   regions), and set a database password — save it in your password manager, it is not
   recoverable.
3. Wait ~2 minutes for provisioning.

Then link this repo to it and push the schema:

The CLI is a project devDependency, not a global command — hence `npx`.

```bash
npx supabase login
npx supabase link --project-ref <the ref from your project URL>
npx supabase db push
```

`db push` applies all nine migrations — tables, RLS policies, grants, the storage bucket, the
soft-delete functions and the US-009 matching triggers. It should report nine applied.

### Deploy the link gateway

Two of three user flows are this function. Without it, every link is dead.

```bash
npx supabase functions deploy link-gateway
```

No secrets to set: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically,
and those are the only two it reads.

### Turn off email confirmation — do not skip this

**Dashboard → Authentication → Sign In / Providers → Email → disable "Confirm email".**

Hosted Supabase enables it by default; local does not. Leave it on and registration appears to
succeed, then login fails with «Невірний email або пароль» — because the account exists but is
unconfirmed. It looks exactly like a bug in the app.

`ADR-015` makes email the credential and reset email-based, so confirmation becomes a real
question before production. For dev, off.

---

## Step 2 — Point the app at it

Dashboard → **Project Settings → API**. Copy the Project URL and the `anon` `public` key.

```bash
cat > .env <<'ENV'
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the anon key>
EXPO_PUBLIC_LINK_BASE_URL=https://luna-crm.pages.dev
ENV
```

The `anon` key is safe here — it is designed to be public and every table is closed to it
(the grants migration grants `anon` nothing). **Never** put the `service_role` key in this file:
it bypasses RLS entirely and `EXPO_PUBLIC_` means "shipped inside the bundle".

`EXPO_PUBLIC_LINK_BASE_URL` is filled in ahead of Cloudflare existing because the production URL
is predictable: `https://<project-name>.pages.dev`. Use the same project name in step 3 and this
is already correct. If you pick a different name, come back and fix it.

---

## Step 3 — Deploy the link surface to Cloudflare Pages

Build locally and upload the result. No GitHub repo needed, and no Node version to configure on
Cloudflare's side — you are building on your own Node 22.

```bash
node -v                              # must be >= 22; the export fails on 20
rm -rf dist
npm run export:web                   # export --clear, THEN rename the link routes
npx wrangler pages deploy dist --project-name=luna-crm --branch=main
```

**`--branch` is not optional, and omitting it fails silently.** `wrangler pages
deploy` infers the branch from git when you do not pass one. Any branch that is
not the project's *production* branch produces a **preview** deployment: it
uploads fine, prints a success line and a URL, and publishes to a per-deployment
host like `https://<hash>.luna-crm-107.pages.dev`. Meanwhile
`https://luna-crm-107.pages.dev` — the host baked into
`EXPO_PUBLIC_LINK_BASE_URL`, and the one every real link points at — keeps
serving the previous production deployment.

Nothing warns you. The deploy succeeds and the site is simply unchanged.

`main` is this project's production branch — every deployment in its history is
`Environment: Production, Branch: main`, including ones made while a feature
branch was checked out. Pass it explicitly anyway; relying on whatever git
happens to report is how a preview gets published by accident.

```bash
npx wrangler pages deployment list --project-name=luna-crm   # Environment + Branch columns
```

**Corrected 2026-09-05.** This step used to read `npx expo export -p web --clear`
with an explicit "NOT `npm run export:web`". That was true when it was written
(`d4da527`): the script was a bare `expo export -p web`, with no `--clear`.
Later the same day `5858d46` changed it to
`expo export -p web --clear && node scripts/prepare-link-surface.js`, and the doc
was not updated.

**Following the old line today produces a broken deployment.** Without
`scripts/prepare-link-surface.js` the export leaves `dist/s/[token].html`, and
Cloudflare Pages cannot serve a bracketed filename — it 308s `/s/[token]` to
itself and a reader gets `ERR_TOO_MANY_REDIRECTS` on a perfectly valid link.
That was measured on a live deployment on 2026-08-27 and is the whole reason
`prepare-link-surface.js` exists. `public/_redirects` points at the renamed,
bracket-free files, so the rename and the rewrite rules only work as a pair.

**The project name is `luna-crm`, and it does NOT match its own URL.** The
project `luna-crm` serves `https://luna-crm-107.pages.dev` — the host in
`EXPO_PUBLIC_LINK_BASE_URL`. Inferring the project name from that URL is wrong
and the failure is silent: `wrangler pages deploy` CREATES a project that does
not exist, so `--project-name=luna-crm-107` uploads successfully to a brand-new,
empty project and reports success. Cloudflare then has to invent a domain for
it, because the obvious one is taken — which is where
`luna-crm-107-c5a.pages.dev` came from.

Done exactly that on 2026-09-05. Confirm the pairing rather than guessing it:

```bash
npx wrangler pages project list      # match Project Name to Project Domains
```

**`--clear` is not optional after `.env` changes, and this one bites silently.** Metro caches
transformed modules with the `EXPO_PUBLIC_*` values already inlined. Without it the export
completes normally, prints the same route list, and produces a `dist/` still pointing at whatever
backend the previous build used. Nothing fails; you simply deploy the wrong thing. Confirmed here
on the first attempt — the bundle still carried a `192.168.x.x` LAN address after `.env` had been
switched to the hosted project.

Check the build rather than trusting it:

```bash
grep -rl "<your-project-ref>" dist >/dev/null && echo "ok: hosted URL baked in"
grep -rl "192.168"             dist >/dev/null && echo "STALE — rebuild with --clear"
ls dist/s/                     # must be link.html, link-references.html, link-crew.html
test -f dist/_redirects && echo "ok: rewrite rules will be uploaded"
```

If `ls dist/s/` shows anything with square brackets, `prepare-link-surface.js`
did not run — you exported with the bare `expo export` rather than
`npm run export:web`. Do not deploy that.

First run opens a browser to authorise Cloudflare and offers to create the project — accept
both. It prints the URL when it finishes.

**What gets published:** all 23 exported routes, which is the link views *and* the photographer's
web app. That is a deliberate choice for this phase (`docs/open-questions.md` #26) — the web app
is useful for review. Revisit before anything real ships.

---

## Step 4 — Check the link surface before touching the phone

Cheaper to debug in a desktop browser than on a device.

1. Open `https://luna-crm.pages.dev` — the app's login screen should render.
2. Open `https://luna-crm.pages.dev/s/not-a-real-token` — you should get
   «Це посилання більше не діє», **not** a 404.

Step 2 is the one that matters. It is the only unproven assumption in the architecture:
`public/_redirects` tells Cloudflare to serve `[token].html` for any `/s/…` URL, and that rule
has never run anywhere but the emulator in `scripts/serve-link-surface.js` (spike `S-2` F-3).

**If you get a 404 instead:** the rewrite is not being applied. Confirm `dist/_redirects` exists
in what you uploaded. If it does and it still 404s, the fallback is `"output": "single"` in
`app.config.ts`, which needs no rewrite at all — at the cost of the server-rendered first paint
that `S-2` F-2 exists to protect. Tell me and I will make the change.

---

## Step 5 — Rebuild the iPhone app against dev

```bash
npm run ios
```

This compiles the current `.env` into the app. Your phone now talks to hosted Supabase over the
internet rather than your LAN — so it works on mobile data, away from the flat, which local
never did.

---

## Step 6 — The test that actually matters

The whole point of this environment. Do it with **wifi off**, on mobile data:

1. In the app: register, create a shoot, add a crew member **with an email address**.
2. Copy that crew member's link.
3. Send it to yourself in Telegram or Messages, and open it from there.

That is the first time the product has been used the way a crew member will actually meet it: a
link in a message, on a phone, with no app and no account. Everything before this has been
tested against a server on your desk.

Worth trying while you are there: the client link, and a reference image (which proves signed
Storage URLs work from a real host, not just locally).

---

## Warnings

**Do not run the acceptance suites against this project.** They create accounts, shoots and
uploads by the hundred — the local database is at 700+ accounts from exactly that. They are
hardcoded to localhost and should stay that way.

**A free Supabase project pauses after 7 days of no activity.** Un-pausing is one dashboard
click, but a link that worked last week can be dead today, and it looks like a bug in the app.

**Two rebuilds, not one, whenever `.env` changes.** `npm run export:web` + `wrangler pages
deploy` for the link surface, and `npm run ios` for the phone. Skipping one leaves them
disagreeing about which backend they talk to, which is a confusing failure.

**Going back to local:** `cp .env.local-backup .env`, then rebuild whichever surface you need.

---

## What this does not cover

- **A custom domain.** `*.pages.dev` is fine for dev; a real domain matters for trust when a
  stranger opens a link, not before.
- **Email confirmation, password reset, and what `site_url` should be.** All become real
  questions for production; all are deliberately switched off or ignored here.
- **Production.** This is a throwaway environment. Nothing here is a template for the real one —
  particularly not "publish everything in `dist/`" or "confirmation off".
