/**
 * The account holder's avatar: a photo, a chosen emoji, or their initials.
 *
 * `Edit Profile.dc.html`'s picker (owner, 2026-09-05) — the eight backgrounds
 * and the forty-eight emoji are that artboard's own `EMOJI_BGS` and
 * `EMOJI_LIST`, taken as written.
 *
 * **This does not reopen redesign-log F-4.** That ruled out emoji avatars
 * picked by hashing a name, because a hash asserts a skin tone, gender and age
 * the person never gave. Everything here is chosen by the person it depicts,
 * which is the same distinction `20260831120000_profile_editing.sql` drew when
 * it allowed an uploaded photo. Crew, clients and contacts still get initials —
 * see `src/components/Avatar.tsx`.
 */

/**
 * The eight backgrounds, converted from the artboard's `oklch()` to sRGB hex.
 *
 * **The conversion is not optional.** `src/theme/global.css` records that
 * NativeWind's CSS-to-RN pass bails on `oklch()` and returns `undefined`, which
 * is not an error — an unparsed colour styles nothing and nothing reports it.
 * The theme's own tokens were converted once for exactly this reason; these are
 * converted here for the same one. Three pairs are sRGB-clipped (`teal`,
 * `rose`, `orange`), which is what the same header says happened to `--warn-bg`
 * and `--info-bg`.
 *
 * Both stops are kept rather than flattened to one colour: the artboard draws
 * `linear-gradient(160deg, …)` and the difference is visible at 112px in the
 * picker's preview. React Native has no gradient of its own — `Avatar` draws
 * these with `react-native-svg`, which is already in the tree.
 *
 * The keys are what `users.avatar_tint` stores. English, per CLAUDE.md rule 4,
 * and named for the hue rather than for a position, so reordering the palette
 * cannot silently repaint everybody's avatar.
 */
export const AVATAR_TINTS = {
  blue: ['#77C9F3', '#418AD1'],
  teal: ['#77E2C2', '#00A0A1'],
  green: ['#96E498', '#02A671'],
  purple: ['#C4A4FE', '#7866D2'],
  rose: ['#FF9495', '#CF5975'],
  orange: ['#FFA977', '#DF6A55'],
  amber: ['#FBC865', '#DB8833'],
  graphite: ['#4C4C58', '#232329'],
} as const satisfies Record<string, readonly [string, string]>

export type AvatarTint = keyof typeof AVATAR_TINTS

/** The palette in the artboard's order — what «ФОН» scrolls through. */
export const AVATAR_TINT_KEYS = Object.keys(AVATAR_TINTS) as AvatarTint[]

/**
 * A tint key read back from the database, or `null` for anything unrecognised.
 *
 * The column is `text` with no enum behind it, so a row written by an older or
 * newer build can name a tint this one does not have. An unknown key renders
 * initials rather than an emoji on no background — see `resolveAvatar`.
 */
export function isAvatarTint(value: string | null | undefined): value is AvatarTint {
  return typeof value === 'string' && value in AVATAR_TINTS
}

/**
 * `EMOJI_LIST` from the artboard: 48, which is exactly 8 rows of the grid's 6.
 *
 * Not a general emoji keyboard, and that is the design's decision rather than a
 * shortcut. A fixed set is why every avatar in the app can be assumed to render
 * at a known size on a known background; an arbitrary system emoji can be a ZWJ
 * sequence, a flag, or a skin-toned glyph that is none of the things this
 * palette was contrasted against.
 */
export const AVATAR_EMOJI = [
  '📷', '🎬', '🎞️', '🌙', '✨', '⭐',
  '🔥', '💫', '🎯', '🧭', '🌊', '🌿',
  '🍃', '🌸', '🌻', '🍊', '☕', '🥂',
  '🎧', '🎵', '🖤', '💙', '💜', '🤍',
  '🐈', '🐕', '🦊', '🦉', '🐬', '🦋',
  '🕊️', '🐝', '⚡', '🌈', '🪩', '🎈',
  '🧿', '🔮', '📍', '🗺️', '🏔️', '🏝️',
  '🛼', '🚲', '📼', '💿', '📀', '🖼️',
] as const

/**
 * How big the glyph is inside a circle of `size` points.
 *
 * **Exactly half the diameter**, which is not a guess: design-guidelines §5.8
 * tabulates 34→17, 38→19 and 64→32, and `Edit Profile.dc.html` draws 72→36 and
 * 112→58. One rule covers every size the app uses and every size it might add.
 *
 * §5.7's trap belongs to whoever renders this: «емодзі як аватар — на Android
 * вертикальне центрування ламається. Задай `lineHeight` = розміру шрифту». So
 * callers set `lineHeight` to this number, not to a multiple of it.
 */
export const emojiSize = (size: number): number => Math.round(size * 0.5)

/**
 * What the three avatar columns mean, resolved once.
 *
 * The database constraint (`users_avatar_one_of`) already guarantees the three
 * states are exclusive, so this is not defending against a row that holds both
 * — it is the single place that knows which state wins, so four call sites
 * cannot drift into three different answers.
 *
 * A photo outranks an emoji only because the constraint makes them mutually
 * exclusive; if a row ever holds both, something has bypassed the constraint
 * and the uploaded likeness is the safer thing to show.
 */
export type ResolvedAvatar =
  | { kind: 'photo'; path: string }
  | { kind: 'emoji'; emoji: string; tint: AvatarTint }
  | { kind: 'initials' }

export function resolveAvatar(profile: {
  avatarUrl: string | null
  avatarEmoji: string | null
  avatarTint: string | null
}): ResolvedAvatar {
  if (profile.avatarUrl) return { kind: 'photo', path: profile.avatarUrl }
  // Both halves, or neither. A tint this build does not know is treated as no
  // emoji at all rather than drawn on nothing.
  if (profile.avatarEmoji && isAvatarTint(profile.avatarTint)) {
    return { kind: 'emoji', emoji: profile.avatarEmoji, tint: profile.avatarTint }
  }
  return { kind: 'initials' }
}
