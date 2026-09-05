# Luna CRM

A CRM where a solo photographer keeps one record per shoot and shares it by link with crew and
clients who have **no account and no app installed**.

The specification is in [`docs/product/`](docs/product/) — a frozen, **read-only** snapshot.
Start with `HANDOFF.md`, then `backlog-order.md`. Build rules are in [`CLAUDE.md`](CLAUDE.md).

**Node 22+ is required** (`engines` in package.json). `@supabase/supabase-js` constructs a
Realtime client that needs a global `WebSocket`, which Node 20 lacks — on Node 20 both
`expo export -p web` and `expo start --web` fail with *"Node.js 20 detected without native
WebSocket support"*. Native bundling is unaffected, so the failure only shows up on the web
target. `nvm use 22`.

## Setup

```bash
npm install
cp .env.example .env          # fill in from your Supabase project settings
npx expo run:ios --device     # first build; needs Xcode + CocoaPods
npm start                     # thereafter — JS changes hot-reload
```

### Running the link surface

Two of three user flows are anonymous link views, and they are **not** the app —
they are the static export, served by Cloudflare Pages in production (`ADR-012`).
To exercise them locally, in three terminals:

```bash
npx supabase start                                    # Postgres, Auth, Storage
npx supabase functions serve link-gateway --no-verify-jwt   # ADR-013's gateway
npm run export:web && npm run serve:link              # the link surface, on :8099
```

`npm run serve:link` is not a plain static server, and a plain one will not do:
the export emits dynamic routes as literal `s/[token].html` files, so `/s/<token>`
is a 404 until the host rewrites it. The script reads `public/_redirects` and
applies the rules in order, which is what Pages does — see `S-2` F-3, still
unverified against a real deployment.

`EXPO_PUBLIC_LINK_BASE_URL` must point at wherever that surface is reachable, or
the links the app copies will not open. On a phone that means the LAN address,
not `localhost`.

Schema lives as migration files in git (Supabase Free has zero backup retention —
`architecture.md`, Stage 1):

```bash
npm run db:push               # apply migrations
npm run db:types              # regenerate src/lib/supabase/database.types.ts
```

## Layout

| Path | What |
|---|---|
| `app/(app)/` | The creator's surface — requires an account |
| `app/s/[token].tsx` | The anonymous link surface: no account, no install, plain `/s/{token}` URLs |
| `src/features/` | Story-shaped modules: `shoots/`, `crew/`, `references/`, `auth/` |
| `src/theme/` | Theme config — NativeWind/Tailwind (`ADR-016`). **The only place a colour value may appear.** |
| `src/i18n/` | Ukrainian copy (default) and English |
| `src/lib/supabase/` | Client + generated types. App surface only |
| `supabase/migrations/` | Schema, in git |
| `supabase/functions/link-gateway/` | Resolves a token, shapes the payload per audience (`ADR-013`) |
| `docs/spikes/` | S-1 / S-2 findings — **read these before changing the stack or the link routes** |

`app/` is Expo Router: folders are URLs. `app/s/[token].tsx` produces `/s/{token}`, the URL
`architecture.md` commits to — renaming it changes a link crew members already hold.

## Things that will bite you

- **`npx expo install`, never plain `npm install`, for anything with native code.** It uses
  Expo's pinned versions for the SDK. A plain install put the wrong `react-native-worklets` in
  and the failure only surfaced at the native compile step — the web export and Metro bundle
  both succeeded with a broken native tree (`docs/spikes/S-1-*.md` F-7).
- **Duplicate copies of a context-carrying package break it silently, and only on a device.**
  Any UI package that pairs a provider with a consumer through React context has this trap: if
  npm nests a second copy, the two hold different contexts and the consumer throws at runtime.
  Web usually survives it — the DOM offers implicit hosts a native tree does not — so it passes
  every browser check and fails only on a device. The concrete instance was Tamagui's portal
  (npm nested **eight** copies of `@tamagui/portal`; the role picker threw
  «'PortalDispatchContext' cannot be null»), recorded in `docs/spikes/S-1-*.md`. The library
  changed with `ADR-016`; the trap did not. `npm ls <pkg>` and a `find` for nested copies is the
  diagnostic, an `overrides` entry is the fix, and **UI is verified on a device or simulator, not
  only in a browser**.
