import { Link, Stack } from 'expo-router'
import { Button } from 'tamagui'
import { uk } from '../../src/i18n/uk'

/** The creator's surface. Everything here requires a session (EP-01). */
export default function AppLayout() {
  return (
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
      <Stack.Screen name="profile" options={{ title: uk.profileTitle }} />
    </Stack>
  )
}
