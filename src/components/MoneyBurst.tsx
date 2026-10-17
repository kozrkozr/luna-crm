import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { Portal } from '@rn-primitives/portal'

/**
 * `US-060` AC-2a — banknotes thrown up from the button across the whole screen
 * when a shoot is marked paid, falling back and fading (owner, 2026-10-17; a
 * rain from the top edge was tried beside it on a device and not kept).
 *
 * Rendered through the root `PortalHost`, so it covers the screen rather than
 * the card it was started from, and `pointerEvents="none"` so the toast's undo
 * stays tappable underneath. Someone who has asked the OS for less motion gets
 * nothing — `onDone` fires at once, and the haptic and the toast still say it.
 */
const COUNT = 26
const DURATION = 1700

type Note = {
  delay: number
  /** Start, in window coordinates. */
  x0: number
  y0: number
  /** How far it travels over the whole run. */
  dx: number
  /** The upward throw. */
  dy: number
  /** Pulls the note back down past where it started. */
  gravity: number
  spin: number
  size: number
}

export function MoneyBurst({
  origin,
  onDone,
}: {
  /** Where the notes start — the button's centre, in window coordinates. */
  origin: { x: number; y: number }
  onDone: () => void
}) {
  const reduced = useReducedMotion()
  const { width, height } = useWindowDimensions()

  const notes = useMemo<Note[]>(
    () =>
      Array.from({ length: COUNT }, () => {
        const random = (min: number, max: number) => min + Math.random() * (max - min)
        return {
          delay: random(0, 120),
          x0: origin.x,
          y0: origin.y,
          dx: random(-0.55, 0.55) * width,
          dy: -random(0.35, 0.75) * height,
          gravity: random(1.6, 2.1) * height,
          spin: random(-540, 540),
          size: random(22, 34),
        }
      }),
    [origin.x, origin.y, width, height]
  )

  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    const timer = setTimeout(onDone, DURATION + 650)
    return () => clearTimeout(timer)
  }, [reduced, onDone])

  if (reduced) return null

  return (
    <Portal name="money-burst">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {notes.map((note, index) => (
          <FlyingNote key={index} note={note} />
        ))}
      </View>
    </Portal>
  )
}

function FlyingNote({ note }: { note: Note }) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withDelay(
      note.delay,
      withTiming(1, { duration: DURATION, easing: Easing.linear })
    )
  }, [t, note.delay])

  const style = useAnimatedStyle(() => {
    const p = t.value
    // A throw: up at first, then gravity wins.
    const y = note.y0 + note.dy * p + 0.5 * note.gravity * p * p
    const x = note.x0 + note.dx * p
    return {
      opacity: p === 0 ? 0 : p > 0.8 ? (1 - p) / 0.2 : 1,
      transform: [
        { translateX: x - note.size / 2 },
        { translateY: y - note.size / 2 },
        { rotate: `${note.spin * p}deg` },
      ],
    }
  })

  return (
    <Animated.Text
      style={[{ position: 'absolute', left: 0, top: 0, fontSize: note.size }, style]}
    >
      💵
    </Animated.Text>
  )
}
