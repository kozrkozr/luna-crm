import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Text } from '../../../../src/components/ui/text'
import { Card } from '../../../../src/components/ui/card'
import { ImageViewer } from '../../../../src/components/ImageViewer'
import { uk } from '../../../../src/i18n/uk'
import {
  resolveLink,
  type LinkClientCrewMember,
  type LinkCrewMember,
} from '../../../../src/features/links/gateway'

/**
 * One person's record, read through a link — the same URL for two audiences.
 *
 * `US-023` — a crew member reads a peer's complete record: name, role, contact,
 * Instagram and notes, "with nothing held back", in the layout the creator used
 * to add them (`US-005`).
 *
 * `US-026` — a client reads the same person and gets the same fields **minus
 * notes**, which must be "absent at all, not even an empty one". That is why
 * the notes block below is not styled away or emptied: it is not rendered.
 *
 * **The difference is made in the gateway, not here** (`ADR-013`, CLAUDE.md
 * rule 2). The client's payload never selects the column, so this screen has
 * nothing to hide even if it tried — which is the property the prototype's
 * shared body with a `hideNotes` flag did not have. `resolution` carries the
 * audience so the two shapes stay distinct types: in the client branch there is
 * no `note` property to reference, so `US-026` AC-1 is a compile error to break
 * rather than a rule to remember.
 *
 * The person is found in the payload the token already resolves to, never
 * fetched by id. A reader can therefore only see people on their own shoot: an
 * id from another shoot simply is not in the list. That covers `US-023` AC-2
 * and `US-026` AC-2 together — an invalid link resolves to nothing, so there is
 * no list to find anyone in.
 */
type Resolution =
  | { phase: 'resolving' }
  | { phase: 'invalid' }
  | { phase: 'ready'; audience: 'crew'; member: LinkCrewMember }
  | { phase: 'ready'; audience: 'client'; member: LinkClientCrewMember }

export default function CrewMemberDetailScreen() {
  const { token, crewId } = useLocalSearchParams<{ token?: string; crewId?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  useEffect(() => {
    // S-2 F-2 — nothing is reported invalid until a resolution has been
    // ATTEMPTED, on every route of this surface.
    if (token === undefined || crewId === undefined) return
    let cancelled = false
    void (async () => {
      const payload = await resolveLink(token)
      if (cancelled) return
      if (!payload) {
        setResolution({ phase: 'invalid' })
        return
      }
      // Branched rather than reading `payload.crew` off the union: the two
      // audiences carry different member shapes, and keeping them apart here is
      // what lets the render below narrow to one of them.
      if (payload.audience === 'crew') {
        const member = payload.crew.find((candidate) => candidate.id === crewId)
        setResolution(member ? { phase: 'ready', audience: 'crew', member } : { phase: 'invalid' })
      } else {
        const member = payload.crew.find((candidate) => candidate.id === crewId)
        setResolution(member ? { phase: 'ready', audience: 'client', member } : { phase: 'invalid' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, crewId])

  if (resolution.phase === 'resolving') {
    return (
      <View className="bg-background flex-1 items-center justify-center py-10">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (resolution.phase === 'invalid') {
    return (
      <View className="bg-background flex-1 items-center gap-2 px-4 py-10">
        <Text className="text-5xl">⚠️</Text>
        <Text className="text-title text-foreground text-center font-semibold">
          {uk.linkInvalidTitle}
        </Text>
        <Text className="text-body-sm text-muted-foreground text-center" style={{ maxWidth: 280 }}>
          {uk.linkInvalidSub}
        </Text>
      </View>
    )
  }

  const { member } = resolution

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        {/* One title for both audiences, as in the prototype: the client is not
            told they are seeing a reduced version of the record. */}
        <Text className="text-title text-foreground font-semibold">{uk.peerDetailsTitle}</Text>

        {/* The creator's add-crew form, read back — US-023 AC-1's "same layout". */}
        {/* A Card supplies text-card-foreground itself — the explicit provider
            was the stopgap that kept this from going white-on-white when
            --foreground inverted (ADR-017). */}
        <Card variant="block" className="gap-1">
            <Field label={uk.crewName} value={member.name} strong />
            <Field label={uk.crewRole} value={member.role} />
            <Field label={uk.crewContact} value={member.contact} />
            <Field label={uk.crewInstagram} value={member.instagram} />

            {/* US-026 AC-1 — everything above is shared; this is the one
                difference, and it is an absence rather than a blank. */}
            {resolution.audience === 'crew' ? (
              <>
                <Field label={uk.crewNotes} value={resolution.member.note} />
                {resolution.member.noteImageUrl ? (
                  <Pressable
                    className="bg-muted mt-2 h-40 w-full overflow-hidden rounded-xl active:opacity-70"
                    onPress={() => setViewingImage(resolution.member.noteImageUrl)}
                    role="button"
                    accessibilityLabel={uk.crewNotes}
                  >
                    <Image
                      source={{ uri: resolution.member.noteImageUrl }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : null}
              </>
            ) : null}
        </Card>

        {/* Mounted for the crew audience only. A client has no image to open,
            because the payload that would carry one does not reach them. */}
        {resolution.audience === 'crew' ? (
          <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
        ) : null}
      </View>
    </ScrollView>
  )
}

/**
 * An empty optional field shows «—», as the prototype does, rather than
 * disappearing: a reader can then tell "no Instagram on file" from "this screen
 * did not load it".
 *
 * This is why `US-026` AC-1's "not even an empty one" had to be met by not
 * rendering the notes field at all — rendering it with an empty value would
 * have produced «Нотатки: —», which is exactly what that phrase forbids.
 */
function Field({ label, value, strong }: { label: string; value: string | null; strong?: boolean }) {
  return (
    <View className="gap-1 pt-2">
      {/* Inside the card, so `muted-foreground` is right here: #6E6E73 on white
          is 5.07:1. Only the size moves, onto the design's scale. */}
      <Text className="text-label text-muted-foreground">{label}</Text>
      <Text className={`text-body-sm ${strong ? 'font-semibold' : ''}`}>
        {value?.trim() || '—'}
      </Text>
    </View>
  )
}
