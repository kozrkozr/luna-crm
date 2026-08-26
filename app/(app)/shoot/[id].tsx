import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '../../../src/components/ui/button'
import { Input } from '../../../src/components/ui/input'
import { Text } from '../../../src/components/ui/text'
import { StatusPill } from '../../../src/components/StatusPill'
import { uk } from '../../../src/i18n/uk'
import { getShoot, type Shoot } from '../../../src/features/shoots/api'
import {
  addImageReference,
  addLinkReference,
  listReferences,
  signedReferenceUrl,
  type Reference,
} from '../../../src/features/references/api'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoot: Shoot; references: Reference[] }

/**
 * The creator's shoot detail screen.
 *
 * ux-notes.md lists this screen under nine stories at once (US-002, US-003,
 * US-005, US-006, US-018, US-019, US-020, US-024, US-025), and no story owns it
 * outright. US-003 is the first to need it, so it arrives here carrying only
 * what US-003 requires: enough of the shoot to know which one this is, and the
 * references block.
 *
 * Deliberately absent, each belonging to a story not yet built: edit (US-018),
 * delete (US-019), the status toggle (US-020), crew (US-005/US-006), and the
 * raw-files / finished-photos sections (US-024/US-025). The status is shown
 * because it is already stored and already rendered in the list — showing it is
 * not the same as offering to change it.
 */
export default function ShootDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const [shoot, references] = await Promise.all([getShoot(id), listReferences(id)])
        if (!active) return
        setState(shoot && references ? { status: 'loaded', shoot, references } : { status: 'error' })
      })()
      return () => {
        active = false
      }
    }, [id])
  )

  const onAdded = (reference: Reference) =>
    setState((current) =>
      current.status === 'loaded'
        ? { ...current, references: [...current.references, reference] }
        : current
    )

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4">
        <Text className="text-muted-foreground">{uk.somethingWentWrong}</Text>
      </View>
    )
  }

  const { shoot, references } = state

  return (
    <>
      <Stack.Screen options={{ title: shoot.clientName }} />
      <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
        <View className="gap-3 p-4">
          {/*
            The client name is the navigation title and is not repeated in the
            body — the same pattern as the shoot list and the profile screen.
            The prototype shows it once too; it only puts it in the body because
            its header is a brand bar rather than a native title.
          */}
          <View className="flex-row items-center gap-3">
            <Text className="text-muted-foreground flex-1">
              {`${shoot.date}${shoot.locationAddress ? ` · ${shoot.locationAddress}` : ''}`}
            </Text>
            <StatusPill value={shoot.status} />
          </View>

          <ReferencesBlock shootId={shoot.id} references={references} onAdded={onAdded} />
        </View>
      </ScrollView>
    </>
  )
}

/**
 * US-003. Every reference on the shoot is rendered — there is no display limit
 * here on purpose. The prototype caps the grid at four and offers a "show all"
 * button, but that button and the page behind it are US-021, and US-003's Out
 * of scope says so explicitly. Capping without the page would hide references
 * with no way to reach them.
 */
function ReferencesBlock({
  shootId,
  references,
  onAdded,
}: {
  shootId: string
  references: Reference[]
  onAdded: (reference: Reference) => void
}) {
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // AC-2 — on rejection the list is left exactly as it was. Nothing here
  // touches `references`; only a successful add calls onAdded.
  const handle = (result: Awaited<ReturnType<typeof addLinkReference>>) => {
    if (result.ok) {
      onAdded(result.reference)
      setLink('')
      setError(null)
      return
    }
    setError(
      result.reason === 'invalidLink'
        ? uk.referenceLinkInvalid
        : result.reason === 'unsupportedType'
          ? uk.referenceTypeUnsupported
          : uk.referenceAddFailed
    )
  }

  const submitLink = async () => {
    setBusy(true)
    handle(await addLinkReference(shootId, link))
    setBusy(false)
  }

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    })
    if (picked.canceled) return

    setBusy(true)
    handle(await addImageReference(shootId, picked.assets[0]))
    setBusy(false)
  }

  return (
    <View className="gap-3 pt-2">
      <Text variant="h4">{uk.references}</Text>

      {references.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {references.map((reference) => (
            <ReferenceThumb key={reference.id} reference={reference} />
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center gap-2">
        <Input
          className="flex-1"
          value={link}
          onChangeText={(value) => {
            setLink(value)
            setError(null)
          }}
          autoCapitalize="none"
          keyboardType="url"
          placeholder={uk.refPlaceholder}
        />
        <Button variant="outline" size="icon" disabled={busy} onPress={pickFromGallery}>
          <Text>{uk.pickFromGallery}</Text>
        </Button>
        <Button variant="secondary" disabled={busy || !link.trim()} onPress={submitLink}>
          <Text>{uk.addRefBtn}</Text>
        </Button>
      </View>

      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
    </View>
  )
}

/**
 * An image reference renders the image itself; a link renders its host, which
 * is the only label available. The schema has no label column and US-003 does
 * not ask for one, so none is invented.
 */
function ReferenceThumb({ reference }: { reference: Reference }) {
  const [uri, setUri] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (reference.kind !== 'image') return
      let active = true
      void (async () => {
        const signed = await signedReferenceUrl(reference.urlOrPath)
        if (active) setUri(signed)
      })()
      return () => {
        active = false
      }
    }, [reference.kind, reference.urlOrPath])
  )

  if (reference.kind === 'image') {
    return (
      <View className="bg-secondary border-border h-24 w-24 overflow-hidden rounded-md border">
        {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="cover" /> : null}
      </View>
    )
  }

  return (
    <Pressable className="bg-secondary border-border h-24 w-24 justify-end rounded-md border p-2">
      <Text className="text-xs" numberOfLines={3}>
        {hostOf(reference.urlOrPath)}
      </Text>
    </Pressable>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
