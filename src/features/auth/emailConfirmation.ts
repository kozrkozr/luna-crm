import { supabase } from '../../lib/supabase/client'
import { appRedirectUrl } from './authLink'

/**
 * `ADR-019` — the signup confirmation email, and sending it again.
 *
 * `US-001` AC-1 (amended 2026-09-29) puts a confirmation step between
 * registering and the shoot list; AC-3 lets someone who never opened the email
 * ask for it again from the login form.
 *
 * **Local Supabase does not confirm** (`enable_confirmations = false` in
 * supabase/config.toml — the acceptance suites sign up and expect a session),
 * so locally none of this is reached: `signUp` answers with a session and the
 * form goes straight in. Production has «Confirm email» on.
 */

/** `lunashoots://confirm` on a device — see `appRedirectUrl`. */
export function confirmRedirectUrl(): string {
  return appRedirectUrl('confirm')
}

/**
 * Seconds before the email can be sent again.
 *
 * Supabase's hosted default for «Minimum interval between emails» is 60 s, and
 * the first email went out with `signUp` itself — so a resend offered sooner
 * would be refused by the server. The countdown makes that limit visible
 * rather than something the reader hits.
 */
export const RESEND_COOLDOWN_SECONDS = 60

/**
 * Send the confirmation email again.
 *
 * Unlike recovery, the result is reported: this is only ever offered to someone
 * who has just registered or just logged in with the right password, so there
 * is no address to protect from enumeration here.
 */
export async function resendConfirmation(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: confirmRedirectUrl() },
  })
  if (error && __DEV__) console.warn('[confirm] resend failed:', error.code, error.message)
  return !error
}
