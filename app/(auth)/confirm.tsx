import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Text } from '../../src/components/ui/text'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { useLinkSession } from '../../src/features/auth/authLink'
import { Starfield } from '../../src/components/Starfield'

/**
 * Where the signup confirmation email lands — `lunashoots://confirm`
 * (`ADR-019`, `US-001` AC-1 and AC-4).
 *
 * Opening the link confirms the address and yields a session, so a valid link
 * goes straight to the (empty) shoot list, as AC-1 ends. An expired or used one
 * says so and sends the reader to log in, where AC-3 offers a new email.
 *
 * Reading the link is `useLinkSession`, shared with `(auth)/reset`.
 */
export default function ConfirmEmailScreen() {
  const t = useStrings()
  const router = useRouter()
  const state = useLinkSession('email')

  useEffect(() => {
    if (state === 'ok') router.replace('/(app)/(tabs)')
  }, [state, router])

  if (state !== 'invalid') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Starfield />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <View className="gap-2 p-4 pt-16">
        <Text className="text-body-sm text-destructive leading-5">{t.confirmLinkInvalid}</Text>
        <Button size="cta" className="mt-5" onPress={() => router.replace('/(auth)/login')}>
          <Text className="text-subtitle font-semibold">{t.returnToLogin}</Text>
        </Button>
      </View>
    </View>
  )
}
