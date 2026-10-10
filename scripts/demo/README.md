# App Store screenshots

Every main screen of the app, both languages, at the App Store's 6.9" size (1320×2868), from the
iPhone 17 Pro Max simulator against the **local** database. 2026-10-10.

1. `npx supabase start`, then the demo accounts:
   `node scripts/demo/seed.mjs <folder with ref-*.jpg>` — `demo-uk@lunashoots.test` /
   `demo-en@lunashoots.test`, password `lunademo123`.
2. `.env.local` — the local URL and anon key, and **`EXPO_PUBLIC_REVENUECAT_IOS_KEY=` empty**:
   Expo otherwise falls back to `.env`'s Test Store key, which a Release build refuses with a
   "Wrong API Key" alert and closes the app.
3. Build: `node scripts/variant.mjs local --prebuild npx expo run:ios --device <simulator id> --configuration Release`
4. A clean status bar: `xcrun simctl status_bar <id> override --time "9:41" --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi`
5. [Maestro](https://maestro.mobile.dev) (needs Java 17):
   `maestro --device <id> test -e EMAIL=demo-en@lunashoots.test -e EXPECT=".*Maria Lewis.*" flows/login.yaml`,
   then `flows/shots-en.yaml`. For Ukrainian: sign out in the app, then the same with
   `demo-uk@…`, `".*Марія Литвин.*"` and `flows/shots-uk.yaml`. Screenshots land in
   `~/.maestro/tests/<run>/…/takeScreenshot/`.
6. The crew link view: an `access_links` row for a crew member, `npm run export:web` (local),
   `npm run serve:link`, `npx supabase functions serve`, and open `http://127.0.0.1:8099/s/<token>`
   in the simulator's Safari.
