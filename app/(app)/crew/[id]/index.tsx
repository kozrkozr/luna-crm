import { Stack, useLocalSearchParams } from 'expo-router'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { ShootLinkView } from '../../../../src/features/links/ShootLinkView'

/**
 * `/(app)/crew/{id}` — a shoot the signed-in user is ON, opened from their own
 * schedule (`US-009`, owner 2026-09-21).
 *
 * ── Why this route exists ──────────────────────────────────────────────────
 *
 * `my_crew_shoots` has listed these shoots since `20260827100000`, but opening
 * one meant opening the crew link — and a link only exists once the
 * photographer has tapped «копіювати посилання» for that person. A crew member
 * nobody had sent a link to could see the row on their calendar and nothing
 * behind it, and had no way to answer `US-008`'s invitation at all. Now the row
 * always opens, and the account is the credential.
 *
 * **The same view the link gives, and deliberately not the creator's screen.**
 * `shoots_select_own` restricts the table to its creator, and widening it would
 * hand a crew member `client_name` and the rest of the row — the reasoning is
 * written out in `my_crew_shoots`'s migration. So this asks the gateway, which
 * is the one component allowed to read across shoots and the one place the
 * audience split is made (`ADR-013`).
 *
 * It keeps the navigator's header, which is the one thing the link surface does
 * not have: there, the page IS the destination and a back chevron would have
 * nowhere to go; here the reader arrived from their calendar and needs the way
 * back. The view drops its own product bar to make room — see `isLink`.
 */
export default function CrewShootScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id?: string }>()

  return (
    <>
      {/* «Деталі зйомки» — the app's own name for this screen, already in both
          dictionaries. `headerLargeTitle` off: the view below opens on a dated
          hero card, and a large title above it pushes the answer off-screen. */}
      <Stack.Screen options={{ title: t.shootDetailTitle, headerLargeTitle: false }} />
      <ShootLinkView shootId={id} />
    </>
  )
}
