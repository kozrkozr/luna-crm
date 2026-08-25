import { Stack } from 'expo-router'
import { uk } from '../../src/i18n/uk'

/** The creator's surface. Everything here requires a session (EP-01). */
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: uk.myShoots }} />
    </Stack>
  )
}
