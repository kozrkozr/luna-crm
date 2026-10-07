import { useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Icon } from '../../components/ui/icon'
import { Text } from '../../components/ui/text'
import { Toast } from '../../components/Toast'
import { openExternalUrl } from '../../lib/openExternalUrl'
import { privacyUrl, termsUrl } from '../../lib/legalUrls'
import { useStrings } from '../../i18n/LanguageProvider'
import { phoneExample } from '../../i18n/device'
import { OTHER_ROLE, ROLE_KEYS, roleWithEmoji } from '../../i18n/vocabulary'
import { selected } from '../../lib/haptics'
import { login } from './login'
import { requestPasswordReset } from './passwordReset'
import { RESEND_COOLDOWN_SECONDS, resendConfirmation } from './emailConfirmation'
import { register } from './register'
import { MIN_PASSWORD_LENGTH, withMinLength } from './passwordRules'
import { Starfield } from '../../components/Starfield'
import { FormScrollView } from '../../components/ui/form-scroll-view'

/**
 * `login` and `register` are the two the routes map onto; `forgot` and `sent`
 * are the recovery flow `Auth.dc.html` added (owner, 2026-08-31), and
 * `confirmSent` is `ADR-019`'s «Перевірте пошту» after registering. All three
 * are reached only from inside this screen.
 */
/** The one place this screen decides what an email looks like. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type AuthMode = 'login' | 'register'
type ScreenMode = AuthMode | 'forgot' | 'sent' | 'confirmSent'

/**
 * `US-013` (log in) and `US-001` (register) on one screen, switched by a
 * segmented control — the shape of ADR-017's auth-screen mockup.
 *
 * Both routes still exist: `(auth)/login` and `(auth)/register` each render
 * this with a different `initialMode`. That keeps `RequireSession`'s redirect
 * target, every acceptance suite's `/login` URL, and any link anyone has
 * working, while the reader sees one screen. Switching tabs is local state, not
 * navigation, which is what "combined page" means.
 *
 * **Only the active form is mounted**, rather than both with one hidden. Two
 * reasons: React Native has no `display: none` that also removes a field from
 * the accessibility tree, and — the practical one — `cdp.mjs`'s `login()`
 * helper reads `document.querySelectorAll('input')[0]` and `[1]`. With the
 * register form mounted too, index 0 would be its name field and every suite in
 * the repository would fail on a screen that looked fine.
 *
 * Rebuilt against **`Auth.dc.html`** on 2026-08-31, which resolved three of the
 * four things the previous pass had logged against `auth-screen.html`:
 *
 * - **A-1** — «Email або телефон» is now just «Email». `ADR-015` makes email the
 *   credential and the owner reaffirmed it; the design's SMS hint would promise
 *   a channel that does not exist (`[auth.sms] enable_signup` is false, and
 *   there is no provider).
 * - **A-2** — «Забули пароль?» works. Two screens here plus `(auth)/reset`,
 *   over `resetPasswordForEmail`. **No story covers recovery**; `US-013` is
 *   login.
 * - **A-3** — «Підтвердіть пароль» is gone. The design does not draw it, no
 *   story defined it, and its mismatch message was invented copy.
 * - **A-5** — the password minimum reads 6 and validates 6, matching
 *   `config.toml`. The design says 8; no story specifies a minimum, so 6 is the
 *   only reviewed number.
 *
 * **A-4 is resolved, 2026-09-28.** The terms checkbox blocks registration as
 * drawn, and both documents now exist and open: `public/terms/` and
 * `public/privacy/`, served as static pages by the same Cloudflare Pages
 * project as the link surface. Until then the checkbox gated on agreeing to
 * two underlined phrases that led nowhere.
 *
 * They are plain HTML rather than screens on purpose — see `lib/legalUrls.ts`.
 *
 * Two additions with no story behind either: a free-text «Інша роль», so
 * `users.role` is no longer one of the glossary's five, and a Telegram handle
 * (`users.telegram`, migration `20260831100000`).
 */
