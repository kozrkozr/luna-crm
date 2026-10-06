import { Stack } from 'expo-router'
import { navigationScreenOptions } from '../../src/theme/palette'
import { PhoneLanguageProvider } from '../../src/i18n/LanguageProvider'

/**
 * ADR-017 — the same dark header as the app group.
 *
 * `US-045` AC-2 — signed out, every screen here is in the phone's language,
 * with no switcher: there is no account yet to save a choice to. This used to
 * resolve no language at all and be Ukrainian by construction (`US-014`);
 * `ADR-022` changed that for anyone whose phone is not Ukrainian.
 */
export default function AuthLayout() {
  return (
    <PhoneLanguageProvider>
      {/*
        No header. ADR-017's auth mockup opens with its own intro block — logo,
        product name, tagline — and a native title bar above it would state the
        screen's name twice, once in a chrome the design does not have. The
        segmented control inside the screen is what names the two modes now.
      */}
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
    </PhoneLanguageProvider>
  )
}
