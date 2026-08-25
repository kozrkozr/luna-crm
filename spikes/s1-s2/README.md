# Spike S-1 / S-2 — throwaway

Not the app. This exists to answer two questions from `docs/product/risks.md` before any story
is built, per `docs/product/backlog-order.md`.

- **S-1** — can Tamagui reach the "authentic Apple look" bar? → `docs/spikes/S-1-tamagui-fidelity.md`
- **S-2** — does one codebase export the link views to static web? → `docs/spikes/S-2-static-export.md`

**Read the reports, not this code.** A spike's output is a decision. The screens here have no
backend, no writes, and hardcoded fixtures tagged «(демо)»; they get deleted when foundation
starts. What carries forward is listed at the bottom of each report.

Kept deliberately outside the repo root so it cannot quietly become the foundation.

On **Expo SDK 57**. Expo Go cannot run it (the App Store build is three majors behind, and a
transitive reanimated dep needs RN ≥ 0.83) — use a device build. See S-1's finding F-6.

## Run it

```bash
npm install

npx expo run:ios --device  # S-1: builds onto a connected iPhone (needs Xcode + CocoaPods)
npx expo export -p web   # S-2: static export into dist/
npm run typecheck
```

Free provisioning covers your own device — no Apple Developer Program. Signing expires after
7 days; re-run to renew.

## Layout

| Path | What |
|---|---|
| `app/index.tsx` | Мої зйомки — shoot list + calendar (`US-004`), both states |
| `app/shoot/[id].tsx` | Creator's shoot detail, read-only |
| `app/s/[token].tsx` | Crew link view (`US-007`/`008`/`023`) — S-2's target, and where S-2's F-2 finding lives |
| `app/crew/add.tsx` | Додати учасника команди (`US-005`) — the form screen where R-1 is actually decided |
| `tamagui.config.ts` | Stock default theme + the RN animation driver swap — carries forward |
| `src/i18n/uk.ts` | Ukrainian copy, verbatim from the prototype — carries forward |
| `src/demo/data.ts` | Fixtures. Throwaway |
| `public/_redirects` | Cloudflare Pages rewrite for `/s/*`, unverified against a live deploy |

Screens use **stock Tamagui components and the default theme**. The prototype
(`docs/product/prototype/index.html`) is the source for **UX only** — what each screen contains
and where it sits — plus its Ukrainian copy. Re-theming to the prototype's palette is a separate
task; the seam is `tamagui.config.ts`, because no screen hardcodes a colour.
