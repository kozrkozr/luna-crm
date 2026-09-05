import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { failed, succeeded, tapped } from '../../src/lib/haptics'
import { toastOnNextScreen } from '../../src/lib/nextScreenToast'
import { MIN_PASSWORD_LENGTH } from '../../src/features/auth/register'
import { changePassword } from '../../src/features/auth/profile'
import { Starfield } from '../../src/components/Starfield'

/**
 * «Зміна пароля» — where the profile's «Пароль · Змінити ›» row leads.
 *
 * `Edit Profile.dc.html` draws the row but not this screen, the same way
 * `Auth.dc.html` drew the recovery request but not the form that sets the
 * password. Built because the row is unreachable otherwise; the copy is new and
 * **no story covers changing a password** — `US-013` is login.
 *
 * **No «current password» field.** Supabase's `updateUser` authenticates by the
 * session alone and offers no way to verify one, so a field collecting it could
 * not check it — it would be theatre. Holding a live session is the protection.
 * Worth revisiting if re-authentication is ever wanted before sensitive changes;
 * it would need its own mechanism, not a field.
 */
export default function ChangePasswordScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const ready = password.length >= MIN_PASSWORD_LENGTH

  const submit = async () => {
    if (!ready) {
      failed()
      return setError(t.passwordTooShort)
    }

    setError(null)
    setBusy(true)
    const ok = await changePassword(password)
    setBusy(false)

    if (!ok) {
      failed()
      return setError(t.somethingWentWrong)
    }

    succeeded()
    // The toast belongs to the profile screen, which this one is about to pop —
    // see src/lib/nextScreenToast.ts.
    toastOnNextScreen(t.passwordChanged)
    router.back()
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="bg-background border-border flex-row items-center border-b px-3 pb-2"
        style={{ paddingTop: insets.top }}
      >
        <Pressable
          className="active:bg-secondary min-h-11 shrink-0 justify-center rounded-lg px-2"
          onPress={() => {
            tapped()
            router.back()
          }}
          role="button"
        >
          <Text className="text-body-sm text-muted-foreground font-medium">{t.cancel}</Text>
        </Pressable>
        <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
          {t.changePasswordTitle}
        </Text>
        <View className="w-[74px] shrink-0" />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="gap-2 p-4">
          <Label htmlFor="new-password">{t.newPassword}</Label>
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
            placeholder={t.passwordHint}
          />
          {error ? <Text className="text-label text-destructive">{error}</Text> : null}

          <Button
            variant={ready ? 'cta' : 'secondary'}
            size="cta"
            className="mt-5"
            disabled={busy}
            onPress={() => void submit()}
          >
            <Text className={ready ? undefined : 'text-muted-foreground'}>{t.savePassword}</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
