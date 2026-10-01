import type { ExpoConfig } from 'expo/config'

/**
 * Supabase config is NOT threaded through `extra` — the client reads
 * EXPO_PUBLIC_* directly, which is what Expo inlines at build time.
 */
const config: ExpoConfig = {
  name: 'Luna Shoots',
  slug: 'luna-crm',
  scheme: 'lunashoots',
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
    [
      'expo-image-picker',
      {
        /*
         * The iOS photo-library permission prompt (US-003's gallery picker).
         * Ukrainian per CLAUDE.md rule 4 — the system prompt is user-facing
         * copy, and the plugin's default is English.
         *
         * The wording is NOT from the specification: no story or prototype
         * covers permission copy. Placeholder; see docs/open-questions.md.
         */
        photosPermission: 'Luna потребує доступу до фото, щоб додати референс до зйомки.',
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
    bundleIdentifier: 'com.lunashoots.ios',
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
    buildNumber: '1',
    config: {
      // HTTPS only, which is exempt. Without this App Store Connect asks the
      // export-compliance question on every upload and holds the build.
      usesNonExemptEncryption: false,
    },
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
