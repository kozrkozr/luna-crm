import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useSession } from '../src/features/auth/useSession'
import { Starfield } from '../src/components/Starfield'

/**
 * Entry point: send a signed-in user to the app surface, everyone else to
 * registration (US-001).
 *
 * Note what is NOT decided here. US-013 AC-1 says a returning user lands on
 * "their shoot list (if a shoot creator) or their own schedule (if a
 * self-registered crew member)" — but nothing in the data model distinguishes
 * those two, since `role` is a profession and any registered user may create a
 * shoot (ADR-001, ADR-002). US-009, which would provide the schedule, is a
 * `should` and may be cut. So everyone goes to the shoot list until that rule
 * is specified. Raised in docs/open-questions.md.
 */
export default function Index() {
  const session = useSession()

  if (session.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Starfield />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return session.status === 'signedIn' ? (
    <Redirect href="/(app)/(tabs)" />
  ) : (
    <Redirect href="/(auth)/login" />
  )
}
