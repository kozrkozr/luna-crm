import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedIn'; session: Session }
  | { status: 'signedOut' }

/**
 * Three states, not two — the same shape S-2's F-2 argued for on the link
 * surface, and for the same reason: "no session" must mean *checked and
 * absent*, never *not looked yet*. Collapsing `loading` into `signedOut` would
 * bounce a signed-in user to registration for as long as the stored session
 * takes to read.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setState(data.session ? { status: 'signedIn', session: data.session } : { status: 'signedOut' })
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut' })
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return state
}
