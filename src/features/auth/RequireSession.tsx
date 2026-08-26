import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useSession } from './useSession'

/**
 * US-017 AC-2 — a signed-out user reaching an account screen is sent to login,
 * "not shown stale account data".
 *
 * The guard wraps the whole `(app)` group rather than each screen, so a screen
 * added by a later story is covered by default instead of by remembering.
 *
 * `loading` renders a spinner rather than either destination. Treating "not
 * checked yet" as signed-out would bounce a signed-in user to login on every
 * cold start; treating it as signed-in would render account chrome before the
 * session is known, which is the stale data AC-2 forbids.
 */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const session = useSession()

  if (session.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (session.status === 'signedOut') {
    return <Redirect href="/(auth)/login" />
  }

  return <>{children}</>
}