export function AuthScreen({ initialMode }: { initialMode: AuthMode }) {
  const t = useStrings()
  const [mode, setMode] = useState<ScreenMode>(initialMode)
  /** Carried from login into the recovery form, so it is not retyped. */
  const [recoveryEmail, setRecoveryEmail] = useState('')
  /** The address the confirmation email went to — named on the screen (AC-1). */
  const [confirmEmail, setConfirmEmail] = useState('')

  return (
    /*
      `FormScrollView` carries the keyboard behaviour — the inset that keeps
      «Соцмережі», the last block of this form, reachable while typing. It was
      written here first and lived here alone until 2026-09-05, when the owner
      found every other form in the app had the bug it fixes. The reasoning
      moved to the component with it.
    */
    <View className="bg-background flex-1">
      <Starfield />
      <FormScrollView
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="px-4 pb-16">
          {/* The intro and the tabs belong to the two AUTH modes. The recovery
              screens replace them with their own heading, as drawn. */}
          {mode === 'login' || mode === 'register' ? (
            <>
              <Intro />
              <View className="bg-secondary border-border mb-5 flex-row rounded-lg border p-[3px]">
                <SegmentTab
                  label={t.loginBtn}
                  active={mode === 'login'}
                  onPress={() => setMode('login')}
                />
                <SegmentTab
                  label={t.registerTitle}
                  active={mode === 'register'}
                  onPress={() => setMode('register')}
                />
              </View>
            </>
          ) : null}

          {mode === 'login' ? (
            <LoginForm
              onForgot={(email) => {
                setRecoveryEmail(email)
                setMode('forgot')
              }}
            />
          ) : null}
          {mode === 'register' ? (
            <RegisterForm
              onNeedsConfirmation={(email) => {
                setConfirmEmail(email)
                setMode('confirmSent')
              }}
            />
          ) : null}
          {mode === 'forgot' ? (
            <ForgotForm
              email={recoveryEmail}
              onEmailChange={setRecoveryEmail}
              onBack={() => setMode('login')}
              onSent={() => setMode('sent')}
            />
          ) : null}
          {mode === 'sent' ? (
            <ResetSent
              email={recoveryEmail}
              onBack={() => setMode('login')}
              onChangeAddress={() => setMode('forgot')}
            />
          ) : null}

          {mode === 'confirmSent' ? (
            <ConfirmSent email={confirmEmail} onBack={() => setMode('login')} />
          ) : null}

          {/* «Потрібна допомога? Напишіть нам» — on the auth modes only. */}
          {mode === 'login' || mode === 'register' ? (
            <Pressable
              className="mt-3.5 min-h-11 flex-row items-center justify-center"
              onPress={() => void openExternalUrl('mailto:support@lunashoots.com')}
              role="button"
            >
              <Text className="text-label text-muted-foreground">{`${t.needHelp} `}</Text>
              <Text className="text-label text-foreground">{t.writeToUs}</Text>
            </Pressable>
          ) : null}
        </View>
      </FormScrollView>
    </View>
  )
}

/**
 * The logo mark, product name and tagline.
 *
 * The mark is the first letter of the name rather than a hardcoded «З», so the
 * two cannot drift apart — and so it is still right if the product is renamed
 * (see the note on `appName` in the dictionary).
 */
function Intro() {
  const t = useStrings()
  return (
    <View className="items-center px-2.5 pb-6 pt-8">
      <View className="bg-secondary mb-4 h-14 w-14 items-center justify-center rounded-2xl">
        {/*
          lineHeight pinned to the font size: without it Android adds leading
          and the letter sits low in the square — the same trap Avatar documents.
        */}
        <Text
          className="text-foreground font-bold"
          style={{ fontSize: 24, lineHeight: 24 }}
        >
          {t.appName.slice(0, 1)}
        </Text>
      </View>
      <Text className="text-numeric-xl text-foreground font-bold">{t.appName}</Text>
      <Text
        className="text-label text-muted-foreground mt-1.5 px-5 text-center"
        style={{ lineHeight: 18 }}
      >
        {t.appTagline}
      </Text>
    </View>
  )
}

