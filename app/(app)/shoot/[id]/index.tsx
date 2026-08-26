import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native'
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '../../../../src/components/ui/button'
import { Input } from '../../../../src/components/ui/input'
import { Text } from '../../../../src/components/ui/text'
import { StatusPill } from '../../../../src/components/StatusPill'
import { uk } from '../../../../src/i18n/uk'
import { getShoot, type Shoot } from '../../../../src/features/shoots/api'
import {
  addImageReference,
  addLinkReference,
  listReferences,
  signedReferenceUrl,
  type Reference,
} from '../../../../src/features/references/api'
import {
  attachmentKind,
  signedLocationUrl,
} from '../../../../src/features/shoots/locationMedia'

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
 * US-018 added the Локація section and the way into the edit screen.
 *
 * Deliberately absent, each belonging to a story not yet built: delete
 * (US-019), the status toggle (US-020), crew (US-005/US-006), and the
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

          {/* US-018 AC-1 — the way into edit. */}
          <Link href={`/(app)/shoot/${shoot.id}/edit`} asChild>
            <Button variant="outline">
              <Text>{uk.edit}</Text>
            </Button>
          </Link>

          <LocationSection shoot={shoot} />

          <ReferencesBlock shootId={shoot.id} references={references} onAdded={onAdded} />
        </View>
      </ScrollView>
    </>
  )
}

/**
 * US-018 — the location, shown wherever it is displayed (AC-1, AC-2).
 *
 * Renders nothing at all when there is no address, note or attachment. An
 * empty «Локація» heading over blank space would suggest the section had
 * failed to load rather than never been filled in, and the prototype shows it
 * only when there is something in it.
 *
 * The address itself already appears next to the date above, as it does in the
 * list; this section is the note and its attachment.
 */
function LocationSection({ shoot }: { shoot: Shoot }) {
  const [uri, setUri] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const attachment = shoot.locationAttachment

  useFocusEffect(
    useCallback(() => {
      if (!attachment) return
      let active = true
      void (async () => {
        const signed = await signedLocationUrl(attachment)
        if (active) setUri(signed)
      })()
      return () => {
        active = false
      }
    }, [attachment])
  )

  if (!shoot.locationAddress && !shoot.locationNote && !attachment) return null

  const kind = attachment ? attachmentKind(attachment) : null

  return (
    <View className="gap-2 pt-2">
      <Text variant="h4">{uk.locationSection}</Text>
      {shoot.locationAddress ? <Text>{shoot.locationAddress}</Text> : null}
      {shoot.locationNote ? (
        <Text className="text-muted-foreground">{shoot.locationNote}</Text>
      ) : null}

      {attachment && kind === 'image' ? (
        <Pressable
          className="bg-secondary border-border h-40 w-full overflow-hidden rounded-md border active:opacity-70"
          disabled={!uri}
          onPress={() => uri && setViewing(uri)}
          role="button"
          accessibilityLabel={uk.locationSection}
        >
          {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="cover" /> : null}
        </Pressable>
      ) : null}

      {attachment && kind === 'video' ? (
        /*
          A video opens in the platform's player rather than playing inline.
          Nothing here specifies inline playback, and risks.md R-4 puts video
          behind spike S-4 — which has not run — including whether a signed URL
          survives an idle page long enough to press play. Opening it is the
          same gesture US-003 AC-3 established for a link reference.
        */
        <Pressable
          className="bg-secondary border-border h-20 w-full items-center justify-center rounded-md border active:opacity-70"
          disabled={!uri}
          onPress={() => uri && void openLink(uri)}
          role="button"
          accessibilityLabel={uk.attachVideo}
        >
          <Text className="text-3xl">🎞</Text>
        </Pressable>
      ) : null}

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </View>
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
  // AC-3 — the full-screen image viewer. Holds the signed URL of the tapped
  // image; null means closed.
  const [viewing, setViewing] = useState<string | null>(null)

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
            <ReferenceThumb key={reference.id} reference={reference} onOpenImage={setViewing} />
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

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </View>
  )
}

/**
 * AC-3, the image half — full-screen, dismissible back to where the viewer was.
 *
 * React Native's Modal, for the same reason DateField uses one: it needs no
 * measurement of its content, which is where the previous UI layer's sheet
 * failed on this project. Tapping anywhere dismisses, and «Готово» is there so
 * the way out is visible rather than guessed — the same word the date picker
 * already uses to confirm and close.
 */
function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black" onPress={onClose}>
        <View className="flex-1 items-center justify-center">
          {uri ? (
            <Image source={{ uri }} className="h-full w-full" resizeMode="contain" />
          ) : null}
        </View>
        <View className="absolute right-4 top-16">
          <Button variant="secondary" onPress={onClose}>
            <Text>{uk.done}</Text>
          </Button>
        </View>
      </Pressable>
    </Modal>
  )
}

/**
 * An image reference renders the image itself; a link renders its host, which
 * is the only label available. The schema has no label column and US-003 does
 * not ask for one, so none is invented.
 *
 * AC-3 — tapping opens the reference: a link goes to the phone's browser,
 * outside the app; an image opens full-screen.
 */
function ReferenceThumb({
  reference,
  onOpenImage,
}: {
  reference: Reference
  onOpenImage: (uri: string) => void
}) {
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
      <Pressable
        className="bg-secondary border-border h-24 w-24 overflow-hidden rounded-md border active:opacity-70"
        // Not tappable until the URL is signed: there would be nothing to show,
        // and the thumbnail is blank at that point anyway.
        disabled={!uri}
        onPress={() => uri && onOpenImage(uri)}
        // Pressable alone renders an unlabelled div on web. RNR's own controls
        // set a role; these are hand-composed, and ADR-016 made their
        // accessibility this project's problem rather than a library's.
        role="button"
        accessibilityLabel={uk.references}
      >
        {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="cover" /> : null}
      </Pressable>
    )
  }

  return (
    <Pressable
      className="bg-secondary border-border h-24 w-24 justify-end rounded-md border p-2 active:opacity-70"
      onPress={() => void openLink(reference.urlOrPath)}
      role="button"
      accessibilityLabel={hostOf(reference.urlOrPath)}
    >
      <Text className="text-xs" numberOfLines={3}>
        {hostOf(reference.urlOrPath)}
      </Text>
    </Pressable>
  )
}

/**
 * AC-3, the link half — "opens in the phone's browser, outside the app".
 *
 * `canOpenURL` first, so a stored link the OS cannot handle fails silently
 * instead of throwing. Nothing specifies an error state for this, and inventing
 * one would be inventing a requirement; the links reaching here already passed
 * AC-2's http(s) check on the way in.
 */
async function openLink(url: string) {
  try {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url)
  } catch {
    /* nothing specified for an unopenable link */
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
