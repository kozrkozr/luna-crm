import { AuthScreen } from '../../src/features/auth/AuthScreen'

/** `US-001`. The same screen as `login`, opened on the register tab. */
export default function RegisterRoute() {
  return <AuthScreen initialMode="register" />
}
