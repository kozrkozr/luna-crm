import { supabase } from '../../lib/supabase/client'
import type { Role } from '../../i18n/uk'

export type RegistrationInput = {
  name: string
  email: string
  password: string
  /**
   * `US-001` AC-2's role. Typed as `Role` no longer — «Інша роль» (owner,
   * 2026-08-31) lets a reader type their own, and `users.role` is a text
   * column. The glossary's five stay the offered set; they are no longer the
   * only possible values, which `US-001` and the glossary both need to record.
   */
  role: string
  socialHandle?: string
  /** `20260831100000` — a second handle beside `socialHandle` (Instagram). */
  telegram?: string
  /**
   * Optional, and not really a profile field at all — it is the second
   * crew-matching key (`match_contact_to_user`, migration `20260827100000`).
   *
   * `ADR-015` made the phone optional on the account and required on the
   * add-crew form for exactly this reason: someone added by phone alone has no
   * other way to be recognised. Nothing collected it here until 2026-09-07, so
   * `users.phone` was null at the only moment the signup trigger looks and the
   * match could only ever fire on email (`docs/open-questions.md` #24).
   */
  phone?: string
}

export type RegistrationFailure = 'weakPassword' | 'emailTaken' | 'failed'
export type RegistrationResult = { ok: true } | { ok: false; reason: RegistrationFailure }

/**
 * US-001 AC-1 — create the account with its role and return a live session, so
 * the caller can land on the (empty) shoot list.
 *
 * Profile fields travel as auth metadata; the on_auth_user_created trigger
 * writes public.users in the same transaction as the auth user, so there is no
 * window where an account exists without its name and role.
 *
 * Failures are classified rather than collapsed into one. The first version
 * returned a single generic reason, which meant a rejected password showed
 * "try again" — advice that could never succeed, since retrying the same short
 * password fails identically. The backlog specifies copy only for AC-2's
 * missing role, so the strings for these cases are placeholders
 * (docs/open-questions.md items 1 and 2).
 */
export async function register(input: RegistrationInput): Promise<RegistrationResult> {
  const { error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        name: input.name.trim(),
        role: input.role,
        social_handle: input.socialHandle?.trim() || null,
        telegram: input.telegram?.trim() || null,
        // Stored as typed. `normalise_phone` is applied at COMPARISON time on
        // both sides, so the column keeps whatever format the person uses —
        // the same rule `updateProfile` follows on this column.
        phone: input.phone?.trim() || null,
      },
    },
  })

  if (!error) return { ok: true }

  // Keep the underlying cause visible while developing: a generic message in
  // the UI must not also mean a generic message in the logs.
  if (__DEV__) console.warn('[register] signUp failed:', error.code, error.message)

  const code = error.code ?? ''
  const message = error.message.toLowerCase()

  if (code === 'weak_password' || message.includes('password should be at least')) {
    return { ok: false, reason: 'weakPassword' }
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return { ok: false, reason: 'emailTaken' }
  }
  return { ok: false, reason: 'failed' }
}
