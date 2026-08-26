import { Link, Stack } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'
import { RequireSession } from '../../src/features/auth/RequireSession'

/**
 * The creator's surface. Everything here requires a session (EP-01), enforced
 * once for the whole group by RequireSession (US-017 AC-2) so that screens
 * added by later stories are guarded by default.
 */
export default function AppLayout() {
  return (
    <RequireSession>
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: uk.myShoots,
          // US-016 AC-2 requires the profile to be *reachable*. The prototype
          // reaches it from a person icon in the account header.
          headerRight: () => (
            <Link href="/(app)/profile" asChild>
              <Button variant="ghost" size="sm" accessibilityLabel={uk.profileTitle}>
                <Text>👤</Text>
              </Button>
            </Link>
          ),
        }}
      />
      <Stack.Screen
        name="new-shoot"
        options={{ title: uk.newShootTitle, headerLargeTitle: false, presentation: 'modal' }}
      />
      <Stack.Screen name="profile" options={{ title: uk.profileTitle }} />
      {/*
        Title comes from the screen itself once the shoot is loaded — the client
        name is not known until then, and a placeholder would flash.
      */}
      <Stack.Screen name="shoot/[id]/index" options={{ headerLargeTitle: false }} />
      <Stack.Screen
        name="shoot/[id]/edit"
        options={{ title: uk.editShootTitle, headerLargeTitle: false }}
      />
      <Stack.Screen
        name="shoot/[id]/references"
        options={{ title: uk.allReferencesTitle, headerLargeTitle: false }}
      />
      <Stack.Screen
        name="shoot/[id]/crew/add"
        options={{ title: uk.addCrewTitle, headerLargeTitle: false }}
      />
    </Stack>
    </RequireSession>
  )
}
