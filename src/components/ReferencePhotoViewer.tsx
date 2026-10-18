import { useEffect, useRef, useState } from 'react'
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import {
  FlatList,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
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
 * A horizontal paging `FlatList` in React Native's own Modal. There is no zoom
 * (owner, 2026-10-18): pinching competes with the swipe for the same pan, and
 * the list's paging is the part that has to stay dependable on set.
 *
 * **Swipe down to close (AC-7)** — as Photos does. One vertical pan on the photo
 * area, which only becomes active past 12pt downward and fails past 12pt
 * sideways, so a sideways swipe is the list's and never the pan's. The
 * gesture-handler `FlatList`, not React Native's, so the two are arbitrated by
 * the same library rather than raced between it and UIKit.
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
  const [pageHeight, setPageHeight] = useState(0)
  // AC-7 — how far the photo has been dragged down.
  const drag = useSharedValue(0)
  const open = index !== null && photos.length > 0
  const current = open ? photos[Math.min(index, photos.length - 1)] : null

  // AC-4 — after a removal the list is shorter; keep the page in view. The
  // index the caller holds already points at the next photo, or the previous
  // one when the last was removed.
  useEffect(() => {
    // Clamped here too: this runs before the caller has moved its index off a
    // removed last photo, and `scrollToIndex` throws past the end.
    if (open && index !== null)
      list.current?.scrollToIndex({
        index: Math.min(index, photos.length - 1),
        animated: false,
      })
    // `photos.length`: only a removal moves the page under the reader's thumb.
  }, [photos.length])

  const counter = open
    ? t.viewerCounterTemplate
        .replace('{n}', String(Math.min(index, photos.length - 1) + 1))
        .replace('{total}', String(photos.length))
    : ''
  // Each opening starts in place, whatever the last one was dismissed from.
  useEffect(() => {
    if (open) drag.value = 0
  }, [open, drag])

  const dismiss = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY)
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) {
        drag.value = withTiming(pageHeight || 800, { duration: 180 }, (finished) => {
          if (finished) scheduleOnRN(onClose)
        })
      } else {
        drag.value = withSpring(0, { damping: 20, stiffness: 220 })
      }
    })

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drag.value }],
  }))
  // The black thins as the photo comes down, so the tab shows through.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drag.value, [0, 400], [1, 0.15], Extrapolation.CLAMP),
  }))
  // The controls go first — they are not what is being carried away.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drag.value, [0, 120], [1, 0], Extrapolation.CLAMP),
  }))

  const title = chipLabel ? `${chipLabel} · ${counter}` : counter
  const shot = !!current?.shotAt

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
    >
      {/* Its own root: a Modal is a separate native tree that gestures do not reach otherwise. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }, backdropStyle]}
        />
        {/* AC-2 — the title in the middle, the round ✕ at the right. */}
        {/* className on plain Views only: NativeWind is not wired to reanimated's. */}
        <Animated.View style={chromeStyle}>
          <View className="flex-row items-center px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
            {/* The ✕'s width again, so the title centres on the screen. */}
            <View className="w-9" />
            <Text
              className="flex-1 text-center text-base font-semibold text-white"
              numberOfLines={1}
            >
              {title}
            </Text>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-white/20 active:opacity-70"
              onPress={onClose}
              hitSlop={8}
              role="button"
              accessibilityLabel={t.closeWord}
            >
              <Icon as={X} size={18} strokeWidth={2.4} className="text-white" />
            </Pressable>
          </View>
        </Animated.View>

        {/*
          AC-1 — the photo only between the header and the buttons, never under
          them: the white controls were lost against a light photo (owner,
          2026-10-18). The list's height is measured, so each page fills it.
        */}
        <GestureDetector gesture={dismiss}>
          <Animated.View
            style={[{ flex: 1 }, photoStyle]}
            onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
          >
            {/* Not before the height is known: pages would be drawn 0pt tall, and
                FlatList does not re-render its rows when only that changes. */}
            {open && pageHeight > 0 ? (
              <FlatList
                ref={list}
                data={photos}
                keyExtractor={(photo) => photo.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={index}
                getItemLayout={(_, i) => ({
                  length: width,
                  offset: width * i,
                  index: i,
                })}
                onMomentumScrollEnd={(event) =>
                  onIndexChange(Math.round(event.nativeEvent.contentOffset.x / width))
                }
                // Web has no momentum event for a snap, so the page is read when the
                // drag ends there. Not on iOS: mid-fling, that offset is not the page.
                onScrollEndDrag={
                  Platform.OS === 'web'
                    ? (event) =>
                        onIndexChange(Math.round(event.nativeEvent.contentOffset.x / width))
                    : undefined
                }
                renderItem={({ item }) => <Page photo={item} width={width} height={pageHeight} />}
              />
            ) : null}
          </Animated.View>
        </GestureDetector>

        {/*
          AC-3, AC-4 — two full-width buttons, one above the other: «✓ Позначити як
          відзняте» in the «+ Нова зйомка» colour (green «✓ Відзнято» once marked), and a red outlined
          «Видалити» under it.
        */}
        {current ? (
          <Animated.View style={chromeStyle}>
            <View className="gap-3 px-4 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
              {error ? <Text className="text-destructive text-center text-sm">{error}</Text> : null}
              <Pressable
                className={`h-12 flex-row items-center justify-center gap-2 rounded-full active:opacity-80 ${
                  shot ? 'bg-success' : 'bg-primary'
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
                  className={shot ? 'text-success-foreground' : 'text-primary-foreground'}
                />
                <Text
                  className={`text-base font-semibold ${shot ? 'text-success-foreground' : 'text-primary-foreground'}`}
                >
                  {shot ? t.viewerShot : t.viewerMarkShot}
                </Text>
              </Pressable>
              <Pressable
                className="border-destructive h-12 flex-row items-center justify-center gap-2 rounded-full border active:opacity-70"
                onPress={() => onRemove(current)}
                role="button"
              >
                <Icon as={Trash} size={16} strokeWidth={2} className="text-destructive" />
                <Text className="text-destructive text-base font-semibold">{t.remove}</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {children}
      </GestureHandlerRootView>
    </Modal>
  )
}

/** One photo, signed when it is first drawn — the bucket is private. */
function Page({ photo, width, height }: { photo: Reference; width: number; height: number }) {
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
    <View style={{ width, height }} className="items-center justify-center">
      {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : null}
    </View>
  )
}
