import { Link, Stack } from 'expo-router'
import { Button } from 'tamagui'
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
              <Button size="$2" chromeless accessibilityLabel={uk.profileTitle}>
                👤
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
    </Stack>
    </RequireSession>
  )
}
