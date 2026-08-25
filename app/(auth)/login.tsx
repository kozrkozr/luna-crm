import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Button, Form, Input, Label, ScrollView, SizableText, Theme, YStack } from 'tamagui'
import { uk } from '../../src/i18n/uk'
import { login } from '../../src/features/auth/login'

/**
 * US-013 — log in to an existing account.
 *
 * AC-1 says a returning user lands on "their shoot list (if a shoot creator) or
 * their own schedule (if a self-registered crew member)". Only the first branch
 * is reachable: the schedule is US-009, a `should` that has not been built and
 * may be cut, and nothing in the data model distinguishes the two kinds of user
 * anyway — `role` is a profession, and any registered user may create a shoot
 * (ADR-001, ADR-002). So everyone lands on the shoot list.
 *
 * That is a consequence of what exists, not a decision taken here. See
 * docs/open-questions.md item 3.
 */
export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)

    // AC-2 — rejected with a clear message, and no account is entered.
    if (!result.ok) {
      setError(uk.wrongCreds)
      return
    }

    router.replace('/(app)')
  }

  return (
    <ScrollView
      bg="$background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Form onSubmit={submit} p="$4" gap="$2">
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
          autoComplete="current-password"
        />

        {error ? (
          <Theme name="red">
            <SizableText size="$2" color="$color11">
              {error}
            </SizableText>
          </Theme>
        ) : null}

        <YStack gap="$2" mt="$4">
          <Form.Trigger asChild disabled={submitting}>
            <Button theme="accent" size="$4">
              {uk.loginBtn}
            </Button>
          </Form.Trigger>
          <Button size="$4" chromeless onPress={() => router.replace('/(auth)/register')}>
            {uk.toRegister}
          </Button>
        </YStack>
      </Form>
    </ScrollView>
  )
}
