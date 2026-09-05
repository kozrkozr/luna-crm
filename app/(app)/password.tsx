import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import Eye from 'lucide-react-native/icons/eye'
import EyeOff from 'lucide-react-native/icons/eye-off'
import { Button } from '../../src/components/ui/button'
import { FormScrollView } from '../../src/components/ui/form-scroll-view'
import { Icon } from '../../src/components/ui/icon'
import { Text } from '../../src/components/ui/text'
import { SectionLabel } from '../../src/components/ShootFormFields'
import { Starfield } from '../../src/components/Starfield'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { failed, succeeded, tapped } from '../../src/lib/haptics'
import { toastOnNextScreen } from '../../src/lib/nextScreenToast'
import { Toast } from '../../src/components/Toast'
import { changePassword } from '../../src/features/auth/profile'
import { requestPasswordReset } from '../../src/features/auth/passwordReset'
import { useProfile } from '../../src/features/auth/useProfile'
import { PasswordStrength } from '../../src/features/auth/PasswordStrength'
import { canChangePassword } from '../../src/features/auth/passwordRules'

/**
 * «Зміна пароля» — where the profile's «Пароль · Змінити ›» row leads.
 *
 * Rebuilt against `Edit Profile.dc.html` (owner, 2026-09-05), which grew this
 * screen as a full layer where it had drawn only the row. **No story covers
 * changing a password** — `US-013` is login — so every rule and every word here
 * comes from that artboard.
 *
 * What it replaces: one «Новий пароль» field and a save button. The artboard
 * adds the current password, a repeat with a match tick, a strength meter and
 * four live rules.
 *
 * **The current-password field is real, not decorative.** This screen used to
 * carry a note explaining that Supabase could not verify one; `changePassword`
 * now re-authenticates to check it, and that note has moved there along with
 * what the mechanism costs.
 *
 * ── Not built, and deliberately ─────────────────────────────────────────────
 *
 * The artboard's script carries `pwSignOut` state and a track/knob for it —
 * "sign out other devices" — but **draws no control anywhere in the markup**.
 * It is leftover from an earlier pass. Building it would mean inventing both
 * the row and the behaviour (Supabase's global sign-out ends THIS session too),
 * so it is left out and logged.
 */
