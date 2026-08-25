import { Stack } from 'expo-router'
import { uk } from '../../src/i18n/uk'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="login" options={{ title: uk.loginTitle }} />
      <Stack.Screen name="register" options={{ title: uk.registerTitle }} />
    </Stack>
  )
}
