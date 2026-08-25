import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { Role } from '../../i18n/uk'

export type Profile = {
  name: string
  email: string
  phone: string | null
  role: Role | string
  socialHandle: string | null
}

export type ProfileState =
  | { status: 'loading' }
  | { status: 'loaded'; profile: Profile }
  | { status: 'error' }

/**
 * US-016 — the signed-in user's own profile row.
 *
 * RLS restricts this to `auth.uid() = id`, so no filter is needed here and none
 * can be forgotten: the query cannot return anyone else's row.
 */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    void (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('name, email, phone, role, social_handle')
        .maybeSingle()

      if (!active) return

      if (error || !data) {
        setState({ status: 'error' })
        return
      }

      setState({
        status: 'loaded',
        profile: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          socialHandle: data.social_handle,
        },
      })
    })()

    return () => {
      active = false
    }
  }, [])

  return state
}
