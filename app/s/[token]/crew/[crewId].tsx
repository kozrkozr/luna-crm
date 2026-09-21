import { useLocalSearchParams } from 'expo-router'
import { CrewMemberView } from '../../../../src/features/links/CrewMemberView'

/**
 * `/s/{token}/crew/{crewId}` — one person's record, read through a link.
 *
 * `US-023` for the crew audience, `US-026` for the client's, and the difference
 * between them is the gateway's (`ADR-013`). The screen is `CrewMemberView`,
 * shared with `/(app)/crew/{id}/member/{crewId}` since 2026-09-21.
 */
export default function CrewMemberLinkScreen() {
  const { token, crewId } = useLocalSearchParams<{ token?: string; crewId?: string }>()
  return <CrewMemberView token={token} crewId={crewId} />
}
