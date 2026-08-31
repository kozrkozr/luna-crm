import { useCallback, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import X from 'lucide-react-native/icons/x'
import { ImageViewer } from './ImageViewer'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { openExternalUrl } from '../lib/openExternalUrl'
import { useStrings } from '../i18n/LanguageProvider'
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
 *
 * The tile is **84px** since 2026-08-30, down from 96: that is the size the
 * Figma shoot-detail frame draws every tile at — references, the location photo,
 * the add tile — and four of them plus a gap is what fits a phone's width beside
 * the group's «+». `LinkReferenceGrid` is a separate component and unaffected.
 */
export function ReferenceGrid({
  references,
  trailing,
  onRemove,
}: {
  references: Reference[]
  /**
   * One more tile after the last reference, inside the same wrapping row — the
   * group's «+» on the shoot's own page. A sibling of the thumbnails rather than
   * a box beside the grid, so a full row wraps as one flow instead of leaving
   * the add tile stranded on its own line.
   */
  trailing?: React.ReactNode
  /**
   * Draws a ✕ on every tile, which calls this with the reference.
   *
   * **Opt-in, and it has to be.** This grid serves three surfaces: the shoot's
   * own «Матеріали» tab, the all-references page, and — through
   * `REFERENCE_DISPLAY_LIMIT` — the shape the link views copy. Only the creator
   * may remove anything, and only where the design puts the control, so a
   * caller that passes nothing gets exactly the read-only grid it had before.
   *
   * The caller owns the confirmation. This component draws the control and
   * reports the tap; it does not decide what a removal costs.
   */
  onRemove?: (reference: Reference) => void
}) {
  const [viewing, setViewing] = useState<string | null>(null)

  if (references.length === 0 && !trailing) return null

  return (
    <>
      <View className="flex-row flex-wrap items-start gap-2">
        {references.map((reference) => (
          <ReferenceThumb
            key={reference.id}
            reference={reference}
            onOpenImage={setViewing}
            onRemove={onRemove}
          />
        ))}
        {trailing}
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
  onRemove,
}: {
  reference: Reference
  onOpenImage: (uri: string) => void
  onRemove?: (reference: Reference) => void
}) {
  const t = useStrings()
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

  const tile =
    reference.kind === 'image' ? (
      <Pressable
        className="bg-muted h-[84px] w-[84px] overflow-hidden rounded-xl active:opacity-70"
        // Not tappable until the URL is signed: there would be nothing to show,
        // and the thumbnail is blank at that point anyway.
        disabled={!uri}
        onPress={() => uri && onOpenImage(uri)}
        // Pressable alone renders an unlabelled div on web. RNR's own controls
        // set a role; these are hand-composed, and ADR-016 made the
        // accessibility of those this project's problem rather than a library's.
        role="button"
        accessibilityLabel={t.references}
      >
        {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="cover" /> : null}
      </Pressable>
    ) : (
      <Pressable
        className="bg-muted h-[84px] w-[84px] justify-end rounded-xl p-2 active:opacity-70"
        onPress={() => void openExternalUrl(reference.urlOrPath)}
        role="button"
        accessibilityLabel={hostOf(reference.urlOrPath)}
      >
        <Text className="text-xs" numberOfLines={3}>
          {hostOf(reference.urlOrPath)}
        </Text>
      </Pressable>
    )

  if (!onRemove) return tile

  return (
    <View>
      {tile}
      {/*
        The ✕, half off the tile's corner — the same control the edit screen's
        location attachment carries, at the same size, so the two read as one
        gesture. `hitSlop` rather than a bigger circle: §6.3 keeps the visual
        size and widens the touch area, and a 44pt button over an 84pt tile
        would cover a quarter of the thumbnail.

        Outside the tile's own Pressable, not inside it: nesting one pressable
        in another makes the inner tap ambiguous on Android, and here the two do
        opposite things — open it, or remove it.
      */}
      <Pressable
        className="bg-secondary border-border absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full border active:opacity-70"
        hitSlop={10}
        onPress={() => onRemove(reference)}
        role="button"
        accessibilityLabel={`${t.remove}: ${
          reference.kind === 'image' ? t.references : hostOf(reference.urlOrPath)
        }`}
      >
        <Icon as={X} size={13} strokeWidth={2.4} className="text-foreground" />
      </Pressable>
    </View>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
