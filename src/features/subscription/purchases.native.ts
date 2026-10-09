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
  } else {
    await Purchases.logIn(userId)
  }
  configuredFor = userId
}

export const purchasesAvailable = Boolean(API_KEY)
