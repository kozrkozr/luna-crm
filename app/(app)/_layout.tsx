import { View } from 'react-native'
import { Link, Stack } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Text } from '../../src/components/ui/text'
import { LanguageProvider, useStrings } from '../../src/i18n/LanguageProvider'
import { RequireSession } from '../../src/features/auth/RequireSession'
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher'

/**
 * The creator's surface. Everything here requires a session (EP-01), enforced
 * once for the whole group by RequireSession (US-017 AC-2) so that screens
 * added by later stories are guarded by default.
 */
export default function AppLayout() {
  return (
    <RequireSession>
      {/*
        US-014 — the language provider wraps this group and only this group.
        `(auth)` and `s/` sit outside it, so a screen with no account behind it
        has no language to resolve and stays Ukrainian by construction rather
        than by remembering to.

        Inside RequireSession, because the preference is read from the signed-in
        user's row: there is nothing to resolve until there is a session.
      */}
      <LanguageProvider>
        <AppStack />
      </LanguageProvider>
    </RequireSession>
  )
}

/**
 * Separate from `AppLayout` because a component cannot consume a context it
 * renders itself — the titles below need the provider that AppLayout mounts.
 */
function AppStack() {
  const t = useStrings()
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: t.myShoots,
          // US-016 AC-2 requires the profile to be *reachable*. The prototype
          // reaches it from a person icon in the account header.
          // US-015 — the UA/EN toggle sits beside the profile icon, as in the
          // prototype's account header.
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <LanguageSwitcher />
              <Link href="/(app)/profile" asChild>
                <Button variant="ghost" size="sm" accessibilityLabel={t.profileTitle}>
                  <Text>👤</Text>
                </Button>
              </Link>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="new-shoot"
        options={{ title: t.newShootTitle, headerLargeTitle: false, presentation: 'modal' }}
      />
      <Stack.Screen name="profile" options={{ title: t.profileTitle }} />
      {/*
        Title comes from the screen itself once the shoot is loaded — the client
        name is not known until then, and a placeholder would flash.
      */}
      <Stack.Screen name="shoot/[id]/index" options={{ headerLargeTitle: false }} />
      <Stack.Screen
        name="shoot/[id]/edit"
        options={{ title: t.editShootTitle, headerLargeTitle: false }}
      />
      <Stack.Screen
        name="shoot/[id]/references"
        options={{ title: t.allReferencesTitle, headerLargeTitle: false }}
      />
      <Stack.Screen
        name="shoot/[id]/crew/add"
        options={{ title: t.addCrewTitle, headerLargeTitle: false }}
      />
    </Stack>
  )
}
