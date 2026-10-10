/// <reference types="node" />
// This file runs in Node (Expo CLI), never in the app, and reads `.env.prod` below. The
// reference makes Node's types visible to the whole typecheck, not only here; `tsc` passes with it.
import type { ExpoConfig } from 'expo/config'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Supabase config is NOT threaded through `extra` — the client reads
 * EXPO_PUBLIC_* directly, which is what Expo inlines at build time.
 */

/*
 * App variants (2026-10-04). `production` is the App Store / TestFlight app;
 * `development` is a separate app — its own bundle id, name and URL scheme — so
 * a dev build installs BESIDE the TestFlight beta instead of replacing it.
 *
 * Unset means development, on purpose: a forgotten variable yields an app that
 * cannot overwrite the beta and cannot be uploaded (App Store Connect knows no
 * `.dev` bundle id). Set it through `scripts/variant.mjs`, which also loads the
 * matching `.env.<target>` — see the `ios*` and `deploy:web*` scripts.
 */
const VARIANT = process.env.APP_VARIANT === 'production' ? 'production' : 'development'
const IS_PROD = VARIANT === 'production'

/*
 * A production build must be built against production. `.env.prod` is the
 * reference; where it does not exist (a fresh clone, CI) there is nothing to
 * compare with and the check stands aside.
 */
