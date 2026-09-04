import * as React from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react-native'
import Svg, { Circle, Rect } from 'react-native-svg'

/**
 * The Instagram mark, drawn.
 *
 * **lucide ships no `instagram` glyph at this version**, so every field that
 * collects a handle stood in `at-sign` — «@» — which reads as "a handle" rather
 * than as Instagram, and left Telegram's paper plane beside it looking like the
 * only branded one. The artboards draw the real mark as inline SVG; this is that
 * path verbatim: a rounded square, the lens, and the dot.
 *
 * ── Shaped as a lucide icon on purpose ──────────────────────────────────────
 *
 * It takes `LucideProps` and forwards a ref, so it goes through `Icon` like any
 * other: `<Icon as={InstagramIcon} size={16} className="text-muted-foreground" />`.
 * That matters because `Icon` is where `cssInterop` lives — it compiles the
 * class into `style`, and `react-native-svg` resolves `currentColor` from
 * `style.color`. Standing this component beside `Icon` instead would have meant
 * a second interop registration and two ways to colour an icon.
 *
 * The cast is the honest part: lucide's type is a `ForwardRefExoticComponent`
 * over its own props, and this satisfies the shape without being one of its
 * generated modules.
 */
const InstagramIcon = React.forwardRef<React.ComponentRef<typeof Svg>, LucideProps>(
  ({ size = 24, strokeWidth = 1.7, color = 'currentColor', ...props }, ref) => (
    <Svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <Rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" />
      <Circle cx="12" cy="12" r="3.9" />
      {/* Filled, not stroked — at r=1 a stroke would close the dot up. */}
      <Circle cx="16.9" cy="7.1" r="1" fill={color} stroke="none" />
    </Svg>
  )
) as unknown as LucideIcon

InstagramIcon.displayName = 'InstagramIcon'

export { InstagramIcon }