- **Import icons one file at a time, never from the `lucide-react-native` barrel.** Expo's Metro
  does not tree-shake, so `import { Check } from 'lucide-react-native'` ships all ~2,000 icon
  components — it doubled the web bundle to 4.4 MB. Use
  `import Check from 'lucide-react-native/icons/check'`. That bundle serves the anonymous link
  views, where `docs/spikes/S-2-*.md` F-2 showed slow JS costs correctness, not just patience.
- **A style one field sets can appear on another that never asked for it.** React Native reuses
  native views between screens, and a prop a component does not mention is not guaranteed to be
  reset when a view is recycled — so a `TextInput` that says nothing about `letterSpacing`
  inherits whatever the last tenant set. The concrete instance: «Зміна пароля» sets
  `letterSpacing: 2` on its masked field, and the registration form then drew «Вкажіть свою роль»
  and Telegram's «@username» with 2pt of tracking while Instagram — the same component, identical
  props — rendered correctly. **Web cannot reproduce it** (no view recycling), and identical
  siblings disagreeing is the signature. The fix is to state the value rather than omit it:
  `ui/input.tsx` and `ui/textarea.tsx` now set `letterSpacing: 0` so there is no absence to fill.
  Anything setting an unusual text style should assume the same about its neighbours.
- **`automaticallyAdjustKeyboardInsets` makes room; it does not scroll.** The two halves of
  keyboard avoidance are separate, and only the first is a prop. A single-line field survives on
  the prop alone because UIKit brings a `UITextField` above the keyboard itself — a `Textarea` is
  a `UITextView`, which scrolls its own caret *inside itself* and never asks the scroll view
  around it to move. So «Нотатки» stayed covered on every form while the fields above it worked.
  `src/components/ui/form-scroll-view.tsx` owns both halves: it sets `contentInset` itself rather
  than letting iOS do it on its own schedule (a scroll cannot move into range that does not exist
  yet — `scrollTo` is silently clamped and nothing appears to happen), and it measures the field
  against the keyboard's real frame to scroll the difference. **The web cannot reproduce any of
  this**, so it is verified in a simulator with timestamps or not at all.
- **Never infer "invalid link" from a missing token.** Static export prerenders `/s/[token]`
  without one; deciding invalidity there ships the error page for every link
  (`docs/spikes/S-2-*.md` F-2). Resolve first, then decide.
- **Soft-delete filters are in the RLS policies**, so the app surface cannot forget them. The
  link gateway runs as service role and bypasses RLS — it must filter explicitly.
- **Soft-deleting cannot be done with a plain UPDATE.** Both cases are solved and both go
  through a `security definer` function — `soft_delete_shoot` and `soft_remove_crew_member`.
  Anything else that soft-deletes will hit the same wall. `update shoots set deleted_at = ...` fails with *"new row violates
  row-level security policy"*, and so does `removed_at` on `crew_members`. The cause is not the
  UPDATE policy — adding a `with check` to it changes nothing. Postgres applies the **SELECT**
  policy to the *new* row, and that policy says `deleted_at is null`, so the row fails its own
  read policy the instant you mark it deleted. Verified in SQL, 2026-08-26: relax the SELECT
  policy and the same update succeeds.

  Do **not** fix this by dropping the liveness filter from the SELECT policy — that is exactly
  the bug class rule 3 exists to prevent. The path that keeps the guarantee is a
  `security definer` function that checks ownership itself and performs the update outside RLS.
  Note what those functions' WHERE clauses are doing: outside RLS they are the
  **authorisation**, not a filter. Drop a condition from one and it will happily act on someone
  else's data.
