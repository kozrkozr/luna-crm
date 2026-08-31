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
 * **These are React Native Reusables' stock dark values**, hex forms of the HSL
 * triplets in global.css — the app returned to RNR's defaults on 2026-08-29.
 * They duplicate that file, which is a real cost: change one and the other is
 * silently stale. The alternative is parsing CSS variables at runtime, which
 * NativeWind gives no supported way to do on native. The duplication is small
 * and every entry names its token.
 */

/** `--background` / `--card` — 0 0% 3.9%. */
export const BACKGROUND = '#0A0A0A'
/** `--foreground` — 0 0% 98%. */
export const FOREGROUND = '#FAFAFA'
/** `--muted-foreground` — 0 0% 63.9%. Placeholders and secondary text. */
export const MUTED_FOREGROUND = '#A3A3A3'
/** `--secondary` / `--muted` / `--border` — 0 0% 14.9%. */
export const SECONDARY = '#262626'

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
