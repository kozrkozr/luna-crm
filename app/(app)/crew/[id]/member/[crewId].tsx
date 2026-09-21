import { Stack, useLocalSearchParams } from 'expo-router'
import { useStrings } from '../../../../../src/i18n/LanguageProvider'
import { CrewMemberView } from '../../../../../src/features/links/CrewMemberView'

/**
 * `/(app)/crew/{id}/member/{crewId}` — a peer's record, for a crew member
 * reading from inside the app (`US-023`, reached through `US-009`).
 *
 * The link surface's `/s/{token}/crew/{crewId}` renders the same component. The
 * person is found in the payload this reader already resolves to, so "only
 * people on your own shoot" is enforced by the gateway here exactly as it is
 * there — this route adds a header and nothing else.
 */
export default function CrewMemberInAppScreen() {
  const t = useStrings()
  const { id, crewId } = useLocalSearchParams<{ id?: string; crewId?: string }>()

  return (
    <>
      <Stack.Screen options={{ title: t.peerDetailsTitle, headerLargeTitle: false }} />
      <CrewMemberView shootId={id} crewId={crewId} />
    </>
  )
}
