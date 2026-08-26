import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Text } from '../../../../src/components/ui/text'
import { ImageViewer } from '../../../../src/components/ImageViewer'
import { uk } from '../../../../src/i18n/uk'
import { resolveLink, type LinkCrewMember } from '../../../../src/features/links/gateway'

/**
 * US-023 — a crew member reads a peer's complete record.
 *
 * AC-1: name, role, contact, Instagram and notes, "with nothing held back", in
 * the layout the creator used to add them (US-005).
 *
 * AC-2 is the half this screen cannot demonstrate on its own: a client viewing
 * the same person gets US-026's narrower version, and the difference is made in
 * the gateway's payload rather than here. Nothing on this screen decides what a
 * client may see — that is the whole point of ADR-013, and it is why there is
 * no `hideNotes` flag anywhere in this file even though the prototype has one.
 *
 * The person is found in the payload the token already resolves to, not fetched
 * by id. A crew member can therefore only read peers on their own shoot: an id
 * from another shoot simply is not in the list.
 */
type Resolution =
  | { phase: 'resolving' }
  | { phase: 'invalid' }
  | { phase: 'ready'; member: LinkCrewMember }

export default function PeerDetailScreen() {
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
      const member =
        payload && payload.audience === 'crew'
          ? payload.crew.find((candidate) => candidate.id === crewId)
          : undefined
      setResolution(member ? { phase: 'ready', member } : { phase: 'invalid' })
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
        <Text variant="h3" className="text-center">
          {uk.linkInvalidTitle}
        </Text>
        <Text className="text-muted-foreground text-center">{uk.linkInvalidSub}</Text>
      </View>
    )
  }

  const { member } = resolution

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <Text variant="h3">{uk.peerDetailsTitle}</Text>

        {/* The creator's add-crew form, read back — AC-1's "same layout". */}
        <View className="border-border bg-card gap-1 rounded-xl border p-4">
          <Field label={uk.crewName} value={member.name} strong />
          <Field label={uk.crewRole} value={member.role} />
          <Field label={uk.crewContact} value={member.contact} />
          <Field label={uk.crewInstagram} value={member.instagram} />
          <Field label={uk.crewNotes} value={member.note} />
          {member.noteImageUrl ? (
            <Pressable
              className="bg-secondary border-border mt-2 h-40 w-full overflow-hidden rounded-md border active:opacity-70"
              onPress={() => setViewingImage(member.noteImageUrl)}
              role="button"
              accessibilityLabel={uk.crewNotes}
            >
              <Image
                source={{ uri: member.noteImageUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </Pressable>
          ) : null}
        </View>

        <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
      </View>
    </ScrollView>
  )
}

/**
 * An empty optional field shows «—», as the prototype does, rather than
 * disappearing: a reader can then tell "no Instagram on file" from "this screen
 * did not load it".
 */
function Field({ label, value, strong }: { label: string; value: string | null; strong?: boolean }) {
  return (
    <View className="gap-1 pt-2">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className={strong ? 'font-semibold' : undefined}>{value?.trim() || '—'}</Text>
    </View>
  )
}
