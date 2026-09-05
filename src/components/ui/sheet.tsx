import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view'
import { cn } from '@/lib/utils'
import { elevation } from '@/theme/elevation'
import { Portal } from '@rn-primitives/portal'
import { Pressable, View } from 'react-native'
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
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}) {
  const insets = useSafeAreaInsets()

  if (!open) return null

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
