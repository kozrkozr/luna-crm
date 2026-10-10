/** `US-051` — the plan the paywall shows, and what buying or restoring came to. */
export type Offer = {
  /** The store product id — `com.lunashoots.ios.base.monthly`. */
  id: string
  /** Apple's own localized price for the storefront — never a hard-coded amount (Guideline 3.1.2). */
  priceString: string
  /** Whether this Apple ID still gets the free trial (AC-6). */
  trial: boolean
  /** The RevenueCat package, opaque outside `purchases.native.ts`. */
  pkg: unknown
}

export type BuyResult = 'bought' | 'cancelled' | 'failed' | 'otherAccount'
export type RestoreResult = 'restored' | 'none' | 'failed' | 'otherAccount'
