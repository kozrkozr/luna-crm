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
 * **`users.email` is deliberately NOT passed** (owner, 2026-09-05). It used to
 * be, on the argument that this reader is also the subject and so discloses
 * nothing to themselves. But the screen says «Так вас бачать інші учасники
 * зйомок», and a preview carrying a field the audience never receives is not a
 * preview. The email lives on `/profile`, which is about the account rather
 * than about what others see; the note under the card here explains its
 * absence, which is what the artboard wrote it for.
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
