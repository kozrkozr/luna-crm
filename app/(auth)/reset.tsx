import { useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { FormScrollView } from '../../src/components/ui/form-scroll-view'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'
import { failed, succeeded } from '../../src/lib/haptics'
import { MIN_PASSWORD_LENGTH, withMinLength } from '../../src/features/auth/passwordRules'
import { setNewPassword } from '../../src/features/auth/passwordReset'
import { useLinkSession } from '../../src/features/auth/authLink'
import { Starfield } from '../../src/components/Starfield'

/**
 * Where the recovery email lands — `lunashoots://reset` on a device, `/reset` on
 * the web export (`resetRedirectUrl`).
 *
 * `Auth.dc.html` draws the request and the confirmation but **not this screen**,
 * which is the one that actually changes anything. Built because the flow is
 * unreachable without it; its copy is new and no story covers it.
 *
 * Reading the link — both token shapes, and why it is `useLinkingURL` — is
 * `useLinkSession`, shared with the signup confirmation (`(auth)/confirm`).
 */
export default function ResetPasswordScreen() {
  const router = useRouter()
  const ready = useLinkSession('recovery')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
