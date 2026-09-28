import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { Button } from '../../src/components/ui/button'
import { FormScrollView } from '../../src/components/ui/form-scroll-view'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'
import { failed, succeeded } from '../../src/lib/haptics'
import { MIN_PASSWORD_LENGTH, withMinLength } from '../../src/features/auth/passwordRules'
import { establishRecoverySession, setNewPassword } from '../../src/features/auth/passwordReset'
import { Starfield } from '../../src/components/Starfield'

/**
 * Where the recovery email lands — `lunashoots://reset` on a device, `/reset` on
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

  /*
    `useURL`, not `getInitialURL` — fixed 2026-09-28 against a real recovery
    email. `getInitialURL` answers with the link that COLD-STARTED the app, so
    it works only if the app was closed when the reader tapped the link. Tap it
    with the app already open — the normal case, and the one every test after
    the first hits — and iOS delivers the URL as an event instead: the screen
    opens, `getInitialURL` returns nothing, the fragment carrying the tokens is
    never read, and the screen says «Посилання недійсне або застаріле» about a
    link that is perfectly valid.

    `useLinkingURL`, not `useURL`: the first is deprecated precisely for this.
    `useURL` starts at null and fills in from an event listener it registers on
    mount — but expo-router routes to this screen BECAUSE of that same event, so
    the screen mounts after it has already been dispatched and the listener
    catches nothing. `useLinkingURL` reads the stored linking URL synchronously
    as its initial value, so a link that arrived before this component existed
    is still there to be read.
  */
  const url = Linking.useLinkingURL()
  const attempted = useRef<string | null>(null)

  useEffect(() => {
    const key = url ?? 'none'
    if (attempted.current === key) return

    const fragment = url?.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
    const hash = new URLSearchParams(fragment)
    const tokenHash = params.token_hash
    const accessToken = params.access_token ?? hash.get('access_token') ?? undefined
    const refreshToken = hash.get('refresh_token') ?? undefined

    // Still guarded: null for a render before the URL resolves, and judging the
    // link before it has arrived is the bug above, inverted.
    if (!tokenHash && !accessToken && url === null) return

    // Guarded per URL rather than run once: `verifyOtp` consumes its token, so
    // re-verifying the same link would fail the second time.
    attempted.current = key

    let active = true
    void (async () => {
      const established = await establishRecoverySession({
        tokenHash,
        accessToken,
        refreshToken,
      })
      if (active) setReady(established ? 'ok' : 'invalid')
    })()
    return () => {
      active = false
    }
  }, [url, params.token_hash, params.access_token])

  const submit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      failed()
      return setError(withMinLength(uk.passwordTooShortTemplate))
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
            ? withMinLength(uk.passwordTooShortTemplate)
            : uk.somethingWentWrong
      )
    }

    succeeded()
    // Straight into the app: `setNewPassword` ran on a live session, so the
    // reader is already signed in and a trip through the login form would ask
    // for the password they just set.
    router.replace('/(app)/(tabs)')
  }

  if (ready === 'checking') {
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
      <FormScrollView
        contentInsetAdjustmentBehavior="automatic"
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
                  placeholder={withMinLength(uk.passwordHintTemplate)}
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
      </FormScrollView>
    </View>
  )
}
