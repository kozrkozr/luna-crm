import { useEffect, useRef, useState } from 'react'
import { FlatList, Image, Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Check from 'lucide-react-native/icons/check'
import Trash from 'lucide-react-native/icons/trash'
import X from 'lucide-react-native/icons/x'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { signedReferenceUrl, type Reference } from '../features/references/api'

type Props = {
  /** The photos to swipe through, in order — frozen by the caller while open (AC-3). */
  photos: Reference[]
  /** Which one is showing; null closes the preview. */
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
  /** The active chip's name, or null on «Всі» (AC-2). */
  chipLabel: string | null
  onToggleShot: (reference: Reference) => void
  /** «Відмітити «Знято» — Світло» — the tile's accessibility label, reused. */
  shotLabel: (reference: Reference) => string
  onRemove: (reference: Reference) => void
  /** Ids whose mark is being written — the button waits for it. */
  marking: ReadonlySet<string>
  /** `US-068` AC-10's message, shown in the preview while it is open. */
  error: string | null
  /** Rendered inside the modal — the web confirmation would sit beneath it otherwise. */
  children?: React.ReactNode
}

/**
 * `US-069` — the «Матеріали» photo preview: swipe left and right through the
 * active chip's photos, mark one «Знято», or remove it.
 *
 * A horizontal paging `FlatList` in React Native's own Modal — no gesture code
 * of its own, which is also why there is no zoom (owner, 2026-10-18): pinching
 * competes with the swipe for the same pan, and the list's paging is the part
 * that has to stay dependable on set.
 *
 * Tapping the photo does nothing (AC-1); the header and the bottom row are
 * always there. `ImageViewer`, with its «Готово», stays everywhere else.
 */
export function ReferencePhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  chipLabel,
  onToggleShot,
  shotLabel,
  onRemove,
  marking,
  error,
  children,
}: Props) {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const list = useRef<FlatList<Reference>>(null)
  const open = index !== null && photos.length > 0
  const current = open ? photos[Math.min(index, photos.length - 1)] : null

  // AC-4 — after a removal the list is shorter; keep the page in view. The
  // index the caller holds already points at the next photo, or the previous
  // one when the last was removed.
  useEffect(() => {
    // Clamped here too: this runs before the caller has moved its index off a
    // removed last photo, and `scrollToIndex` throws past the end.
    if (open && index !== null)
      list.current?.scrollToIndex({ index: Math.min(index, photos.length - 1), animated: false })
    // `photos.length`: only a removal moves the page under the reader's thumb.
  }, [photos.length])

  const counter = open
    ? t.viewerCounterTemplate
        .replace('{n}', String(Math.min(index, photos.length - 1) + 1))
        .replace('{total}', String(photos.length))
    : ''
  const title = chipLabel ? `${chipLabel} · ${counter}` : counter
  const shot = !!current?.shotAt

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait']}>
      <View className="flex-1 bg-black">
        {open ? (
          <FlatList
            ref={list}
            data={photos}
            keyExtractor={(photo) => photo.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(event) =>
              onIndexChange(Math.round(event.nativeEvent.contentOffset.x / width))
            }
            // Web has no momentum event for a snap, so the page is read when the
            // drag ends there. Not on iOS: mid-fling, that offset is not the page.
            onScrollEndDrag={
              Platform.OS === 'web'
                ? (event) => onIndexChange(Math.round(event.nativeEvent.contentOffset.x / width))
                : undefined
            }
            renderItem={({ item }) => <Page photo={item} width={width} />}
          />
        ) : null}

        {/* AC-2 — the round ✕ at the left, the title in the middle. */}
        <View
          className="absolute left-0 right-0 flex-row items-center px-4"
          style={{ top: insets.top + 8 }}
          pointerEvents="box-none"
        >
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-white/20 active:opacity-70"
            onPress={onClose}
            hitSlop={8}
            role="button"
            accessibilityLabel={t.closeWord}
          >
            <Icon as={X} size={18} strokeWidth={2.4} className="text-white" />
          </Pressable>
          <Text className="flex-1 text-center text-base font-semibold text-white" numberOfLines={1}>
            {title}
          </Text>
          {/* The ✕'s width again, so the title centres on the screen. */}
          <View className="w-9" />
        </View>

        {/* AC-3, AC-4 — «Знято» in the middle, the bin at the right. */}
        {current ? (
          <View
            className="absolute left-0 right-0 gap-3 px-4"
            style={{ bottom: insets.bottom + 16 }}
            pointerEvents="box-none"
          >
            {error ? <Text className="text-destructive text-center text-sm">{error}</Text> : null}
            <View className="flex-row items-center">
              <View className="w-11" />
              <View className="flex-1 items-center">
                <Pressable
                  className={`h-11 flex-row items-center justify-center gap-2 rounded-full px-6 ${
                    shot ? 'bg-success' : 'bg-white/20 active:opacity-70'
                  }`}
                  disabled={marking.has(current.id)}
                  onPress={() => onToggleShot(current)}
                  role="button"
                  accessibilityState={{ selected: shot }}
                  accessibilityLabel={shotLabel(current)}
                >
                  <Icon
                    as={Check}
                    size={16}
                    strokeWidth={3}
                    className={shot ? 'text-success-foreground' : 'text-white'}
                  />
                  <Text
                    className={`text-body-sm font-semibold ${shot ? 'text-success-foreground' : 'text-white'}`}
                  >
                    {t.shotMark}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-white/20 active:opacity-70"
                onPress={() => onRemove(current)}
                role="button"
                accessibilityLabel={t.remove}
              >
                <Icon as={Trash} size={18} strokeWidth={2} className="text-white" />
              </Pressable>
            </View>
          </View>
        ) : null}

        {children}
      </View>
    </Modal>
  )
}

/** One photo, signed when it is first drawn — the bucket is private. */
function Page({ photo, width }: { photo: Reference; width: number }) {
  const [uri, setUri] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void signedReferenceUrl(photo.urlOrPath).then((signed) => {
      if (active) setUri(signed)
    })
    return () => {
      active = false
    }
  }, [photo.urlOrPath])
  return (
    <View style={{ width }} className="h-full items-center justify-center">
      {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : null}
    </View>
  )
}
