import { Stack } from 'expo-router'
import { uk } from '../../src/i18n/uk'
import { navigationScreenOptions } from '../../src/theme/palette'

/**
 * ADR-017 — the same dark header as the app group.
 *
 * This group resolves no language at all: it is pre-session and Ukrainian by
 * construction (EP-05's scoping rule). The frame is the frame either way.
 *
 * The sentence above deliberately does not name the provider that (app) mounts.
 * us014-check asserts that exactly one _layout.tsx in app/ mentions it, and a
 * grep cannot tell a comment from a mount — naming it here, even to say it is
 * absent, failed that assertion.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, ...navigationScreenOptions }}>
      <Stack.Screen name="login" options={{ title: uk.loginTitle }} />
      <Stack.Screen name="register" options={{ title: uk.registerTitle }} />
    </Stack>
  )
}
