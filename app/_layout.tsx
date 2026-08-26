import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme } from 'tamagui'
import config from '../src/theme/tamagui.config'

/**
 * Root shell for both surfaces.
 *
 * `(app)`  — the creator's screens, behind an account (Supabase Auth + RLS).
 * `(auth)` — register / log in.
 * `s/`     — the anonymous link surface: no account, no install, reached at a
 *            plain /s/{token} URL and served as static web (ADR-012).
 *
 * The grouping is not cosmetic. S-2 found that a naive web export publishes the
 * creator's screens to the public link host; the route groups are how the Pages
 * build ships `s/` only.
 */
export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      {/*
        No explicit PortalProvider here: TamaguiProvider already mounts one, and
        adding a second warns about a nested root host. The «'PortalDispatchContext'
        cannot be null» crash on US-001's role picker was caused solely by npm
        nesting eight copies of @tamagui/portal, so the provider and the Sheet
        held different React contexts. See the overrides entry in package.json.
      */}
      <Theme name="light">
        <StatusBar style="dark" />
        {/*
          headerShown: false — the route groups `(app)` and `(auth)` are
          organisational, not screens. Left on, the root stack renders a header
          titled with the literal group name, so registration showed
          «(auth) Реєстрація». Each group's own layout owns its header.
        */}
        <Stack screenOptions={{ headerShown: false }} />
      </Theme>
    </TamaguiProvider>
  )
}
