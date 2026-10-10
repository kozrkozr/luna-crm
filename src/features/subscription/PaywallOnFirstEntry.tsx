import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase/client'
import { useAccess } from './access'

/**
 * `US-051` AC-1 — the paywall, full screen, as the first thing the app shows to
 * someone who has just registered. AC-5 — and never again on its own.
 *
 * Waits for the server's answer on access: an account that already has it
 * (a restore on a new phone, say) is marked as shown and never sees it. One
 * that has none gets the paywall once; `users.paywall_shown_at` is what makes it
 * once per account rather than once per install (20261010140000).
 *
 * Mounted inside the signed-in group. Renders nothing.
 */
export function PaywallOnFirstEntry() {
  const router = useRouter()
  const { hasAccess } = useAccess()
  const done = useRef(false)

  useEffect(() => {
    if (hasAccess === null || done.current) return
    done.current = true
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return
      const { data } = await supabase.from('users').select('paywall_shown_at').maybeSingle()
      if (!data || data.paywall_shown_at) return
      const { error } = await supabase
        .from('users')
        .update({ paywall_shown_at: new Date().toISOString() })
        .eq('id', auth.user.id)
      // Not marked, not shown: a failed write would otherwise show it again
      // next launch, which is the worse of the two.
      if (error || hasAccess) return
      router.push('/(app)/paywall')
    })()
  }, [hasAccess, router])

  return null
}
