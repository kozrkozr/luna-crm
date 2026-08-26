import { useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/components/ui/select'
import { Text } from '../../src/components/ui/text'
import { ROLES_UK, uk, type Role } from '../../src/i18n/uk'
import { register } from '../../src/features/auth/register'

/**
 * US-001 — register an account and select a professional role.
 *
 * Field list and layout follow the gated prototype's register screen
 * (docs/product/prototype/index.html, screenAuth): name, email, password, role,
 * optional social handle. The credential is email + password (ADR-015), which
 * is why the email field is not the prototype's «Email або телефон» — that
 * label predates the ADR.
 *
 * The "already have an account?" link arrived with US-013.
 */
export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [social, setSocial] = useState('')

  const [roleError, setRoleError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    // AC-2 — blocked without a role, inline message, and NO account created.
    // Checked before the network call for exactly that reason.
    if (!role) {
      setRoleError(true)
      setFormError(null)
      return
    }
    setRoleError(false)
    setFormError(null)
    setSubmitting(true)

    const result = await register({
      name,
      email,
      password,
      role,
      socialHandle: social,
    })

    setSubmitting(false)

    if (!result.ok) {
      setFormError(
        result.reason === 'weakPassword'
          ? uk.passwordTooShort
          : result.reason === 'emailTaken'
            ? uk.emailTaken
            : uk.registrationFailed
      )
      return
    }

    // AC-1 — land on the (empty) shoot list. `replace`, not `push`: registration
    // must not remain on the back stack.
    router.replace('/(app)')
  }

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 p-4">
        <Label htmlFor="name">{uk.name}</Label>
        <Input
          id="name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder={uk.namePlaceholder}
        />

        <Label htmlFor="email">{uk.email}</Label>
        <Input
          id="email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Label htmlFor="password">{uk.password}</Label>
        <Input
          id="password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
        />
        {/*
          The rule is stated up front. Supabase enforces a minimum
          (config.toml, minimum_password_length) and the backlog specifies none,
          so a user could otherwise only discover it by being rejected.
        */}
        <Text className="text-muted-foreground text-xs">{uk.passwordHint}</Text>

        <Label htmlFor="role">{uk.role}</Label>
        {/*
          The role picker is the one control the ADR-016 swap changes visibly.

          Before ADR-016 it adapted into a bottom sheet on touch devices. RNR
          has no sheet adapter: its Select renders an anchored popover through
          @rn-primitives/portal on every platform. Same control, same options,
          same copy — different presentation, and nothing in US-001 specifies
          which. Recorded rather than worked around: building a sheet by hand
          would be a redesign, and choosing one is not this task's call.

          `insets` keeps the popover clear of the notch and home indicator;
          RNR's Select needs them passed explicitly.
        */}
        <Select
          value={role ? { value: role, label: role } : undefined}
          onValueChange={(option) => {
            if (!option) return
            setRole(option.value as Role)
            setRoleError(false)
          }}
        >
          <SelectTrigger id="role" className="w-full">
            <SelectValue placeholder={uk.rolePlaceholder} />
          </SelectTrigger>
          <SelectContent
            insets={{
              top: insets.top,
              bottom: Platform.select({ ios: insets.bottom, android: insets.bottom + 24 }) ?? 0,
              left: 12,
              right: 12,
            }}
            className="w-full"
          >
            <SelectGroup>
              {ROLES_UK.map((roleName) => (
                <SelectItem key={roleName} label={roleName} value={roleName}>
                  {roleName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {roleError ? <Text className="text-destructive text-sm">{uk.roleRequired}</Text> : null}

        <Label htmlFor="social">{uk.social}</Label>
        <Input
          id="social"
          value={social}
          onChangeText={setSocial}
          autoCapitalize="none"
          placeholder="@..."
        />

        {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

        <View className="mt-4 gap-2">
          <Button disabled={submitting} onPress={submit}>
            <Text>{uk.registerBtn}</Text>
          </Button>
          <Button variant="ghost" onPress={() => router.replace('/(auth)/login')}>
            <Text>{uk.toLogin}</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}
