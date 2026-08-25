import { supabase } from '../../lib/supabase/client'
import type { Role } from '../../i18n/uk'

export type RegistrationInput = {
  name: string
  email: string
  password: string
  role: Role
  socialHandle?: string
}

export type RegistrationResult = { ok: true } | { ok: false; reason: 'failed' }

/**
 * US-001 AC-1 — create the account with its role and return a live session, so
 * the caller can land on the (empty) shoot list.
 *
 * Profile fields travel as auth metadata; the on_auth_user_created trigger
 * writes public.users in the same transaction as the auth user, so there is no
 * window where an account exists without its name and role.
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
      },
    },
  })

  if (error) return { ok: false, reason: 'failed' }
  return { ok: true }
}
