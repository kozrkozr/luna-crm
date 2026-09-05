import { View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { Text } from './ui/text'
import { AVATAR_TINTS, emojiSize, type AvatarTint } from '../features/auth/avatar'

/**
 * An avatar: initials tinted by hashing the name, or a chosen emoji.
 *
 * **Initials remain the default, and for the original reason.** The mockups
 * drew emoji picked by hashing a name, which asserts a skin tone, gender and
 * age the person never gave — redesign-log F-4. Initials are derivable from
 * what someone actually told us; a hashed emoji is invented.
 *
 * **`emoji` is the exception that argument always allowed** (owner,
 * 2026-09-05). It is set only from `Edit Profile.dc.html`'s picker, by the
 * account holder, about themselves — nothing is invented, it is supplied, which
 * is the same line `20260831120000_profile_editing.sql` drew for an uploaded
 * photo. Crew, clients and contacts pass no `emoji` and cannot: nobody has
 * chosen one for them.
 *
 * This file used to argue that "an emoji would have to be invented per person".
 * That was true while nothing in the data model could hold one. `users` holds
 * one now, so the sentence has stopped being an argument against the feature
 * and become the reason it is limited to a single person.
 *
 * **A hashed pastel tint again since 2026-09-04** — "Аватари: пастельна заливка
 * з `--chart-1…5` (персик, рожевий, мʼята, лаванда, небесний), ініціали
 * `text-tint-foreground`. Колір вибирай детерміновано за хешем імені."
 *
 * This restores what ADR-017 had and the 2026-08-29 reset removed, with five
 * tints rather than six and from a named source rather than invented. The flat
 * `bg-secondary` it replaces would have gone nearly invisible anyway: in this
 * theme `--secondary` equals `--card`, so an avatar on a crew card had no edge
 * left (src/theme/global.css).
 *
 * These five are the only light surfaces in the app, which is why the initials
 * take `--tint-foreground` — a dark blue-grey ink — instead of any
 * `*-foreground` token, all of which are near-white here.
 *
 * `ring` draws the client's 2px surround (§5.7). The ring colour has to be
 * passed as a class rather than assumed: in an overlapping stack it must be the
 * colour of the card *behind* it, or the avatars get haloes.
 */
type Props = {
  name: string
  /** Diameter in points. The design uses 26 / 32 / 34 / 38 / 64 / 72 / 112. */
  size?: number
  /** Extra classes — a ring, usually. */
  className?: string
  /**
   * The account holder's chosen emoji, with the background it sits on.
   *
   * Both halves or neither — a `users_avatar_one_of` guarantee, resolved by
   * `resolveAvatar`. Absent everywhere except the four surfaces that draw the
   * account holder themselves.
   */
  emoji?: { char: string; tint: AvatarTint } | null
}

/**
 * Up to two initials.
 *
 * Splits on whitespace, so «Ірина Ковальчук» gives «ІК» and a single-word name
 * gives one letter. Uses the first character of each part rather than a locale
 * uppercase pass: Ukrainian needs none, and `toLocaleUpperCase` without a
 * locale argument is one of the classic Turkish-İ bugs.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/**
 * The five tints, written out as whole class names.
 *
 * They cannot be built as `` `bg-chart-${n}` `` — Tailwind scans source files
 * for literal strings, so an interpolated class is never generated and the
 * avatar comes out transparent. The same silent failure `ResponsePill`
 * documents from the ADR-017 rename.
 */
const TINTS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'] as const

/**
 * Pick a tint for a name — the same name always gets the same colour.
 *
 * Deterministic and stable across sessions and devices, which a random or
 * insertion-order pick would not be: a crew member has to look like the same
 * person on the creator's screen and in the link view, and those render from
 * different queries.
 *
 * djb2 over UTF-16 code units. `>>> 0` after each step keeps the value in
 * unsigned 32-bit range — without it the multiply overflows into a float and
 * two different names can collapse onto one hash. Code units rather than
 * characters is fine here and matters for Ukrainian: «Ірина» and «Іван» differ
 * in the first code unit either way.
 */
function tintFor(name: string): string {
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = ((hash * 33) ^ name.charCodeAt(i)) >>> 0
  }
  return TINTS[hash % TINTS.length]
}

export function Avatar({ name, size = 38, className, emoji }: Props) {
  const label = initials(name)

  if (emoji) {
    const [from, to] = AVATAR_TINTS[emoji.tint]
    const glyph = emojiSize(size)
    return (
      <View
        className={`shrink-0 items-center justify-center overflow-hidden rounded-full ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        {/*
          The gradient, drawn rather than styled: React Native has no
          `linear-gradient`, and `react-native-svg` is already in the tree — so
          this needs no new native module and no rebuild, which is what
          `expo-linear-gradient` would have cost for one shape.

          `160deg` in CSS runs top-left-ish to bottom-right-ish; SVG's
          objectBoundingBox coordinates express the same direction as x1/y1 →
          x2/y2. A Rect rather than a Circle: the parent already clips to a
          circle with `overflow-hidden` and `rounded-full`, so the paint only
          has to cover the box.
        */}
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="avatarTint" x1="0.18" y1="0" x2="0.82" y2="1">
              <Stop offset="0" stopColor={from} />
              <Stop offset="1" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect width={size} height={size} fill="url(#avatarTint)" />
        </Svg>
        {/*
          **`lineHeight` is 1.2× the font size, not 1×** (owner saw the tops
          clipped, 2026-09-05).

          §5.7 says «емодзі як аватар — на Android вертикальне центрування
          ламається. Задай `lineHeight` = розміру шрифту», and that was followed
          literally. It is the right fix for the *initials* below, whose glyphs
          fit inside the em box — but an emoji does not. Its artwork is drawn
          taller than its em square, so a line box exactly one em high clips the
          top of it, which is what a circle with a flat-topped 🌙 in it looks
          like.

          CSS `line-height:1` in the artboard does not clip because a CSS line
          box does not crop its own glyphs; React Native's `Text` does. So the
          rule survives — pin the line height so Android cannot add its own
          leading — with enough room for the glyph to be whole. Centring is the
          parent's job here anyway, so the extra 20% stays symmetric.

          `includeFontPadding: false` is Android-only and ignored on iOS; it
          drops the extra font metrics padding that would otherwise reintroduce
          the offset this is fixing.
        */}
        <Text
          style={{
            fontSize: glyph,
            lineHeight: Math.round(glyph * 1.2),
            textAlign: 'center',
            includeFontPadding: false,
          }}
        >
          {emoji.char}
        </Text>
      </View>
    )
  }

  return (
    <View
      className={`${tintFor(name)} shrink-0 items-center justify-center rounded-full ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {/*
        lineHeight pinned to the font size: without it Android adds its own
        leading and the initials sit low in the circle. The same trap the design
        system flags for emoji avatars applies to text ones.
      */}
      <Text
        className="text-tint-foreground font-semibold"
        style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.36) }}
      >
        {label}
      </Text>
    </View>
  )
}
