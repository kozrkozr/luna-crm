import { AuthScreen } from '../../src/features/auth/AuthScreen'

/**
 * `US-013`. The screen itself is shared with `register` — ADR-017's mockup puts
 * both behind one segmented control, and the whole of the form lives in
 * `AuthScreen`.
 *
 * This route survives as a route because things point at it: `RequireSession`
 * redirects here, and every acceptance suite's `login()` helper navigates to
 * `/login`. Switching tabs on the screen is state, not navigation, so nothing
 * routes to `/register` in normal use — it stays reachable rather than removed.
 */
export default function LoginRoute() {
  return <AuthScreen initialMode="login" />
}