if (IS_PROD) {
  const prodFile = join(__dirname, '.env.prod')
  const expected = existsSync(prodFile)
    ? readFileSync(prodFile, 'utf8').match(/^EXPO_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim()
    : undefined
  const actual = process.env.EXPO_PUBLIC_SUPABASE_URL
  // `scripts/variant.mjs store-sandbox` and `local-shots` build Luna Shoots
  // against dev or local on purpose — the Apple sandbox purchase and the App
  // Store screenshots — and say so; nothing else may.
  const deliberate = process.env.LUNA_NONPROD_BACKEND === '1'
  if (expected && actual !== expected && !deliberate) {
    throw new Error(
      `APP_VARIANT=production but EXPO_PUBLIC_SUPABASE_URL is ${actual ?? '(unset)'}, ` +
        `not ${expected} from .env.prod. Build through scripts/variant.mjs prod.`
    )
  }
}

const config: ExpoConfig = {
  name: IS_PROD ? 'Luna Shoots' : 'Luna Dev',
  slug: 'luna-crm',
  /*
   * Distinct per variant: two installed apps claiming one scheme leaves iOS to
   * pick either. The auth emails land on `<scheme>://reset|confirm`
   * (src/features/auth/authLink.ts), so the dev Supabase project must
   * allow-list `lunashoots-dev://reset` and `lunashoots-dev://confirm`.
   */
  scheme: IS_PROD ? 'lunashoots' : 'lunashoots-dev',
  // What a person sees on the store page. `ios.buildNumber` is what App Store
  // Connect checks for uniqueness.
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  /*
   * Dark, matching the app (2026-08-29). This governs the NATIVE surfaces
   * NativeWind cannot reach — the keyboard, `DateTimePicker`, `Alert.alert`,
   * the text-selection handles — and while it said `light` every one of them
   * came up bright against a dark app. The keyboard flashing white on each
   * focus was the visible symptom; the date picker drawing dark text on a dark
   * sheet was the invisible one.
   *
   * Changing this needs a native rebuild — it is a plist value, not JavaScript.
   */
  userInterfaceStyle: 'dark',
  plugins: [
    'expo-router',
    /*
     * Works around a React Native 0.86.2 bug that makes a Debug build link
     * against the RELEASE prebuilt core and fail with undefined C++ symbols.
     * See plugins/withPrebuiltArtifactMarker.js — the whole diagnosis is there,
     * because the error names libraries that have nothing to do with the cause.
     */
    './plugins/withPrebuiltArtifactMarker',
    // Bakes APP_VARIANT and EXPO_PUBLIC_* into ios/.xcode.env, so an Xcode
    // archive bundles against the variant it was prebuilt for — not whatever
    // `.env` says on the day.
    './plugins/withVariantEnv',
    // US-041's reminders are local notifications; strips the push
    // entitlement expo-notifications adds, which the wildcard dev profile
    // cannot sign. See the plugin before removing it.
    './plugins/withoutPushEntitlement',
    [
      'expo-image-picker',
      {
        /*
         * The iOS photo-library permission prompt (US-003's gallery picker).
         *
         * `US-050` — this is only the build's fallback, written into
         * Info.plist itself. What a phone shows comes from `locales` below:
         * iOS picks the Ukrainian or the English text by the phone's language.
         * English here, because English is the development region — the
         * language iOS falls back to for a phone in neither.
         */
        photosPermission: 'Luna Shoots needs access to your photos to add a reference to a shoot.',
        // No camera in US-003 — the story says "picks an image from their
        // phone", i.e. the library. Disabled so the build does not request a
        // permission nothing uses.
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    /*
     * The launch screen (2026-09-21). There was no splash configuration at all
     * before this: `expo-splash-screen` was not installed and no `splash` key
     * existed, so prebuild emitted a storyboard with a background and no
     * image, and the app launched on a blank dark screen.
     *
     * **`#000000`, not `BACKGROUND` (#070708).** The artwork is a full-bleed
     * square whose own ground is pure black, so on the theme's near-black it
     * would show its edges as a visible rectangle. Matching the artwork hides
     * the square completely; the 3% step to the app's first frame is
     * imperceptible, and a seam would not be. If the artwork is ever replaced
     * with one on transparency, this should become `BACKGROUND` instead.
     *
     * No `dark:` variant, because there is nothing for it to vary with: the
     * app declares ONE theme (see `app/_layout.tsx`) and `userInterfaceStyle`
     * above pins the native surfaces to dark.
     */
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
    ],
  ],
  ios: {
    supportsTablet: false,
    /*
     * `.ios`, not `.app` (owner, 2026-10-01). `com.lunashoots.app` was taken
     * before the first upload — by the owner's own free personal team, which
     * Xcode's automatic signing registered it under during a device build. A
     * free team cannot delete an App ID, so the paid team could not have it.
     * Build locally with the PAID team selected, or Xcode registers whatever
     * this says under the personal one again.
     */
    bundleIdentifier: IS_PROD ? 'com.lunashoots.ios' : 'com.lunashoots.ios.dev',
    /*
     * The PAID team (Apple Developer Program, Individual, 2026-09-30). Pinned
     * so prebuild writes it into the Xcode project and automatic signing can
     * never fall back to the free personal team (`488YTLFQJ3`) — which is how
     * `com.lunashoots.app` was lost.
     */
    appleTeamId: 'Z2XN964VS5',
    /*
     * Increment on EVERY upload, including one of the same `version`: App Store
     * Connect rejects a duplicate build number outright
     * (docs/release-appstore.md 1.6).
     */
    buildNumber: '2',
    config: {
      // HTTPS only, which is exempt. Without this App Store Connect asks the
      // export-compliance question on every upload and holds the build.
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      /*
       * `US-050` AC-3 — the app's languages, declared to iOS: this is what
       * puts a per-app language in iOS Settings and both languages on the
       * App Store page. `locales` below writes the files; Expo does not
       * declare the list itself.
       *
       * English is the development region — the fallback for a phone in
       * neither language. **A phone in Russian gets English here**, while the
       * app's own text is Ukrainian (`US-045`): iOS matches its own list of
       * languages, and adding a Russian one is ruled out (CLAUDE.md rule 4).
       */
      CFBundleDevelopmentRegion: 'en',
      CFBundleLocalizations: ['en', 'uk'],
    },
  },
  /*
   * `US-050` — iOS's own texts (permission prompts) per language, written
   * into `<lang>.lproj/InfoPlist.strings` at prebuild. iOS chooses by the
   * phone's language, never by the account's (AC-2). Every system text the
   * app adds goes into both files (AC-4).
   */
  locales: {
    en: './locales/ios-en.json',
    uk: './locales/ios-uk.json',
  },
  /*
   * Android is not a target (CLAUDE.md: iOS first), but `expo prebuild`
   * generates both platforms and refuses to run without this. It was the iOS
   * identifier until iOS had to move to `.ios`; nothing claims it on Android,
   * so it stays rather than churn for a platform that is not built.
   */
  android: {
    package: 'com.lunashoots.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
}

export default config
