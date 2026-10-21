import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view'
import { cn } from '@/lib/utils'
import { elevation } from '@/theme/elevation'
import { Portal } from '@rn-primitives/portal'
import { useDesktopShell } from '@/lib/desktop'
import { useEffect, useState, type RefObject } from 'react'
import { Pressable, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FadeIn, FadeOut, ReduceMotion, SlideInDown, SlideOutDown } from 'react-native-reanimated'

/**
 * A bottom sheet — the shoot detail's person sheet.
 *
 * Written here for the same reason `Toast` was: React Native Reusables ships
 * none, no `@rn-primitives/dialog` is installed, and neither
 * `@gorhom/bottom-sheet` nor `react-native-gesture-handler` is a dependency.
 * This is a portal, an overlay and a slide — a great deal less than the
 * dependency it replaces, and it needs no gesture handler because nothing here
 * is draggable.
 *
 * **The grabber is decorative, and that is a real limitation.** The handoff
 * draws the 36×4 `#3f3f46` bar every iOS sheet has, and a reader will try to
 * drag it. Dismissal is by the overlay or the system back gesture instead. A
 * draggable sheet needs `react-native-gesture-handler`; that is a dependency
 * decision, not a styling one, so the bar is drawn as designed and the gap is
 * recorded in docs/redesign-log.md.
 *
 * The Portal is not optional, for the reason `Toast` gives: React Native has no
 * `position: fixed`, so a sheet rendered in place is clipped by whatever
 * `overflow` its ancestors have and scrolls with the content behind it.
 *
 * Timings are the handoff's: overlay fades 120–160ms, the sheet slides up in
 * 240ms. `SlideInDown`'s spec'd `cubic-bezier(0.32,0.72,0,1)` is iOS's own
 * sheet curve; Reanimated's default spring on this entry is close enough that
 * naming an easing would be false precision.
 */
export function Sheet({
  open,
  onClose,
  children,
  className,
  anchor,
  width,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  /** On a desktop browser, the popover's or dialog's width; 380 by default. */
  width?: number
  /**
   * `US-057` — in the creator's app on a desktop browser, the control the sheet belongs to: it
   * opens as a 380 px popover under it, as the draft canvas draws «Валюта»
   * and the statistics period. Without one, a dialog in the middle. Ignored
   * on the phone.
   */
  anchor?: RefObject<View | null>
}) {
  const insets = useSafeAreaInsets()
  const desktop = useDesktopShell()

  if (!open) return null
  if (desktop)
    return (
      <DesktopPopover anchor={anchor} onClose={onClose} className={className} width={width}>
        {children}
      </DesktopPopover>
    )

  return (
    <Portal name="sheet">
      <View className="absolute inset-0 justify-end">
        {/*
          The overlay is `rgba(0,0,0,.65)` as drawn — darker than the
          alert-dialog's `bg-black/50`, because a sheet leaves the screen behind
          it visible and has to win against it.

          It is the dismiss control, so it carries a role and a label: on web a
          bare Pressable renders an unlabelled div, and this one is the only way
          out of the sheet.
        */}
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
          className="absolute inset-0"
        >
          <Pressable
            className="flex-1 bg-black/65"
            onPress={onClose}
            role="button"
            accessibilityLabel="Закрити"
          />
        </NativeOnlyAnimatedView>

        <NativeOnlyAnimatedView
          entering={SlideInDown.duration(240).reduceMotion(ReduceMotion.System)}
          exiting={SlideOutDown.duration(200).reduceMotion(ReduceMotion.System)}
        >
          <View
            className={cn(
              'bg-card border-border rounded-t-2xl border-t px-4 pt-2.5',
              className
            )}
            style={[elevation.overlay, { paddingBottom: insets.bottom + 16 }]}
          >
            {/* The grabber. 36×4 on `border-strong`, centred — see the note
                above about it not being draggable. */}
            <View className="bg-border-strong mb-3 h-1 w-9 self-center rounded-full" />
            {children}
          </View>
        </NativeOnlyAnimatedView>
      </View>
    </Portal>
  )
}

const POPOVER_WIDTH = 380
const EDGE = 16

/**
 * `US-057` — a sheet on a desktop browser. Under its anchor's left edge, kept
 * inside the window, and above the anchor when there is no room below; with no
 * anchor, centred over a dimmed page. A click outside closes it, as the
 * overlay does on the phone. No grabber and no slide: nothing here is a sheet
 * any more.
 */
function DesktopPopover({
  anchor,
  onClose,
  className,
  children,
  width = POPOVER_WIDTH,
}: {
  anchor?: RefObject<View | null>
  onClose: () => void
  className?: string
  children: React.ReactNode
  width?: number
}) {
  const window = useWindowDimensions()
  const [spot, setSpot] = useState<{ x: number; y: number; height: number } | null>(null)
  const [panelHeight, setPanelHeight] = useState(0)

  useEffect(() => {
    anchor?.current?.measureInWindow((x, y, _width, height) => setSpot({ x, y, height }))
  }, [anchor, window.width, window.height])

  const place = () => {
    if (!spot) return { opacity: 0 }
    const left = Math.max(EDGE, Math.min(spot.x, window.width - width - EDGE))
    const below = spot.y + spot.height + 8
    const fitsBelow = below + panelHeight <= window.height - EDGE
    const top = fitsBelow ? below : Math.max(EDGE, spot.y - 8 - panelHeight)
    return { left, top, opacity: panelHeight ? 1 : 0 }
  }

  return (
    <Portal name="sheet">
      <View className={cn('absolute inset-0', anchor ? '' : 'items-center justify-center')}>
        <Pressable
          className={cn('absolute inset-0', anchor ? '' : 'bg-black/65')}
          onPress={onClose}
          role="button"
          accessibilityLabel="Закрити"
        />
        <View
          className={cn(
            'bg-accent border-border-strong rounded-2xl border p-2',
            anchor ? 'absolute' : '',
            className
          )}
          style={[elevation.overlay, { width }, anchor ? place() : null]}
          onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </View>
    </Portal>
  )
}
