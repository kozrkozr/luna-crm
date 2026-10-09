import { useEffect } from 'react'
import { useSession } from '../auth/useSession'
import { identifyPurchaser } from './purchases'

/**
 * S-7 — ties RevenueCat to the signed-in account. Mounted once inside the
 * signed-in group, beside `RemindersHost`. Renders nothing.
 *
 * Signing out needs nothing here: the next account to sign in is passed to
 * `logIn`, which switches the customer.
 */
export function PurchasesHost() {
  const session = useSession()
  const userId = session.status === 'signedIn' ? session.session.user.id : null

  useEffect(() => {
    if (userId) void identifyPurchaser(userId)
  }, [userId])

  return null
}
