# Acceptance tests

One file per story, named for it: `us007-check.mjs` is US-007. Each one drives the **real product**
— it signs up a real account against a real Supabase, inserts real shoots, mints a real access link,
and then reads the result the way the audience the story is about would: through the app in a
browser, through the static link surface, or through the link gateway over HTTP. Nothing is mocked
and no function is unit-tested; the assertions are the story's acceptance criteria, quoted in the
label, so a failure names the AC that broke.

That is also their limitation. They are slow, they need the whole stack running, and they say
nothing about code that is not on a path some story describes.

> **These suites only ever run against a local Supabase.**
> Every run signs up dozens of accounts, creates shoots, uploads images and video, and cleans up
> **nothing**. `env.mjs` refuses to start if `SB_URL` is not localhost or a private LAN address —
> do not work around that check. A hosted project would be filled with junk within a few runs.

## What has to be running

**Node 22** — `nvm use 22`. Same reason as the app (see the root README).

Browser-driving suites need four processes, each in its own terminal:

```bash
npx supabase start                                          # Postgres, Auth, Storage
npx supabase functions serve link-gateway --no-verify-jwt   # the link gateway (ADR-013)
npm run export:web && npm run serve:link                    # the static link surface, on :8099
npx expo start --web --port 8098                            # the creator's app, on :8098
```

Re-run `npm run export:web` after any change to the link views: `serve:link` serves `dist/`, not the
dev server, and a stale export is the single most common cause of a suite failing on code that is
actually correct.

Six suites need no browser at all:

| Suite | Needs |
|---|---|
| `softdelete-fn` `us003-check` `us005-media` `us009-db` `us018-media` | Supabase only |
| `us006-gateway` | Supabase + `functions serve link-gateway` |

Everything else needs all four.

## Running them

```bash
npm run test:acceptance                       # all 27, against their baselines
bash tests/acceptance/run-all.sh us009-db us006-gateway   # only these
node tests/acceptance/us007-check.mjs         # one file, full PASS/FAIL output
```

`run-all.sh` prints one line: total assertions, failures, and how many suites are **off-baseline**.
The baseline is the assertion count each suite is known to make. A suite that reports fewer PASSes
than its baseline has lost assertions — an early `throw`, a seed that stopped seeding — which a
plain "no failures" check would happily call green. When a suite legitimately gains or loses an
assertion, update its number in the `SUITES` line.

A single file prints `PASS` / `FAIL` per assertion, with the observed value on the failing ones.
That is the form to use while fixing something.

## Configuration

`env.mjs` resolves everything, and every suite imports it:

| Variable | Default |
|---|---|
| `SB_URL` | `EXPO_PUBLIC_SUPABASE_URL` from the repo's `.env` |
| `SB_ANON` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the repo's `.env` |
| `SB_KEY` | the service-role key from `supabase status -o env`, or the running edge-runtime container |
| `APP_URL` | `http://localhost:8098` |
| `SITE_URL` | `http://localhost:8099` |
| `CHROME` | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |

Anything already exported in the shell wins. Reading the URL and anon key from the app's own `.env`
is deliberate: it makes it impossible for a suite to test a different backend than the one the app
under test was built against. The service-role key is not there because `EXPO_PUBLIC_*` values ship
inside the bundle.

If the stack is not running, the suites say so and stop; they do not produce a stack trace.

## Notes for anyone editing these

- **Never sleep.** `cdp.mjs` explains why at length: every route is server-rendered, so an element
  exists in the HTML long before React hydrates it, and typing into an unhydrated input is silently
  discarded. `navigate` waits for hydration; `waitFor`, `waitForText` and `settle` poll for a
  condition. A fixed `sleep` in a suite is a future flake.
- **Soft-delete states go through the RPCs** — `soft_delete_shoot` and `soft_remove_crew_member`,
  called by the account that owns the row, exactly as the app calls them. A direct
  `update … set removed_at` is refused by RLS, which is the whole reason those functions exist.
  Two `psql` calls survive in `us008-check` and `us022-check` and say in a comment why: one reads a
  removed row that by design no API will return, the other reads catalogue metadata about a
  column-level grant.
- **`ws` comes from the dependency tree**, not from a declared devDependency — `cdp.mjs` imports it
`ws` is a declared devDependency, pinned to 7.5.13 to match the version Expo's own
dev middleware resolves — installing a newer one hoists it over that and rewrites 118 lines of
lockfile for no gain.
  `devDependencies` rather than reaching back into a path.
- **Ports are unique per suite.** `openBrowser({ port })` — two suites sharing a debugging port will
  attach to each other's browser.