function SegmentTab({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      /*
        `bg-background`, not `bg-card`. The active segment is the page colour
        showing through a lighter track — which is what it looked like while
        `--card` equalled `--background`, and it stopped being true when `--card`
        was lifted to the Figma file's #1F1F22: on a #262626 track a #1F1F22
        segment is almost invisible.
      */
      className={`flex-1 items-center rounded-sm py-2.5 ${active ? 'bg-background' : ''}`}
      onPress={() => {
        selected()
        onPress()
      }}
      role="tab"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-body-sm font-semibold ${active ? 'text-card-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * A password field with the mockup's eye toggle.
 *
 * `secureTextEntry` is flipped rather than the web's `type`, and the button is
 * absolutely positioned inside a relative wrapper because React Native has no
 * `::after`. `hitSlop` brings a 24pt glyph up to the 44pt minimum without
 * growing it visually (§6.3).
 */
function PasswordField({
  id,
  value,
  onChangeText,
  autoComplete,
  placeholder,
}: {
  id: string
  value: string
  onChangeText: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  placeholder?: string
}) {
  const t = useStrings()
  const [visible, setVisible] = useState(false)
  return (
    <View className="relative justify-center">
      <Input
        id={id}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-24"
      />
      {/*
        A WORD, not an emoji. `Auth.dc.html` draws «Показати» / «Сховати» in a
        36pt pill inside the field, and the emoji this replaced rendered in its
        own colours on every platform — it could never take the muted tone of
        the field it sits in.
      */}
      <Pressable
        className="active:bg-secondary absolute right-1 h-9 justify-center rounded-md px-2.5"
        onPress={() => setVisible((current) => !current)}
        hitSlop={6}
        role="button"
        accessibilityLabel={visible ? t.hidePassword : t.showPassword}
      >
        <Text className="text-label text-muted-foreground font-medium">
          {visible ? t.hidePasswordShort : t.showPasswordShort}
        </Text>
      </Pressable>
    </View>
  )
}

/** `US-013` — log in to an existing account. */
function LoginForm({ onForgot }: { onForgot: (email: string) => void }) {
  const t = useStrings()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** `US-001` AC-3 — the right password, on an address not yet confirmed. */
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setUnconfirmed(false)
    setResendError(null)
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)

    if (!result.ok) {
      if (result.reason === 'emailNotConfirmed') {
        setUnconfirmed(true)
        return
      }
      // US-013 AC-2 — rejected with a clear message, and no account is entered.
      setError(t.wrongCreds)
      return
    }
    router.replace('/(app)/(tabs)')
  }

  const resend = async () => {
    setResendError(null)
    setResending(true)
    const sent = await resendConfirmation(email)
    setResending(false)
    // A failure here is almost always Supabase's interval between emails —
    // the reader registered moments ago. No copy was approved for that case,
    // so it gets the generic one rather than an invented explanation.
    if (sent) setToast(t.resentToast)
    else setResendError(t.somethingWentWrong)
  }

  return (
    <View className="gap-2">
      <ServerError message={unconfirmed ? t.emailNotConfirmed : error} />
      {unconfirmed ? (
        <>
          <Button
            variant="outline"
            size="cta"
            className="h-11 py-0"
            disabled={resending}
            onPress={() => void resend()}
          >
            <Text className="text-body-sm font-medium">{t.resendConfirmation}</Text>
          </Button>
          {resendError ? (
            <Text className="text-label text-destructive">{resendError}</Text>
          ) : null}
        </>
      ) : null}

      {/*
        **«Email», not the design's «Email або телефон»** (owner, 2026-08-31).
        `ADR-015` makes email the credential; there is no SMS provider and
        `[auth.sms] enable_signup` is false, so a phone number has nowhere to
        receive anything. The design also hints «Надішлемо SMS з кодом», which
        would promise a channel that does not exist.

        This closes redesign-log **A-1**, open since the first auth pass — by
        fixing the label rather than the ADR.
      */}
      <Label htmlFor="email">{t.email}</Label>
      <Input
        id="email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="your@mail.com"
      />

      <Label htmlFor="password">{t.password}</Label>
      <PasswordField
        id="password"
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        placeholder={t.password}
      />

      {error ? <Text className="text-body-sm text-destructive">{error}</Text> : null}

      {/*
        `id` so tests can reach this specific button: the login tab above is
        also labelled «Увійти», so matching on text finds the tab first.
      */}
      {/* The mockup's dark pill: #1C1C1E, radius 14, 15/600 white — which is
          `variant="default"` (bg-primary) at `size="cta"`. */}
      <Button
        id="auth-submit"
        size="cta"
        className="mt-4"
        disabled={submitting}
        onPress={submit}
      >
        <Text className="text-subtitle font-semibold">
          {submitting ? t.signingIn : t.loginBtn}
        </Text>
      </Button>

      {/*
        «Забули пароль?» **works now** (owner, 2026-08-31), closing redesign-log
        **A-2** — it had been on the screen and inert since the first auth pass.
        The typed email travels with it so it is not retyped.
      */}
      <Pressable
        className="mt-2 min-h-11 items-center justify-center"
        onPress={() => onForgot(email)}
        role="button"
      >
        <Text className="text-body-sm text-muted-foreground">{t.forgotPassword}</Text>
      </Pressable>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/** `US-001` — register an account and select a professional role. */
function RegisterForm({ onNeedsConfirmation }: { onNeedsConfirmation: (email: string) => void }) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [customRole, setCustomRole] = useState('')
  const [instagram, setInstagram] = useState('')
  const [telegram, setTelegram] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    phone?: string
    role?: string
    terms?: string
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /** What actually goes in `users.role` — the chip, or what «Інша роль» opened. */
  const resolvedRole = role === OTHER_ROLE ? customRole.trim() : (role ?? '')

  const submit = async () => {
    const next: typeof errors = {}
    if (!name.trim()) next.name = t.nameRequired
    if (!email.trim()) next.email = t.emailRequired
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t.emailFormat
    if (!password) next.password = t.passwordInvent
    else if (password.length < MIN_PASSWORD_LENGTH) next.password = withMinLength(t.passwordTooShortTemplate)
    // Optional, but a number that is present should look like one — the same
    // 9-digit floor `normalise_phone` uses, and the same check the profile
    // already makes on this column.
    if (phone.trim() && phone.replace(/\D/g, '').length < 9) next.phone = t.phoneFormatInvalid
    // AC-2 — registration is blocked without a role, and «Інша роль» is not a
    // role until it has been filled in.
    if (!role) next.role = t.roleRequired
    else if (role === OTHER_ROLE && !customRole.trim()) next.role = t.otherRoleRequired
    /*
      The terms box BLOCKS now (owner, 2026-08-31), where it gated nothing.
      **Both documents it names still do not exist** — redesign-log A-4 — so
      this refuses registration until someone agrees to something unwritten.
      That is the design as drawn and the owner's call; it is the one change on
      this screen that makes the product harder to use rather than easier.
    */
    if (!termsAccepted) next.terms = t.termsRequired

    setErrors(next)
    if (Object.keys(next).length > 0) {
      setFormError(null)
      return
    }

    setFormError(null)
    setSubmitting(true)
    const result = await register({
      name,
      email,
      password,
      role: resolvedRole,
      socialHandle: instagram,
      telegram,
      phone,
    })
    setSubmitting(false)

    if (!result.ok) {
      setFormError(
        result.reason === 'weakPassword'
          ? withMinLength(t.passwordTooShortTemplate)
          : result.reason === 'emailTaken'
            ? t.emailTaken
            : t.registrationFailed
      )
      return
    }
    // AC-1 — production confirms the email first (`ADR-019`); local Supabase
    // does not, and answers with a session.
    if (!result.confirmed) {
      onNeedsConfirmation(email.trim())
      return
    }
    router.replace('/(app)/(tabs)')
  }

  return (
    <View className="gap-3.5" style={{ paddingBottom: insets.bottom }}>
      <View className="gap-2">
        <Label htmlFor="name">{t.name}</Label>
        <Input
          id="name"
          value={name}
          onChangeText={(value) => {
            setName(value)
            setErrors((e) => ({ ...e, name: undefined }))
          }}
          autoCapitalize="words"
          placeholder={t.namePlaceholder}
        />
        <FieldError message={errors.name ?? null} />
      </View>

      <View className="gap-2">
        {/* «Email», not «Email або телефон» — see the note on the login form. */}
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          value={email}
          onChangeText={(value) => {
            setEmail(value)
            setErrors((e) => ({ ...e, email: undefined }))
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="your@mail.com"
        />
        <FieldError message={errors.email ?? null} />
      </View>

      <View className="gap-2">
        {/*
          **Optional, and the only field here that is not for its owner to read
          back.** `users.phone` is the second crew-matching key
          (`match_contact_to_user`, migration `20260827100000`): a photographer
          who adds someone by phone alone has no other way to reach their
          account, and `ADR-015` accepted that cost on the explicit condition
          that the person could supply the number themselves.

          They could not. Nothing on this screen collected it, so `users.phone`
          was null at the one moment the signup trigger looks, and the match
          fired on email or not at all (`docs/open-questions.md` #24).

          Sits where the profile puts it — after the email, before the password
          — so the two screens read in the same order. `Auth.dc.html` does not
          draw it; owner's request, 2026-09-07.
        */}
        <Label htmlFor="phone">
          {t.phone}
          <Text className="text-label text-muted-foreground font-normal">
            {` ${t.optionalSuffix}`}
          </Text>
        </Label>
        <Input
          id="phone"
          value={phone}
          onChangeText={(value) => {
            setPhone(value)
            setErrors((e) => ({ ...e, phone: undefined }))
          }}
          autoCapitalize="none"
          autoComplete="tel"
          keyboardType="phone-pad"
          placeholder={phoneExample()}
        />
        <FieldError message={errors.phone ?? null} />
      </View>

      <View className="gap-2">
        <Label htmlFor="password">{t.password}</Label>
        {/*
          **The placeholder says 6, and so does the check** (owner, 2026-08-31).
          `Auth.dc.html` says «Мінімум 8 символів» and validates at 8;
          `minimum_password_length` is 6, and no story specifies a minimum — so 6
          is the only number anyone has reviewed. This closes redesign-log
          **A-5**, which had the screen promising 8 while the backend took 6.

          `MIN_PASSWORD_LENGTH` is the single source, and its own comment says it
          mirrors config.toml.
        */}
        <PasswordField
          id="password"
          value={password}
          onChangeText={(value) => {
            setPassword(value)
            setErrors((e) => ({ ...e, password: undefined }))
          }}
          autoComplete="new-password"
          placeholder={withMinLength(t.passwordHintTemplate)}
        />
        <PasswordStrength password={password} />
        <FieldError message={errors.password ?? null} />
      </View>

      {/*
        **«Підтвердіть пароль» is gone**, and that closes redesign-log **A-3**.
        It was in the older mockup, no story ever defined it, and its mismatch
        message was invented copy. `Auth.dc.html` does not draw it — the strength
        meter and the show/hide toggle are what it offers instead, and both tell
        the reader more than retyping does.
      */}

      <RoleChips
        value={role}
        onChange={(next) => {
          setRole(next)
          setErrors((e) => ({ ...e, role: undefined }))
        }}
        custom={customRole}
        onCustomChange={(value) => {
          setCustomRole(value)
          setErrors((e) => ({ ...e, role: undefined }))
        }}
        error={errors.role ?? null}
      />

      <View className="gap-2.5">
        <Text className="text-body-sm text-foreground font-medium">
          {t.social}
          <Text className="text-label text-muted-foreground font-normal">
            {` ${t.optionalSuffix}`}
          </Text>
        </Text>
        <View className="gap-2">
          <Text className="text-label text-muted-foreground">{t.instagramLabel}</Text>
          <Input
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t.crewInstagramPlaceholder}
          />
        </View>
        {/* Telegram is new — `users.telegram`, migration 20260831100000. No
            story defines it; the design draws it. */}
        <View className="gap-2">
          <Text className="text-label text-muted-foreground">{t.telegramLabel}</Text>
          <Input
            value={telegram}
            onChangeText={setTelegram}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t.telegramPlaceholder}
          />
        </View>
        <Text className="text-label text-muted-foreground">{t.socialHint}</Text>
      </View>

      <View className="gap-1">
        <Pressable
          className="active:bg-secondary -mx-1 flex-row items-start gap-3 rounded-lg px-1 py-2"
          onPress={() => {
            setTermsAccepted((current) => !current)
            setErrors((e) => ({ ...e, terms: undefined }))
          }}
          role="checkbox"
          accessibilityState={{ checked: termsAccepted }}
        >
          {/*
            The box is an indicator; the ROW is the control. A real `Checkbox`
            nested in a pressable row would be two tap targets for one choice —
            the same arrangement the add-crew contact rows use.
          */}
          <View
            className={`mt-0.5 h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
              termsAccepted
                ? 'bg-primary border-primary'
                : errors.terms
                  ? 'border-destructive'
                  : 'border-border-strong'
            }`}
          >
            {termsAccepted ? (
              <Icon as={Check} size={12} strokeWidth={3} className="text-primary-foreground" />
            ) : null}
          </View>
          {/* The two phrases open the documents; tapping anywhere else in this
              row still toggles the checkbox. They were styled as links and led
              nowhere until 2026-09-28 — the checkbox gated registration on
              agreeing to text nobody could read. */}
          <Text className="text-label text-muted-foreground flex-1 leading-5">
            {`${t.termsPrefix} `}
            <Text
              className="text-foreground underline"
              onPress={() => {
                const url = termsUrl()
                if (url) void openExternalUrl(url)
              }}
            >
              {t.termsUse}
            </Text>
            {` ${t.termsAnd} `}
            <Text
              className="text-foreground underline"
              onPress={() => {
                const url = privacyUrl()
                if (url) void openExternalUrl(url)
              }}
            >
              {t.termsPrivacy}
            </Text>
          </Text>
        </Pressable>
        <FieldError message={errors.terms ?? null} />
      </View>

      {formError ? <Text className="text-body-sm text-destructive">{formError}</Text> : null}

      <Button size="cta" className="mt-1" disabled={submitting} onPress={() => void submit()}>
        <Text className="text-subtitle font-semibold">
          {submitting ? t.creatingAccount : t.registerBtn}
        </Text>
      </Button>
    </View>
  )
}

/**
 * A field-level error, as `Auth.dc.html` draws it: 12px destructive, 6px under
 * the input it belongs to.
 */
function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Text role="alert" className="text-label text-destructive mt-1.5">
      {message}
    </Text>
  )
}

