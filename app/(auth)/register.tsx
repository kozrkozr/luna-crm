import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  Adapt,
  Button,
  Form,
  Input,
  Label,
  ScrollView,
  Select,
  Sheet,
  SizableText,
  Theme,
  YStack,
} from 'tamagui'
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
      setFormError(uk.registrationFailed)
      return
    }

    // AC-1 — land on the (empty) shoot list. `replace`, not `push`: registration
    // must not remain on the back stack.
    router.replace('/(app)')
  }

  return (
    <ScrollView
      bg="$background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Form onSubmit={submit} p="$4" gap="$2">
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

        <Label htmlFor="role">{uk.role}</Label>
        <Select
          id="role"
          value={role}
          onValueChange={(value) => {
            setRole(value as Role)
            setRoleError(false)
          }}
        >
          <Select.Trigger>
            <Select.Value placeholder={uk.rolePlaceholder} />
          </Select.Trigger>

          <Adapt when="maxMd" platform="touch">
            <Sheet modal dismissOnSnapToBottom snapPointsMode="fit">
              <Sheet.Frame>
                <Sheet.ScrollView>
                  <Adapt.Contents />
                </Sheet.ScrollView>
              </Sheet.Frame>
              <Sheet.Overlay />
            </Sheet>
          </Adapt>

          <Select.Content>
            <Select.Viewport>
              <Select.Group>
                {ROLES_UK.map((roleName, index) => (
                  <Select.Item key={roleName} index={index} value={roleName}>
                    <Select.ItemText>{roleName}</Select.ItemText>
                    <Select.ItemIndicator ml="auto">✓</Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>
          </Select.Content>
        </Select>

        {roleError ? (
          <Theme name="red">
            <SizableText size="$2" color="$color11">
              {uk.roleRequired}
            </SizableText>
          </Theme>
        ) : null}

        <Label htmlFor="social">{uk.social}</Label>
        <Input
          id="social"
          value={social}
          onChangeText={setSocial}
          autoCapitalize="none"
          placeholder="@..."
        />

        {formError ? (
          <Theme name="red">
            <SizableText size="$2" color="$color11">
              {formError}
            </SizableText>
          </Theme>
        ) : null}

        <YStack gap="$2" mt="$4">
          <Form.Trigger asChild disabled={submitting}>
            <Button theme="accent" size="$4">
              {uk.registerBtn}
            </Button>
          </Form.Trigger>
          <Button size="$4" chromeless onPress={() => router.replace('/(auth)/login')}>
            {uk.toLogin}
          </Button>
        </YStack>
      </Form>
    </ScrollView>
  )
}
