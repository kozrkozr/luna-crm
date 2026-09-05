/**
 * The few palette values that cannot be a Tailwind class.
 *
 * Everything the app styles goes through `global.css` and NativeWind. Two
 * things cannot: `@react-navigation`'s native header and screen background,
 * which take colour strings through `screenOptions`, and native component props
 * that take a colour (`placeholderTextColor`, `ActivityIndicator`'s `color`).
 *
 * They live here rather than in the files that need them so that src/theme/
 * remains the only directory a colour value appears in (README, Layout).
 *
 * **These are the 2026-09-04 design handoff's values**, hex forms of the HSL
 * triplets in global.css. They duplicate that file, which is a real cost:
 * change one and the other is silently stale. The alternative is parsing CSS
 * variables at runtime, which NativeWind gives no supported way to do on
 * native. The duplication is small and every entry names its token.
 */

/** `--background` — 239 5.3% 2.8%. Note this is no longer also `--card`. */
export const BACKGROUND = '#070708'
/** `--foreground` — 238 8.2% 98.1%. */
export const FOREGROUND = '#FAFAFB'
/** `--muted-foreground` — 238 1.6% 64.9%. Placeholders and secondary text. */
export const MUTED_FOREGROUND = '#A4A4A7'
/** `--secondary` / `--card` / `--popover` — 239 4% 7.5%. */
export const SECONDARY = '#121214'

/**
 * Native header and navigator theme.
 *
 * `headerShadowVisible: false` because RNR's dark theme separates surfaces with
 * a border rather than a shadow, and an iOS hairline under a dark header reads
 * as a seam. `contentStyle` matters as much as the header: without it the
 * navigator paints its own white behind a screen during a transition, and the
 * push animation flashes.
 */
export const navigationScreenOptions = {
  headerStyle: { backgroundColor: BACKGROUND },
  headerTintColor: FOREGROUND,
  headerTitleStyle: { color: FOREGROUND },
  headerLargeTitleStyle: { color: FOREGROUND },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: BACKGROUND },
} as const
