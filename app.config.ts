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
  plugins: ['expo-router'],
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
