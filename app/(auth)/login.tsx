import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
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
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {/*
        The previous UI layer wrapped these fields in a Form that carried
        onSubmit and a submit trigger. RNR has no form primitive, so submission
        hangs off the button's onPress — the same single entry point, one
        indirection fewer.
      */}
      <View className="gap-2 p-4">
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

        {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

        <View className="mt-4 gap-2">
          <Button disabled={submitting} onPress={submit}>
            <Text>{uk.loginBtn}</Text>
          </Button>
          <Button variant="ghost" onPress={() => router.replace('/(auth)/register')}>
            <Text>{uk.toRegister}</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}
