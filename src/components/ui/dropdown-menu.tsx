import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view'
import { Text, TextClassContext } from '@/components/ui/text'
import { tapped } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { elevation } from '@/theme/elevation'
import { Portal } from '@rn-primitives/portal'
import { Pressable, View } from 'react-native'
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'

/**
 * The overflow «⋯» menu.
 *
 * Hand-built for the same reason `Sheet` is: `@rn-primitives/dropdown-menu` is
 * not installed, and the three that are (`select`, `alert-dialog`, `portal`)
 * solve different problems. `Select` is the closest and is wrong here — it
 * models a value being chosen from a list, where this is a list of actions, and
 * its trigger renders the current value.
 *
 * **Anchored by the caller, not measured.** The trigger is a 40×40 button in a
 * fixed header, so the menu's top is a number the header already knows. Passing
 * it in avoids `measureInWindow`, which is asynchronous and would land the menu
 * a frame late — visibly, on the frame it opens.
 *
 * The handoff's values: min-width 216, bg `#18181b`, border `#27272a`, radius
 * 10, shadow `0 12px 32px rgba(0,0,0,.6)`, items 13.5px on radius 7.
 */
export function DropdownMenu({
  open,
  onClose,
  top,
  children,
}: {
  open: boolean
  onClose: () => void
  /** Distance from the top of the window to the menu's top edge. */
  top: number
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <Portal name="dropdown-menu">
      {/*
        The scrim is invisible but present, and it is what makes tapping
        anywhere else close the menu. Without it the menu would stay open under
        the next tap and swallow it.
      */}
      <Pressable
        className="absolute inset-0"
        onPress={onClose}
        role="button"
        accessibilityLabel="Закрити меню"
      />
      <NativeOnlyAnimatedView
        entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
        className="absolute right-4"
        style={{ top }}
      >
        <View
          className="bg-secondary border-border min-w-[216px] overflow-hidden rounded-lg border p-1"
          style={elevation.overlay}
          role="menu"
        >
          {children}
        </View>
      </NativeOnlyAnimatedView>
    </Portal>
  )
}

/**
 * One action in the menu.
 *
 * `destructive` is the only variant, and it keeps its hue: `--destructive`
 * survived the app-wide monochrome pass because the handoff has its own red for
 * refusals (`#f87171` text over a `#2a1010` press tint).
 */
export function DropdownMenuItem({
  label,
  onPress,
  destructive = false,
}: {
  label: string
  onPress: () => void
  destructive?: boolean
}) {
  return (
    <Pressable
      className={cn(
        'rounded-md px-3 py-2.5',
        destructive ? 'active:bg-destructive/15' : 'active:bg-border-strong'
      )}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="menuitem"
    >
      <TextClassContext.Provider value={undefined}>
        <Text
          className={cn(
            'text-body-sm font-medium',
            destructive ? 'text-destructive' : 'text-foreground'
          )}
        >
          {label}
        </Text>
      </TextClassContext.Provider>
    </Pressable>
  )
}

export function DropdownMenuSeparator() {
  return <View className="bg-border my-1 h-px" />
}
