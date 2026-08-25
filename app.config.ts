import type { ExpoConfig } from 'expo/config'

/**
 * Config as TypeScript so secrets come from the environment rather than being
 * committed. `.env` is gitignored; see README for the required keys.
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
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
}

export default config
