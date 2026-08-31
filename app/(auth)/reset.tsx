import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'
import { failed, succeeded } from '../../src/lib/haptics'
import { MIN_PASSWORD_LENGTH } from '../../src/features/auth/register'
import { establishRecoverySession, setNewPassword } from '../../src/features/auth/passwordReset'

/**
 * Where the recovery email lands — `lunacrm://reset` on a device, `/reset` on
 * the web export (`resetRedirectUrl`).
 *
 * `Auth.dc.html` draws the request and the confirmation but **not this screen**,
 * which is the one that actually changes anything. Built because the flow is
 * unreachable without it; its copy is new and no story covers it.
 *
 * ── Reading the link ────────────────────────────────────────────────────────
 *
 * The client sets `detectSessionInUrl: false` (src/lib/supabase/client.ts), so
 * nothing parses the link for us — right on native, where there is no URL to
 * parse, and it means the tokens are read here.
 *
 * Supabase puts them in the **fragment** for the implicit flow
 * (`#access_token=…&refresh_token=…`) and in the **query** for PKCE
 * (`?token_hash=…`). Expo Router only surfaces the query, so the fragment is
 * read from the raw URL — a fragment is not sent to a server and is invisible to
 * `useLocalSearchParams`, which is exactly why this looks like two mechanisms
 * for one thing.
 */
export default function ResetPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ token_hash?: string; access_token?: string }>()

  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const url = await Linking.getInitialURL()
      const fragment = url?.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
      const hash = new URLSearchParams(fragment)

      const established = await establishRecoverySession({
        tokenHash: params.token_hash,
        accessToken: params.access_token ?? hash.get('access_token') ?? undefined,
        refreshToken: hash.get('refresh_token') ?? undefined,
      })
      if (active) setReady(established ? 'ok' : 'invalid')
    })()
    return () => {
      active = false
    }
    // Once, on the link that opened the screen. Re-running would re-verify a
    // token that `verifyOtp` has already consumed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      failed()
      return setError(uk.passwordTooShort)
    }

    setError(null)
    setSubmitting(true)
    const result = await setNewPassword(password)
    setSubmitting(false)

    if (!result.ok) {
      failed()
      return setError(
        result.reason === 'linkInvalid'
          ? uk.resetLinkInvalid
          : result.reason === 'weakPassword'
            ? uk.passwordTooShort
            : uk.somethingWentWrong
      )
    }

    succeeded()
    // Straight into the app: `setNewPassword` ran on a live session, so the
    // reader is already signed in and a trip through the login form would ask
    // for the password they just set.
    router.replace('/(app)')
  }

  if (ready === 'checking') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 p-4 pt-8">
        <Text className="text-title text-foreground font-semibold">{uk.newPasswordTitle}</Text>

        {ready === 'invalid' ? (
          <>
            {/* An expired or already-used link. «Try again» would be advice that
                cannot succeed, so the only way out offered is a new request. */}
            <Text className="text-body-sm text-destructive mt-2 leading-5">
              {uk.resetLinkInvalid}
            </Text>
            <Button size="cta" className="mt-5" onPress={() => router.replace('/(auth)/login')}>
              <Text className="text-subtitle font-semibold">{uk.returnToLogin}</Text>
            </Button>
          </>
        ) : (
          <>
            <View className="mt-4 gap-2">
              <Label htmlFor="new-password">{uk.newPassword}</Label>
              <Input
                id="new-password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value)
                  setError(null)
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder={uk.passwordHint}
              />
              {error ? <Text className="text-label text-destructive">{error}</Text> : null}
            </View>

            <Button
              size="cta"
              className="mt-5"
              disabled={submitting}
              onPress={() => void submit()}
            >
              <Text className="text-subtitle font-semibold">{uk.savePassword}</Text>
            </Button>
          </>
        )}
      </View>
    </ScrollView>
  )
}
