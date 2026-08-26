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
- **Never infer "invalid link" from a missing token.** Static export prerenders `/s/[token]`
  without one; deciding invalidity there ships the error page for every link
  (`docs/spikes/S-2-*.md` F-2). Resolve first, then decide.
- **Soft-delete filters are in the RLS policies**, so the app surface cannot forget them. The
  link gateway runs as service role and bypasses RLS — it must filter explicitly.
