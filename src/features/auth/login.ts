import { supabase } from '../../lib/supabase/client'

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalidCredentials' | 'emailNotConfirmed' }

/**
 * US-013 — sign in with the credential ADR-015 settled on: email and password.
 *
 * Every failure is reported as `invalidCredentials`. AC-2 asks for "a clear
 * message" on incorrect credentials, and distinguishing "no such account" from
 * "wrong password" would tell an attacker which emails are registered — a
 * distinction no story asks for.
 *
 * The one exception is `emailNotConfirmed` (`US-001` AC-3, `ADR-019`).
 * Supabase returns it only for the right password, so it tells the reader
 * nothing they did not already prove, and collapsing it would show «Невірний
 * email або пароль» to someone whose password is correct — the trap
 * `docs/deploy-dev.md` records as looking exactly like a bug.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error?.code === 'email_not_confirmed') return { ok: false, reason: 'emailNotConfirmed' }
  if (error) return { ok: false, reason: 'invalidCredentials' }
  return { ok: true }
}
