import { supabase } from '../../lib/supabase/client'
import { appRedirectUrl } from './authLink'

/**
 * `Auth.dc.html`'s «Відновлення пароля» flow (owner, 2026-08-31).
 *
 * **No story covers this.** `US-013` is login; nothing in the backlog describes
 * recovery. «Забули пароль?» has been on the screen and inert since the first
 * auth pass (redesign-log A-2) and the owner asked for it to be real.
 *
 * **Email only, and that is not a limitation of this file.** `ADR-015` makes
 * email the credential and the owner reaffirmed it on 2026-08-31; there is no
 * SMS provider and `[auth.sms] enable_signup` is false, so a phone number has
 * nowhere to receive a link.
 */

/**
 * Where the emailed link lands — `lunashoots://reset` on a device. The reasons
 * it is not `Linking.createURL('/reset')` are in `appRedirectUrl`.
 */
export function resetRedirectUrl(): string {
  return appRedirectUrl('reset')
}

export type ResetRequestResult = { ok: true } | { ok: false }

/**
 * Ask Supabase to email a recovery link.
 *
 * **Success is not proof the address exists**, and that is deliberate:
 * `resetPasswordForEmail` answers the same way for a registered address and an
 * unknown one. Reporting the difference would tell an attacker which emails
 * have accounts — the same reasoning `login` gives for collapsing all its
 * failures into one. So the «Перевірте пошту» screen is shown either way.
 */
export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: resetRedirectUrl(),
  })

  if (error && __DEV__) {
    // Keep the cause visible while developing — a deliberately vague UI must
    // not also mean a vague log. A rejected redirect URL surfaces here.
    console.warn('[passwordReset] request failed:', error.code, error.message)
  }
  // Reported as success regardless, for the reason above. A genuine transport
  // failure is indistinguishable from an unknown address to the caller, which
  // is the point.
  return { ok: true }
}

export type ResetCompletion =
  | { ok: true }
  | { ok: false; reason: 'linkInvalid' | 'weakPassword' | 'failed' }

/**
 * Set the new password on the session the recovery link established.
 *
 * Fails with `linkInvalid` when there is no session — which is what an expired
 * or already-used link looks like from here, and is the case worth naming: the
 * reader has to request a new one, and "try again" would be advice that cannot
 * succeed.
 */
export async function setNewPassword(password: string): Promise<ResetCompletion> {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return { ok: false, reason: 'linkInvalid' }

  const { error } = await supabase.auth.updateUser({ password })
  if (!error) return { ok: true }

  if (__DEV__) console.warn('[passwordReset] update failed:', error.code, error.message)

  const code = error.code ?? ''
  if (code === 'weak_password' || error.message.toLowerCase().includes('password should be at least')) {
    return { ok: false, reason: 'weakPassword' }
  }
  return { ok: false, reason: 'failed' }
}
