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
 * `US-042` AC-6a — confetti across the whole screen when a shoot's files are
 * marked delivered (owner, 2026-10-17), the sibling of `MoneyBurst`: emoji and
 * paper strips thrown up from the button, fluttering down. Fireworks — rings
 * of sparks bursting in the upper half — were tried beside it on a device and
 * not kept.
 *
 * As `MoneyBurst`: through the root `PortalHost`, `pointerEvents="none"` so the
 * toast's undo stays tappable, and nothing at all when the OS asks for reduced
 * motion — `onDone` fires at once.
 */
/* Festive on the dark surface; not theme tokens, which are all quiet. */
const COLOURS = ['#F2C14E', '#F78154', '#5FAD56', '#4D9DE0', '#E15554', '#B388EB']
const EMOJI = ['🎉', '✨', '🎊', '⭐']

type Piece = {
  delay: number
  duration: number
  x0: number
  y0: number
  dx: number
  dy: number
  gravity: number
  spin: number
  /** An emoji, or null for a coloured paper strip. */
  emoji: string | null
  colour: string
  size: number
}

const random = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export function Celebration({
  origin,
  onDone,
}: {
  /** Where the confetti starts — the button's centre, in window coordinates. */
  origin: { x: number; y: number }
  onDone: () => void
}) {
  const reduced = useReducedMotion()
  const { width, height } = useWindowDimensions()

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: 36 }, (_, index) => {
        const emoji = index % 3 === 0 ? pick(EMOJI) : null
        return {
          delay: random(0, 140),
          duration: 1900,
          x0: origin.x,
          y0: origin.y,
          dx: random(-0.6, 0.6) * width,
          dy: -random(0.4, 0.8) * height,
          gravity: random(1.5, 2) * height,
          spin: random(-720, 720),
          emoji,
          colour: pick(COLOURS),
          size: emoji ? random(20, 30) : random(8, 12),
        }
      }),
    [origin.x, origin.y, width, height]
  )

  useEffect(() => {
    if (reduced) {
      onDone()
      return
    }
    const longest = Math.max(...pieces.map((piece) => piece.delay + piece.duration))
    const timer = setTimeout(onDone, longest + 200)
    return () => clearTimeout(timer)
  }, [reduced, onDone, pieces])

  if (reduced) return null

  return (
    <Portal name="celebration">
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {pieces.map((piece, index) => (
          <Flying key={index} piece={piece} />
        ))}
      </View>
    </Portal>
  )
}

function Flying({ piece }: { piece: Piece }) {
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withDelay(
      piece.delay,
      // Even speed; the gravity term does the curving.
      withTiming(1, { duration: piece.duration, easing: Easing.linear })
    )
  }, [t, piece.delay, piece.duration])

  const style = useAnimatedStyle(() => {
    const p = t.value
    const x = piece.x0 + piece.dx * p
    const y = piece.y0 + piece.dy * p + 0.5 * piece.gravity * p * p
    return {
      opacity: p === 0 ? 0 : p > 0.8 ? (1 - p) / 0.2 : 1,
      transform: [
        { translateX: x - piece.size / 2 },
        { translateY: y - piece.size / 2 },
        { rotate: `${piece.spin * p}deg` },
        // A paper strip flutters by turning edge-on and back.
        { scaleX: piece.emoji ? 1 : Math.cos(p * Math.PI * 6) },
      ],
    }
  })

  if (piece.emoji) {
    return (
      <Animated.Text
        style={[{ position: 'absolute', left: 0, top: 0, fontSize: piece.size }, style]}
      >
        {piece.emoji}
      </Animated.Text>
    )
  }
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: piece.size,
          height: piece.size * 1.6,
          borderRadius: 1.5,
          backgroundColor: piece.colour,
        },
        style,
      ]}
    />
  )
}
