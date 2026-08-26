import type { ExpoConfig } from 'expo/config'

/**
 * Supabase config is NOT threaded through `extra` — the client reads
 * EXPO_PUBLIC_* directly, which is what Expo inlines at build time.
 */
const config: ExpoConfig = {
  name: 'Luna CRM',
  slug: 'luna-crm',
  scheme: 'lunacrm',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  plugins: [
    'expo-router',
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
  ],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'dev.luna.crm',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
}

export default config
