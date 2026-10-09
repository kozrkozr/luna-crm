import Purchases, { LOG_LEVEL } from 'react-native-purchases'

/**
 * S-7 — RevenueCat in the app (`ADR-023` decision 10).
 *
 * The RevenueCat customer **is** the Luna account: configured with the
 * account's id, never anonymously, so a purchase belongs to the account and the
 * webhook can find it by `app_user_id` (`supabase/functions/revenuecat-webhook`).
 *
 * The key is per environment, baked at build time: `.env.dev` holds the Test
 * Store key (`test_…`, purchases simulated by RevenueCat, no Apple needed),
 * `.env.prod` the App Store key (`appl_…`).
 */
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY

let configuredFor: string | null = null

export async function identifyPurchaser(userId: string): Promise<void> {
  if (!API_KEY || configuredFor === userId) return
  if (configuredFor === null) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG)
    Purchases.configure({ apiKey: API_KEY, appUserID: userId })
    Purchases.addCustomerInfoUpdateListener(() => listeners.forEach((l) => l()))
  } else {
    await Purchases.logIn(userId)
  }
  configuredFor = userId
}

export const purchasesAvailable = Boolean(API_KEY)

/**
 * Calls back whenever RevenueCat reports a change to the customer — a purchase,
 * a restore, a renewal noticed on launch. The app does not trust it for access
 * (`ADR-023` decision 7); it is the cue to re-read `account_access`.
 *
 * Callers may subscribe before `identifyPurchaser` has configured the SDK (the
 * access provider mounts beside `PurchasesHost`), so callbacks are kept here and
 * the SDK listener is attached once, on configure.
 */
const listeners = new Set<() => void>()

export function onPurchasesChanged(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