/**
 * The bordered server-error box above the login form — «Невірний email або
 * пароль», «Забагато спроб входу».
 *
 * A box rather than a line, because it reports something the form did not catch
 * itself: the fields are all valid and the attempt still failed. The design
 * gives it a `#7f1d1d` border on a `#1c1011` ground; here that is
 * `destructive/50` over `destructive/10`, so it stays inside the palette rather
 * than adding two literals for one box.
 */
function ServerError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <View
      role="alert"
      className="border-destructive/50 bg-destructive/10 flex-row gap-2.5 rounded-lg border p-3"
    >
      <Text className="text-destructive text-label font-bold">!</Text>
      <Text className="text-label text-destructive flex-1 leading-5">{message}</Text>
    </View>
  )
}

/**
 * How strong the typed password is, in three steps.
 *
 * **Monochrome, where the design is red/amber/green.** `Auth.dc.html` colours
 * the bars `#f87171` / `#facc15` / `#4ade80`, and this app removed every
 * application colour scale on 2026-08-30 — amber and green would be the only
 * two hues to come back, for a hint. So strength reads as HOW MANY bars are
 * filled, which is the channel the design already uses too, and the word beside
 * them says it outright.
 *
 * The weak state keeps `destructive`, the one surviving hue: a password the
 * form is about to reject is the same class of thing as any other refusal.
 *
 * The rule is the design's own: length, mixed case, and a digit or symbol.
 */
