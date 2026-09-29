import { Stack } from 'expo-router'
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
    /*
      No header. ADR-017's auth mockup opens with its own intro block — logo,
      product name, tagline — and a native title bar above it would state the
      screen's name twice, once in a chrome the design does not have. The
      segmented control inside the screen is what names the two modes now.
    */
    <Stack screenOptions={{ headerShown: false, ...navigationScreenOptions }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      {/* Where the password-recovery email lands (`lunashoots://reset`). Headerless
          like its siblings — it draws its own heading. */}
      <Stack.Screen name="reset" />
      {/* Where the signup confirmation email lands (`lunashoots://confirm`,
          ADR-019). Headerless for the same reason. */}
      <Stack.Screen name="confirm" />
    </Stack>
  )
}
