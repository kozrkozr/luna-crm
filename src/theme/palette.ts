/**
 * The few palette values that cannot be a Tailwind class.
 *
 * Everything the app styles goes through `global.css` and NativeWind. Three
 * things cannot:
 *
 *   1. `@react-navigation`'s native header and screen background, which take
 *      colour strings through `screenOptions`. A white native header above the
 *      dark frame is the single most visible thing a class cannot reach.
 *   2. The avatar tint palette, chosen by hash at runtime rather than written
 *      into markup (design system §3.1).
 *   3. Native component props that take a colour — `placeholderTextColor`,
 *      `ActivityIndicator`'s `color`.
 *
 * They live here rather than in the files that need them so that src/theme/
 * remains the only directory a colour value appears in (README, Layout). Adding
 * a hex anywhere else is still wrong; the answer is to add it here and import.
 *
 * These duplicate values from global.css, which is a real cost — change one and
 * the other is silently stale. The alternative is worse: parsing CSS variables
 * at runtime, which NativeWind gives no supported way to do on native. The
 * duplication is small, listed in one place, and every entry names its token.
 */

/** `--screen` — the frame. */
export const SCREEN = '#151517'
/** `--on-dark` — text on the frame. */
export const ON_DARK = '#FFFFFF'
/** `--on-dark-secondary` — field labels, date headings. */
export const ON_DARK_SECONDARY = '#C9C9CC'
/** `--on-dark-muted` — muted text on the frame. */
export const ON_DARK_MUTED = '#8F8F93'
/** `--ink-muted` — secondary text on a white card. Placeholders. */
export const INK_MUTED = '#6E6E73'

/**
 * Native header and navigator theme.
 *
 * `headerShadowVisible: false` because the design separates surfaces with a
 * hairline or not at all (§3.5) — an iOS hairline under a dark header reads as
 * a seam. `contentStyle` matters as much as the header: without it the
 * navigator paints its own white behind a screen during a transition, and the
 * push animation flashes.
 */
export const navigationScreenOptions = {
  headerStyle: { backgroundColor: SCREEN },
  headerTintColor: ON_DARK,
  headerTitleStyle: { color: ON_DARK },
  headerLargeTitleStyle: { color: ON_DARK },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: SCREEN },
} as const

/**
 * Avatar tints, picked by hashing the initials (§3.1).
 *
 * Every one of these gives 15.6–16.5 against `--ink`, so dark initials or an
 * emoji are safe on all six without checking which was chosen.
 */
export const AVATAR_TINTS = [
  '#F6ECD9',
  '#FBE4EA',
  '#E6EEFC',
  '#E6F4DF',
  '#EEE7FB',
  '#FAEEDA',
] as const

/**
 * A stable tint for a name.
 *
 * Deliberately not random: the same person keeps their colour between renders
 * and between screens, which is the only reason a decorative tint is worth
 * having at all.
 */
export function avatarTint(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]
}
