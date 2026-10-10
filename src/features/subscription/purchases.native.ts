import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases'
import type { BuyResult, Offer, RestoreResult } from './offer'

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

/**
 * `US-051` — the plan on offer, read from RevenueCat's current offering, never
 * from code (`ADR-023` decision 9). One package today; the paywall's plan card
 * is a row so a second one is a second row.
 *
 * `trial` is whether THIS Apple ID still gets the 14 days (AC-6): Apple grants
 * the introductory offer once per Apple ID per subscription group. Asked of the
 * store; when it cannot say, the product carrying an intro price decides —
 * which is also all the Test Store reports (`S-7` F-4).
 */
export async function loadOffer(): Promise<Offer | null> {
  if (!API_KEY) return null
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages[0]
  if (!pkg) return null
  const product = pkg.product
  let trial = product.introPrice !== null
  /*
    The App Store is asked; the Test Store (dev builds, `test_…` key) is not.
    StoreKit's eligibility check knows nothing of the Test Store's simulated
    purchases and answered "ineligible" for a brand-new account on the device
    (2026-10-10), while the Test Store itself offers the intro only to a
    customer who has not used it (`S-7` F-4) — so there the product decides.
  */
  if (trial && !API_KEY.startsWith('test_')) {
    try {
      const status = (await Purchases.checkTrialOrIntroductoryPriceEligibility([product.identifier]))[
        product.identifier
      ]?.status
      if (__DEV__) console.log(`[US-051] intro eligibility for ${product.identifier}: ${status}`)
      if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) trial = false
      if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS) trial = false
    } catch {
      // Unknown — keep what the product says.
    }
  }
  if (__DEV__) console.log(`[US-051] offer ${product.identifier} ${product.priceString} trial=${trial}`)
  return { id: product.identifier, priceString: product.priceString, trial, pkg }
}

const hasAccessIn = (info: CustomerInfo) => Object.keys(info.entitlements.active).length > 0

/** The two codes RevenueCat uses for a receipt already owned by another customer. */
const OWNED_ELSEWHERE = new Set<string>([
  PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR,
  PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR,
])

/** `US-051` AC-3, AC-4, AC-7, AC-10. */
export async function buy(offer: Offer): Promise<BuyResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(offer.pkg as PurchasesPackage)
    return hasAccessIn(customerInfo) ? 'bought' : 'failed'
  } catch (e: any) {
    if (e?.userCancelled || e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled'
    if (OWNED_ELSEWHERE.has(e?.code)) return 'otherAccount'
    // Ask to Buy waits for a parent: nothing is bought yet (AC-7).
    return 'failed'
  }
}

/** `US-051` AC-8, AC-9, AC-10. */
export async function restore(): Promise<RestoreResult> {
  try {
    return hasAccessIn(await Purchases.restorePurchases()) ? 'restored' : 'none'
  } catch (e: any) {
    if (OWNED_ELSEWHERE.has(e?.code)) return 'otherAccount'
    return 'failed'
  }
}
