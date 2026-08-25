import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { TamaguiProvider, Theme } from 'tamagui'
import config from '../tamagui.config'
import { uk } from '../src/i18n/uk'

/**
 * Navigation chrome is Expo Router's *native* stack — a real UINavigationBar on
 * iOS — with Tamagui rendering only inside the screen body. Header colours are
 * left at platform defaults so the nav bar is genuinely native, not a themed
 * imitation of one.
 */
export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <Theme name="light">
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerLargeTitle: true }}>
          <Stack.Screen name="index" options={{ title: uk.myShoots }} />
          <Stack.Screen
            name="shoot/[id]"
            options={{ title: uk.shootFor, headerLargeTitle: false }}
          />
          <Stack.Screen
            name="crew/add"
            options={{ title: uk.addCrewTitle, headerLargeTitle: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="s/[token]"
            options={{ title: uk.shootFor, headerLargeTitle: false }}
          />
        </Stack>
      </Theme>
    </TamaguiProvider>
  )
}
