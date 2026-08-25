import { supabase } from '../../lib/supabase/client'

export type LoginResult = { ok: true } | { ok: false; reason: 'invalidCredentials' }

/**
 * US-013 — sign in with the credential ADR-015 settled on: email and password.
 *
 * Every failure is reported as `invalidCredentials`. AC-2 asks for "a clear
 * message" on incorrect credentials, and distinguishing "no such account" from
 * "wrong password" would tell an attacker which emails are registered — a
 * distinction no story asks for.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) return { ok: false, reason: 'invalidCredentials' }
  return { ok: true }
}
