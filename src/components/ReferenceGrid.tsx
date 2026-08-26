import { useCallback, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ImageViewer } from './ImageViewer'
import { Text } from './ui/text'
import { openExternalUrl } from '../lib/openExternalUrl'
import { uk } from '../i18n/uk'
import { signedReferenceUrl, type Reference } from '../features/references/api'

/**
 * How many references a shoot's own page shows before offering the full list.
 *
 * `US-021`'s Out of scope says the number "that fits by default" is not
 * specified and assumes "a reasonable fixed number (e.g. 4)". Four is the
 * prototype's `REF_DISPLAY_LIMIT`, so it is the reviewed one rather than an
 * invention.
 */
export const REFERENCE_DISPLAY_LIMIT = 4

/**
 * The references of a shoot, rendered the same way everywhere they appear.
 *
 * `US-021` AC-1 puts the same references on a second page, and later `US-007`
 * and `US-010` put them in front of crew and clients. Extracting the grid is
 * what keeps those surfaces from drifting apart — the thumbnails, the
 * open-on-tap behaviour (`US-003` AC-3) and the viewer live here once.
 */
export function ReferenceGrid({ references }: { references: Reference[] }) {
  const [viewing, setViewing] = useState<string | null>(null)

  if (references.length === 0) return null

  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        {references.map((reference) => (
          <ReferenceThumb key={reference.id} reference={reference} onOpenImage={setViewing} />
        ))}
      </View>
      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

/**
 * An image reference renders the image itself; a link renders its host, which
 * is the only label available. The schema has no label column and `US-003` does
 * not ask for one, so none is invented.
 *
 * `US-003` AC-3 — tapping opens the reference: a link goes to the phone's
 * browser, outside the app; an image opens full-screen.
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
        // set a role; these are hand-composed, and ADR-016 made the
        // accessibility of those this project's problem rather than a library's.
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
      onPress={() => void openExternalUrl(reference.urlOrPath)}
      role="button"
      accessibilityLabel={hostOf(reference.urlOrPath)}
    >
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
