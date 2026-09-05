import { useCallback, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useFocusEffect } from 'expo-router'
import { PublicProfile, type PublicProfileView } from '../../src/features/contacts/PublicProfile'
import { Text } from '../../src/components/ui/text'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { signedAvatarUrl } from '../../src/features/auth/profile'
import { useProfile } from '../../src/features/auth/useProfile'
import { Starfield } from '../../src/components/Starfield'

/**
 * «Так вас бачать інші учасники зйомок» — the account holder previewing their
 * own public profile, from the profile screen's «Переглянути публічний профіль».
 *
 * That control was drawn and inert from 2026-09-02, when the owner asked for
 * the unbuilt links to ship as stubs. This is the screen it was waiting for.
 *
 * **A sibling route, not `profile/public`.** `app/(app)/profile.tsx` already
 * owns `/profile`, and a `profile/` directory beside it is the one arrangement
 * Expo Router resolves ambiguously.
 *
 * **`users.email` is deliberately passed.** This is the one reader who is also
 * the subject, so showing their own login discloses nothing — and the note under
 * the card says others do not see it. `PublicProfile` drops the row for a
 * contact.
 */
export default function PublicProfileScreen() {
  const t = useStrings()
  const state = useProfile()
  const [avatarUri, setAvatarUri] = useState<string | null>(null)

  const path = state.status === 'loaded' ? state.profile.avatarUrl : null
  useFocusEffect(
    useCallback(() => {
      if (!path) return
      let active = true
      void (async () => {
        const signed = await signedAvatarUrl(path)
        if (active) setAvatarUri(signed)
      })()
      return () => {
        active = false
      }
    }, [path])
  )

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 items-center justify-center p-4">
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const view: PublicProfileView = {
    name: state.profile.name,
    role: state.profile.role,
    phone: state.profile.phone,
    email: state.profile.email,
    instagram: state.profile.socialHandle,
    telegram: state.profile.telegram,
    avatarUri,
    note: null,
    kind: 'self',
    backLabel: t.profileTitle,
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PublicProfile view={view} />
    </>
  )
}
