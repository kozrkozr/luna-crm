import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import { Platform } from 'react-native'
import { supabase } from '../../lib/supabase/client'

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
 * Where the emailed link lands.
 *
 * **`Linking.createURL('/reset')` was wrong on native and failed silently.**
 * Measured against a real recovery email on 2026-09-28. Its assembly step is
 * `` `${scheme}:/${hostUri}${path}` ``, and `hostUri` is not empty the way the
 * old comment here assumed:
 *
 * - release build → `lunashoots:///reset` — three slashes, not two
 * - dev build → `lunashoots:///192.168.x.x:8081/reset`, carrying Metro's address
 *
 * Neither matches an allow-list entry of `lunashoots://reset`, and **Supabase
 * does not report a rejected `redirect_to`** — it quietly substitutes Site URL.
 * The symptom is a recovery link that opens Safari on the site instead of the
 * app, with nothing anywhere saying why.
 *
 * So native now builds the URL itself, and only the web keeps `createURL` —
 * there it correctly yields `https://<origin>/reset`, which is what the web
 * surface needs.
 *
 * The scheme is read from the Expo config rather than typed here, so
 * `app.config.ts` stays the one place it is defined.
 *
 * **This URL must be allow-listed or Supabase refuses to send.** Locally that
 * is `additional_redirect_urls` in supabase/config.toml; on the hosted project
 * it is Authentication → URL Configuration.
 */
export function resetRedirectUrl(): string {
  if (Platform.OS === 'web') return Linking.createURL('/reset')

  const scheme = Constants.expoConfig?.scheme
  const resolved = Array.isArray(scheme) ? scheme[0] : scheme
  // Falling back to createURL keeps recovery working even in a build with no
  // scheme, at the cost of needing the wildcard entry in the allow-list.
  return resolved ? `${resolved}://reset` : Linking.createURL('/reset')
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
 * Turn the tokens the recovery link carries into a session, so the new password
 * can be set.
 *
 * The client is created with `detectSessionInUrl: false`
 * (src/lib/supabase/client.ts), so nothing parses the link for us — which is
 * right on native, where there is no URL bar to parse, and means the tokens
 * have to be handed over explicitly here.
 *
 * Supabase sends one of two shapes depending on the project's flow: an implicit
 * link carrying `access_token` + `refresh_token`, or a PKCE link carrying a
 * `token_hash`. Both are handled — the shape is the project's setting, not
 * something this app chooses, and getting it wrong is silent.
 */
export async function establishRecoverySession(params: {
  accessToken?: string
  refreshToken?: string
  tokenHash?: string
}): Promise<boolean> {
  if (params.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: params.tokenHash,
    })
    if (error && __DEV__) console.warn('[recovery] verifyOtp failed:', error.code, error.message)
    return !error
  }

  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    })
    if (error && __DEV__) console.warn('[recovery] setSession failed:', error.code, error.message)
    return !error
  }

  return false
}

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