function PasswordStrength({ password }: { password: string }) {
  const t = useStrings()
  if (!password) return null

  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score++
  if (/[A-ZА-ЯЇІЄҐ]/.test(password) && /[a-zа-яїієґ]/.test(password)) score++
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score++

  const label = score <= 1 ? t.strengthWeak : score === 2 ? t.strengthNormal : t.strengthStrong

  return (
    <View className="mt-2 flex-row items-center gap-2.5">
      <View className="flex-1 flex-row gap-1">
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            className={`h-[3px] flex-1 rounded-full ${
              score >= step ? (score <= 1 ? 'bg-destructive' : 'bg-foreground') : 'bg-secondary'
            }`}
          />
        ))}
      </View>
      <Text className="text-caption text-muted-foreground shrink-0">{label}</Text>
    </View>
  )
}

/** The role chips, plus «Інша роль» and the field it opens. */
function RoleChips({
  value,
  onChange,
  custom,
  onCustomChange,
  error,
}: {
  value: string | null
  onChange: (role: string | null) => void
  custom: string
  onCustomChange: (value: string) => void
  error: string | null
}) {
  const t = useStrings()
  const isOther = value === OTHER_ROLE

  return (
    <View className="gap-2">
      <Text className="text-body-sm text-foreground font-medium">{t.role}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {[...ROLE_KEYS, OTHER_ROLE].map((option) => {
          const active = value === option
          return (
            <Pressable
              key={option}
              className={`min-h-[38px] justify-center rounded-lg border px-3 ${
                active
                  ? 'bg-primary border-primary'
                  : 'bg-background border-border active:bg-secondary'
              }`}
              onPress={() => {
                selected()
                onChange(option)
              }}
              role="radio"
              accessibilityState={{ selected: active }}
            >
              {/* The glyph is on the LABEL only — `option` stays the bare
                  key in `onChange`, in `active`, and in what is stored. */}
              <Text
                className={`text-body-sm font-medium ${
                  active ? 'text-primary-foreground' : 'text-foreground/85'
                }`}
              >
                {roleWithEmoji(option, t)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/*
        «Інша роль» opens a free-text field (owner, 2026-08-31). `users.role` is
        a `text` column so anything stores, but it does mean **roles stop being a
        fixed set** — the glossary defines five, and `US-001` AC-2 speaks of
        choosing one. Both need amending; logged.
      */}
      {isOther ? (
        <Input
          value={custom}
          onChangeText={onCustomChange}
          placeholder={t.otherRolePlaceholder}
          autoCapitalize="sentences"
        />
      ) : null}
      <FieldError message={error} />
    </View>
  )
}

/**
 * «Відновлення пароля» — ask for the address, send the link.
 *
 * `Auth.dc.html`, owner 2026-08-31. **No story covers recovery**; `US-013` is
 * login. Logged.
 */
function ForgotForm({
  email,
  onEmailChange,
  onBack,
  onSent,
}: {
  email: string
  onEmailChange: (value: string) => void
  onBack: () => void
  onSent: () => void
}) {
  const t = useStrings()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const trimmed = email.trim()
    if (!trimmed) return setError(t.emailRequired)
    if (!EMAIL_PATTERN.test(trimmed)) return setError(t.emailFormat)

    setError(null)
    setSubmitting(true)
    await requestPasswordReset(trimmed)
    setSubmitting(false)
    /*
      Always forward, never branch on the result. `requestPasswordReset` cannot
      tell a registered address from an unknown one — deliberately, so this
      screen cannot be used to discover which emails have accounts. Same
      reasoning `login` gives for collapsing its failures.
    */
    onSent()
  }

  return (
    <View className="pt-6">
      <Pressable
        className="active:bg-secondary -ml-2 mb-3.5 min-h-11 flex-row items-center gap-2 self-start rounded-lg px-2"
        onPress={onBack}
        role="button"
      >
        <Icon as={ChevronLeft} size={16} strokeWidth={2} className="text-muted-foreground" />
        <Text className="text-body-sm text-muted-foreground font-medium">{t.backToLogin}</Text>
      </Pressable>

      <Text className="text-title text-foreground font-semibold">{t.resetTitle}</Text>
      <Text className="text-body-sm text-muted-foreground mt-2 leading-5">
        {t.resetIntro}
      </Text>

      <View className="mt-5 gap-2">
        <Label htmlFor="reset-email">{t.email}</Label>
        <Input
          id="reset-email"
          value={email}
          onChangeText={(value) => {
            onEmailChange(value)
            setError(null)
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="your@mail.com"
        />
        <FieldError message={error} />

        <Button size="cta" className="mt-3" disabled={submitting} onPress={() => void submit()}>
          <Text className="text-subtitle font-semibold">
            {submitting ? t.sendingResetLink : t.sendResetLink}
          </Text>
        </Button>
      </View>
    </View>
  )
}

/**
 * «Перевірте пошту» — the confirmation, with the design's 30-second resend
 * countdown.
 *
 * The countdown is a rate limit the reader can see rather than one they hit:
 * Supabase throttles recovery emails, and a button that could be pressed
 * repeatedly would fail silently on the second press.
 */
function ResetSent({
  email,
  onBack,
  onChangeAddress,
}: {
  email: string
  onBack: () => void
  onChangeAddress: () => void
}) {
  const t = useStrings()
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  return (
    <View className="items-center pt-12">
      <View className="border-border-strong bg-secondary mb-5 h-14 w-14 items-center justify-center rounded-full">
        <Icon as={Check} size={22} strokeWidth={2.2} className="text-foreground" />
      </View>

      <Text className="text-title text-foreground font-semibold">{t.checkYourMail}</Text>
      <Text className="text-body-sm text-muted-foreground mt-2.5 text-center leading-6">
        {t.resetSentTemplate.replace('{email}', email.trim())}
      </Text>

      <Button size="cta" className="mt-6 w-full" onPress={onBack}>
        <Text className="text-subtitle font-semibold">{t.returnToLogin}</Text>
      </Button>

      <Button
        variant="outline"
        size="cta"
        className="mt-2.5 h-11 w-full py-0"
        disabled={secondsLeft > 0}
        onPress={() => {
          void requestPasswordReset(email)
          setSecondsLeft(30)
          setToast(t.resentToast)
        }}
      >
        <Text className="text-body-sm font-medium">
          {secondsLeft > 0
            ? t.resendInTemplate.replace('{seconds}', String(secondsLeft))
            : t.resendLink}
        </Text>
      </Button>

      <Pressable
        className="mt-1.5 min-h-11 items-center justify-center"
        onPress={onChangeAddress}
        role="button"
      >
        <Text className="text-label text-muted-foreground">{t.changeAddress}</Text>
      </Pressable>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/**
 * «Перевірте пошту» after registering — `US-001` AC-1 as amended by `ADR-019`.
 *
 * Shaped like `ResetSent` and sharing its heading, toast and countdown, but not
 * its layout: here sending again is the one thing to do, so it is the primary
 * button, and going back is the quiet link (copy approved 2026-09-29).
 *
 * The countdown starts at once, because `signUp` has just sent the first email
 * and Supabase would refuse a second one inside its interval.
 */
function ConfirmSent({ email, onBack }: { email: string; onBack: () => void }) {
  const t = useStrings()
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const resend = async () => {
    setError(null)
    setSecondsLeft(RESEND_COOLDOWN_SECONDS)
    if (await resendConfirmation(email)) setToast(t.resentToast)
    else setError(t.somethingWentWrong)
  }

  return (
    <View className="items-center pt-12">
      <View className="border-border-strong bg-secondary mb-5 h-14 w-14 items-center justify-center rounded-full">
        <Icon as={Check} size={22} strokeWidth={2.2} className="text-foreground" />
      </View>

      <Text className="text-title text-foreground font-semibold">{t.checkYourMail}</Text>
      <Text className="text-body-sm text-muted-foreground mt-2.5 text-center leading-6">
        {t.confirmSentTemplate.replace('{email}', email)}
      </Text>

      <Button
        size="cta"
        className="mt-6 w-full"
        disabled={secondsLeft > 0}
        onPress={() => void resend()}
      >
        <Text className="text-subtitle font-semibold">
          {secondsLeft > 0
            ? t.resendInTemplate.replace('{seconds}', String(secondsLeft))
            : t.resendConfirmation}
        </Text>
      </Button>
      {error ? <Text className="text-label text-destructive mt-2">{error}</Text> : null}

      <Pressable
        className="mt-1.5 min-h-11 items-center justify-center"
        onPress={onBack}
        role="button"
      >
        <Text className="text-label text-muted-foreground">{t.returnToLogin}</Text>
      </Pressable>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}
