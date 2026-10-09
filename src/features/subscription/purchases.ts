/**
 * Web — no purchases (`ADR-023`: the subscription is the iOS app). The link
 * surface is exported from this same codebase, so the native SDK must not be
 * imported here; `purchases.native.ts` is the real one.
 */
export async function identifyPurchaser(_userId: string): Promise<void> {}

export const purchasesAvailable = false
