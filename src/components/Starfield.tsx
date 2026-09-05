import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

/**
 * The screen background's stars — `--stars` / `--bg-screen` in the design
 * project's `theme.css`, which every artboard puts on its screen container:
 *
 *     <div style="...background:var(--bg-screen)">   // Home, Calendar, …
 *
 * **Not in `shadcn-theme.css`.** The handoff dropped it, because four stacked
 * `repeating radial-gradient`s have no shadcn token to land in and no CSS
 * equivalent in React Native. It is drawn here instead.
 *
 * ── The spec, decoded from `--stars` ────────────────────────────────────────
 *
 * Four layers, each one dot repeating on its own square tile:
 *
 * | Layer | Colour    | Alpha | ⌀     | First dot | Tile    |
 * | ----- | --------- | ----- | ----- | --------- | ------- |
 * | 1     | `#EEEEF2` | .42   | 1.2px | (24, 34)  | 167×167 |
 * | 2     | `#E7E7EB` | .28   | 1.0px | (118, 92) | 223×223 |
 * | 3     | `#DDDDE3` | .22   | 1.6px | (70, 148) | 311×311 |
 * | 4     | `#F5F5F7` | .16   | 0.9px | (190, 20) | 271×271 |
 *
 * The four tile sizes are close to coprime on purpose — 167, 223, 271 and 311
 * are all prime, so the combined pattern only truly repeats every few million
 * pixels. On a 402×874 screen that is **about 28 dots**, none of them landing in
 * a grid the eye can catch.
 *
 * The CSS writes each dot as `radial-gradient(Dpx Dpx at x y, C 50%, transparent
 * 51%)` — an ending shape of radius D with the colour stopping halfway. That is
 * a hard-edged disc of radius **D/2**, not a soft glow, which is why these are
 * plain `Circle`s and not gradients.
 *
 * ── Why explicit circles rather than an SVG `<Pattern>` ─────────────────────
 *
 * `Pattern` would be the direct translation and `react-native-svg` supports it,
 * but at this density it buys nothing: ~28 circles is less work than four
 * pattern tiles, and the positions become plain arithmetic that can be read and
 * checked here instead of depending on how one library implements
 * `patternUnits` on three platforms. The link views are static-exported
 * (`ADR-012`) and are two of the product's three journeys, so "renders the same
 * in a mobile browser" is not a nice-to-have.
 *
 * ── Where it goes ───────────────────────────────────────────────────────────
 *
 * Behind the scrolling body of a screen, and **nowhere else**. The artboards are
 * specific about this: the header and the bottom bar are `background:var(--bg)`,
 * flat, no stars — content scrolls under both, and a starred header would drag
 * its dots across the content passing beneath it. Cards are `--surface` and
 * cover the stars by design.
 *
 * `useWindowDimensions` rather than an `onLayout` measure: the field is fixed to
 * the screen, not to the scrolling content — in the artboards it sits on the
 * device container while the content scrolls over it — so the window is exactly
 * the area to cover, and it needs no layout pass to know it.
 */

type Layer = {
  /** Hex, already converted from the oklch in `theme.css`. */
  color: string
  opacity: number
  /** Radius in points — half the CSS gradient's ending shape. */
  radius: number
  /** The first dot's centre, and the tile it repeats on. */
  x: number
  y: number
  tile: number
}

const LAYERS: readonly Layer[] = [
  { color: '#EEEEF2', opacity: 0.42, radius: 0.6, x: 24, y: 34, tile: 167 },
  { color: '#E7E7EB', opacity: 0.28, radius: 0.5, x: 118, y: 92, tile: 223 },
  { color: '#DDDDE3', opacity: 0.22, radius: 0.8, x: 70, y: 148, tile: 311 },
  { color: '#F5F5F7', opacity: 0.16, radius: 0.45, x: 190, y: 20, tile: 271 },
]

export function Starfield() {
  const { width, height } = useWindowDimensions()

  return (
    /*
      `pointerEvents="none"` is the load-bearing prop: this covers the whole
      screen, and without it every tap on every screen would land here instead
      of on the row underneath.
    */
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* `flatMap`, so the children are one flat list rather than an array
            of arrays. Both render; flat is simply the plainer thing to hand a
            renderer, and costs nothing. */}
        {LAYERS.flatMap((layer) =>
          dotsFor(layer, width, height).map(([cx, cy]) => (
            <Circle
              key={`${layer.tile}-${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r={layer.radius}
              fill={layer.color}
              fillOpacity={layer.opacity}
            />
          ))
        )}
      </Svg>
    </View>
  )
}

/**
 * Every dot of one layer that falls inside the screen.
 *
 * The CSS tiles from the element's own origin, so a dot sits at
 * `(x + n·tile, y + m·tile)` for whole `n`, `m` — the same arithmetic, written
 * out. Starting at the first dot rather than at zero is what keeps the offsets
 * (24, 34), (118, 92) and the rest meaningful: they are the layer's phase, and
 * losing them would slide all four into alignment.
 */
function dotsFor({ x, y, tile }: Layer, width: number, height: number): [number, number][] {
  const dots: [number, number][] = []
  for (let cx = x; cx < width; cx += tile) {
    for (let cy = y; cy < height; cy += tile) {
      dots.push([cx, cy])
    }
  }
  return dots
}
