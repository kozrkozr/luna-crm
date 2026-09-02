import { useEffect, useRef } from 'react'
import { Animated, Pressable } from 'react-native'
import { cn } from '@/lib/utils'

/** Track 42×26, knob 22×22 inset 2px — so it travels 42 − 22 − 2 − 2 = 16px. */
const TRAVEL = 16
const DURATION_MS = 160

/**
 * A two-state toggle, built to `Edit Profile.dc.html`'s spec (owner, 2026-09-02).
 *
 * Hand-written rather than pulled from the registry: `@rn-primitives` ships no
 * switch, and the four installed primitives are the only ones this app has.
 *
 * `Animated` from react-native, not reanimated — the knob is one transform, and
 * `NativeOnlyAnimatedView` exists precisely because reanimated is kept off the
 * web export (ADR-012). A switch that slides on the device and jumps in a
 * browser would be a worse trade than not reaching for reanimated at all.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  accessibilityLabel,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  accessibilityLabel?: string
}) {
  // Starts at its final position, so a switch rendered already-on does not
  // animate into place on mount.
  const offset = useRef(new Animated.Value(checked ? TRAVEL : 0)).current

  useEffect(() => {
    Animated.timing(offset, {
      toValue: checked ? TRAVEL : 0,
      duration: DURATION_MS,
      useNativeDriver: true,
    }).start()
  }, [checked, offset])

  return (
    <Pressable
      className={cn(
        'h-[26px] w-[42px] shrink-0 justify-center rounded-full px-0.5',
        checked ? 'bg-primary' : 'bg-secondary',
        disabled && 'opacity-50'
      )}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      role="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        className={cn(
          'h-[22px] w-[22px] rounded-full',
          checked ? 'bg-primary-foreground' : 'bg-muted-foreground'
        )}
        style={{ transform: [{ translateX: offset }] }}
      />
    </Pressable>
  )
}
