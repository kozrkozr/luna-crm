import { Redirect } from 'expo-router'

/**
 * Web — not a screen here: the web app shows no subscription and no
 * notification settings (`US-040` AC-6, AC-7; `ADR-024` decisions 4–5). A typed
 * or stale URL lands on the home screen. `paywall.tsx` is the iOS screen.
 */
export default function NotOnTheWeb() {
  return <Redirect href="/(app)/(tabs)" />
}
