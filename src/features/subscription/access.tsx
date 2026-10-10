import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase/client'
import { onPurchasesChanged } from './purchases'

/**
 * `US-052` — whether the signed-in account has access, read from the server.
 *
 * The answer is the database's (`ADR-023` decision 7): the rows the RevenueCat
 * webhook writes to `account_access`, and the same rule `has_access()` applies
 * — any row whose `expires_at` is still ahead (`S-7` F-2). The SDK's own view is
 * never used for it; a purchase only prompts a re-read.
 *
 * Re-read on mount, when the app returns to the foreground, the moment the
 * current access runs out, and after RevenueCat reports a change. After a
 * change the app first asks the server to sync the account from RevenueCat
 * (`revenuecat-sync`), because the webhook can land a minute later (`S-7` F-3,
 * and once on the device); polling covers that call failing.
 */
/**
 * `US-053` AC-1, AC-5 — what the account's access is, for the «Підписка»
 * screen and its profile row. Derived from the same live rows as `hasAccess`.
 * `beta` arrives with `US-055`.
 */
export type SubscriptionStatus =
  | { kind: 'trial'; until: string }
  | { kind: 'active'; until: string }
  /** Cancelled in Apple's settings, still running (AC-5). `trial` — a cancelled trial (`US-054` AC-2). */
  | { kind: 'wontRenew'; until: string; trial: boolean }
  | { kind: 'none' }

type AccessValue = {
  /** `null` while the first read is in flight. */
  subscription: SubscriptionStatus | null
  /**
   * `null` while the first read is in flight. Treated as access by `useGuard`,
   * so nothing flashes the paywall on launch; the database still refuses a
   * write that should not happen.
   */
  hasAccess: boolean | null
  refresh: () => Promise<void>
  /**
   * Asks the server to record what RevenueCat holds for this account now, then
   * re-reads — `US-051` calls it after a purchase or restore, before closing
   * the paywall (AC-3).
   */
  syncNow: () => Promise<void>
}

const AccessContext = createContext<AccessValue>({
  subscription: null,
  hasAccess: null,
  refresh: async () => {},
  syncNow: async () => {},
})

/** How long, and how often, to look for the webhook's row after a purchase. */
const AFTER_PURCHASE_MS = 30_000
const AFTER_PURCHASE_EVERY_MS = 2_000

export function AccessProvider({ children }: { children: ReactNode }) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const hasAccessRef = useRef<boolean | null>(null)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('account_access')
      .select('expires_at, period_type, will_renew')
    if (error) return
    const now = Date.now()
    const live = (data ?? []).filter((r) => r.expires_at === null || Date.parse(r.expires_at) > now)
    const next = live.length > 0
    hasAccessRef.current = next
    setHasAccess(next)
    setSubscription(statusOf(live))
    // The soonest moment the answer can change on its own; null = never.
    const ends = live.map((r) => (r.expires_at === null ? Infinity : Date.parse(r.expires_at)))
    const soonest = ends.length > 0 ? Math.min(...ends) : Infinity
    setExpiresAt(Number.isFinite(soonest) ? soonest : null)
  }, [])

  const syncNow = useCallback(async () => {
    await supabase.functions.invoke('revenuecat-sync', { method: 'POST' })
    await refresh()
  }, [refresh])

  useEffect(() => {
    void refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  // The trial or the subscription runs out while the app is open.
  useEffect(() => {
    if (expiresAt === null) return
    const delay = Math.max(0, expiresAt - Date.now()) + 1000
    // setTimeout overflows past ~24.8 days; the foreground re-read covers longer.
    if (delay > 2 ** 31 - 1) return
    const id = setTimeout(() => void refresh(), delay)
    return () => clearTimeout(id)
  }, [expiresAt, refresh])

  // A purchase or restore: poll until the webhook's row arrives, or give up.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const unsubscribe = onPurchasesChanged(() => {
      stop()
      const started = Date.now()
      // Ask the server to record the purchase now (AC-7) rather than wait for
      // the webhook; the polling below is the fallback if that call fails.
      void syncNow()
      timer = setInterval(() => {
        if (hasAccessRef.current || Date.now() - started > AFTER_PURCHASE_MS) return stop()
        void refresh()
      }, AFTER_PURCHASE_EVERY_MS)
    })
    return () => {
      stop()
      unsubscribe()
    }
  }, [refresh, syncNow])

  return <AccessContext.Provider value={{ subscription, hasAccess, refresh, syncNow }}>{children}</AccessContext.Provider>
}

export function useAccess(): AccessValue {
  return useContext(AccessContext)
}

/**
 * `US-052` AC-2 — wraps a create, edit or delete action: with access it runs,
 * without it the paywall opens instead and nothing is changed.
 *
 *   const guard = useGuard()
 *   <Button onPress={guard(() => router.push('/(app)/new-shoot'))} />
 */
export function useGuard() {
  const { hasAccess } = useAccess()
  const router = useRouter()
  return useCallback(
    <A extends unknown[]>(action: (...args: A) => void) =>
      (...args: A) => {
        if (hasAccess === false) router.push('/(app)/paywall')
        else action(...args)
      },
    [hasAccess, router]
  )
}

/**
 * The live row that runs longest decides. `will_renew` is read only while the
 * row is live — after a lapse it can still say true (`S-7` F-2).
 */
function statusOf(
  live: { expires_at: string | null; period_type: string; will_renew: boolean }[]
): SubscriptionStatus {
  if (live.length === 0) return { kind: 'none' }
  const row = [...live].sort(
    (a, b) => (b.expires_at ? Date.parse(b.expires_at) : Infinity) - (a.expires_at ? Date.parse(a.expires_at) : Infinity)
  )[0]
  const until = row.expires_at ?? ''
  if (!row.will_renew) return { kind: 'wontRenew', until, trial: row.period_type === 'trial' }
  return row.period_type === 'trial' ? { kind: 'trial', until } : { kind: 'active', until }
}