export default function ChangePasswordScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const profile = useProfile()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [repeatError, setRepeatError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const valid = canChangePassword({ current, next, repeat })
  /* The artboard's green tick beside the repeat: shown on a match, and only
     once something has been typed — an empty repeat matches an empty new
     password and would tick an untouched form. */
  const matched = repeat.length > 0 && repeat === next

  const submit = async () => {
    if (busy) return
    if (!valid) {
      /* The artboard validates on submit as well as on blur, and names the two
         things a rule list cannot: a missing current password and a repeat that
         does not match. The four rules speak for themselves above. */
      failed()
      setCurrentError(current ? null : t.currentPasswordRequired)
      setRepeatError(repeat === next ? null : t.passwordsDoNotMatch)
      setToast(t.checkHighlightedFields)
      return
    }

    setCurrentError(null)
    setRepeatError(null)
    setBusy(true)
    const result = await changePassword(current, next)
    setBusy(false)

    if (result === 'wrong-current') {
      failed()
      return setCurrentError(t.currentPasswordWrong)
    }
    if (result === 'failed') {
      failed()
      return setToast(t.somethingWentWrong)
    }

    succeeded()
    // The toast belongs to the profile screen, which this one is about to pop —
    // see src/lib/nextScreenToast.ts.
    toastOnNextScreen(t.passwordChanged)
    router.back()
  }

  /*
    «Забули пароль?» sends the real recovery email rather than the artboard's
    stub toast. The flow already exists (`requestPasswordReset`, and
    `(auth)/reset`), the address is the one on the session, and a control that
    says a letter was sent had better send one.

    The result is not branched on: `requestPasswordReset` reports failure the
    same way the login screen does — it does not, deliberately, because whether
    an address exists is not something an unauthenticated caller may learn. Here
    the address certainly exists, so the message is true either way.
  */
  const forgot = () => {
    tapped()
    const email = profile.status === 'loaded' ? profile.profile.email : null
    if (!email) return
    void requestPasswordReset(email)
    setToast(t.recoveryEmailSent)
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        «Скасувати · Зміна пароля · Зберегти» — the artboard's own header, the
        same three-part bar the profile screen draws. «Зберегти» is `--link`
        when the form is valid and `--muted` otherwise, which is the only thing
        marking it disabled: the artboard gives it no other state.
      */}
      <View
        className="bg-background border-border border-b"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="flex-row items-center gap-1.5 px-2 pb-2">
          <Pressable
            className="active:bg-secondary min-h-11 shrink-0 justify-center rounded-lg px-2.5"
            onPress={() => {
              tapped()
              router.back()
            }}
            role="button"
          >
            <Text className="text-body-sm text-muted-foreground font-medium">{t.cancel}</Text>
          </Pressable>
          <Text
            className="text-subtitle text-foreground min-w-0 flex-1 text-center font-semibold"
            numberOfLines={1}
          >
            {t.passwordChangeTitle}
          </Text>
          <Pressable
            className="min-h-11 shrink-0 justify-center rounded-lg px-2.5"
            disabled={!valid || busy}
            onPress={() => void submit()}
            role="button"
          >
            <Text
              className={`text-body-sm font-semibold ${
                valid && !busy ? 'text-link' : 'text-muted-foreground'
              }`}
            >
              {busy ? t.savingWord : t.save}
            </Text>
          </Pressable>
        </View>
      </View>

      <FormScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 34, gap: 18 }}
      >
        {/* ── Поточний пароль ── */}
        <View>
          <View className="mb-2 px-0.5">
            <SectionLabel label={t.currentPasswordSection} />
          </View>
          <PasswordField
            value={current}
            onChangeText={(value) => {
              setCurrent(value)
              setCurrentError(null)
            }}
            placeholder={t.currentPasswordPlaceholder}
            autoComplete="current-password"
            invalid={!!currentError}
          />
          {currentError ? (
            <Text role="alert" className="text-caption text-destructive mt-1.5 px-0.5">
              {currentError}
            </Text>
          ) : null}
          <Pressable className="mt-2 self-start px-0.5" onPress={forgot} hitSlop={8} role="button">
            <Text className="text-label text-link font-medium">{t.forgotPassword}</Text>
          </Pressable>
        </View>

        {/* ── Новий пароль ── */}
        <View>
          <View className="mb-2 px-0.5">
            <SectionLabel label={t.newPasswordSection} />
          </View>
          {/* One card, two rows — the artboard's `overflow:hidden` container
              with a hairline between them, not two separate fields. */}
          <View className="bg-card border-border overflow-hidden rounded-xl border">
            <PasswordField
              value={next}
              onChangeText={setNext}
              placeholder={t.newPassword}
              autoComplete="new-password"
              bare
            />
            <View className="border-border border-t">
              <PasswordField
                value={repeat}
                onChangeText={(value) => {
                  setRepeat(value)
                  setRepeatError(null)
                }}
                placeholder={t.repeatNewPassword}
                autoComplete="new-password"
                bare
                /* The repeat has a tick instead of an eye. The artboard gives
                   it no reveal control — the field exists to be typed twice,
                   and showing it would defeat the check. */
                trailing={
                  matched ? (
                    <View className="h-[34px] w-[34px] items-center justify-center">
                      <Icon as={Check} size={18} strokeWidth={2.2} className="text-success" />
                    </View>
                  ) : null
                }
              />
            </View>
          </View>
          {repeatError ? (
            <Text role="alert" className="text-caption text-destructive mt-1.5 px-0.5">
              {repeatError}
            </Text>
          ) : null}

          <PasswordStrength password={next} current={current} />
        </View>

        {/* The artboard repeats the action as a full-width CTA below the rules,
            beside «Зберегти» in the header. Both submit; the header is reachable
            without scrolling and this one is where the eye ends up. */}
        <Button
          variant="cta"
          size="cta"
          className="h-[52px] justify-center py-0"
          disabled={!valid || busy}
          onPress={() => void submit()}
        >
          <Text className="text-subtitle font-semibold">
            {busy ? t.savingWord : t.updatePassword}
          </Text>
        </Button>
      </FormScrollView>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/**
 * One password row: the input, and an eye that reveals it.
 *
 * `bare` drops the card so the row can sit inside a shared one — the artboard
 * gives «Поточний пароль» its own bordered card and puts the two new-password
 * rows inside a single one.
 *
 * The masked field carries `letterSpacing: 2` while hidden, as drawn. It is the
 * one thing that makes a row of dots read as a password rather than as noise,
 * and it goes when the value is shown so real characters are not spaced out.
 */
function PasswordField({
  value,
  onChangeText,
  placeholder,
  autoComplete,
  invalid = false,
  bare = false,
  trailing,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  autoComplete: 'current-password' | 'new-password'
  invalid?: boolean
  bare?: boolean
  /** Replaces the eye — the repeat field's match tick. */
  trailing?: React.ReactNode
}) {
  const t = useStrings()
  const [shown, setShown] = useState(false)

  return (
    <View
      className={`min-h-14 flex-row items-center gap-2.5 pl-4 pr-3 ${
        bare ? '' : `bg-card rounded-xl border ${invalid ? 'border-destructive' : 'border-border'}`
      }`}
    >
      <TextInput
        className="text-body text-foreground min-w-0 flex-1"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#71717A"
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        style={{ letterSpacing: shown || !value ? 0 : 2 }}
      />
      {trailing ?? (
        <Pressable
          className="active:bg-border h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
          onPress={() => {
            tapped()
            setShown((current) => !current)
          }}
          role="button"
          accessibilityLabel={shown ? t.hidePassword : t.showPassword}
        >
          <Icon
            as={shown ? EyeOff : Eye}
            size={18}
            strokeWidth={1.7}
            className="text-muted-foreground"
          />
        </Pressable>
      )}
    </View>
  )
}
