import { useLocalSearchParams } from 'expo-router'
import { ShootLinkView } from '../../../src/features/links/ShootLinkView'

/**
 * `/s/{token}` — the anonymous link view, `US-007` (crew) and `US-010`
 * (client).
 *
 * The screen itself is `ShootLinkView`, shared since 2026-09-21 with the
 * in-app route a registered crew member reaches from their schedule
 * (`US-009`, `/(app)/crew/{id}`). Two entrances, one rendering: the gateway
 * builds the same payload for both, so a second copy of this screen would only
 * be a second place for `ADR-013`'s audience split to drift.
 *
 * The route stays a route — it holds the URL and nothing else. In particular it
 * draws no header: this surface has no navigator around it (`ADR-012` exports
 * it to static web) and the view carries its own product bar.
 */
export default function LinkViewScreen() {
  // Undefined during prerender and on the first client paint. Passed through as
  // it is — S-2 F-2 makes the wait the view's business, not the route's.
  const { token } = useLocalSearchParams<{ token?: string }>()
  return <ShootLinkView token={token} />
}
