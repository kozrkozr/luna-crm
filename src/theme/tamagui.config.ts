import { createAnimations } from '@tamagui/animations-react-native'
import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

/**
 * Stock Tamagui, deliberately.
 *
 * S-1 asks whether Tamagui reaches the "authentic Apple look" bar (ADR-010,
 * risks.md R-1). Answering that means judging Tamagui's *own* components and
 * *own* theme — a custom palette on top would hide the very thing under test.
 * The prototype (docs/product/prototype/index.html) is therefore used here for
 * UX only: what a screen contains and where it sits. Colour and chrome come
 * from the default theme.
 *
 * Re-theming to the prototype's palette is a separate task. The seam is this
 * file: swap `themes` and nothing in the screens changes, because no screen
 * hardcodes a colour — they use semantic tokens ($background, $borderColor,
 * $color11) and colour sub-themes (<Theme name="green">).
 */

/**
 * `defaultConfig` ships the CSS animation driver, which is web-only — on iOS
 * every Sheet, Dialog, AlertDialog and Select transition would land without
 * animation. Swapped for the React Native driver, which drives both targets
 * (JS-driven on web instead of CSS, an acceptable trade for one code path in a
 * spike). Pure JS, so Expo Go still runs it with no native module.
 */
const animations = createAnimations({
  '100ms': { type: 'timing', duration: 100 },
  '200ms': { type: 'timing', duration: 200 },
  quick: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 18, mass: 1, stiffness: 160 },
  slow: { type: 'spring', damping: 20, stiffness: 60 },
  bouncy: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  lazy: { type: 'spring', damping: 20, stiffness: 60 },
  tooltip: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
})

export const config = createTamagui({
  ...defaultConfig,
  animations,
})

export type LunaConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends LunaConfig {}
}

export default config
