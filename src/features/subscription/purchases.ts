import type { BuyResult, Offer, RestoreResult } from './offer'

/**
 * Web — no purchases (`ADR-023`: the subscription is the iOS app). The link
 * surface is exported from this same codebase, so the native SDK must not be
 * imported here; `purchases.native.ts` is the real one.
 */
export async function identifyPurchaser(_userId: string): Promise<void> {}

export const purchasesAvailable = false

export function onPurchasesChanged(_callback: () => void): () => void {
  return () => {}
}

export async function loadOffer(): Promise<Offer | null> {
  return null
}
export async function buy(_offer: Offer): Promise<BuyResult> {
  return 'failed'
}
export async function restore(): Promise<RestoreResult> {
  return 'failed'
}
