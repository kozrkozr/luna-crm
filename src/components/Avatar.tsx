import { View } from 'react-native'
import { Text } from './ui/text'

/**
 * An initials avatar, tinted by hashing the name (design system §5.8, §3.1).
 *
 * Initials rather than the mockups' emoji, on purpose. The design system's own
 * §5.7 warns that an emoji used as an avatar breaks vertical centring on
 * Android and suggests `lineHeight` equal to `fontSize` or initials instead.
 * The deeper reason is that the mockups' emoji are fixtures — real crew have
 * names, and nothing in the data model holds an emoji for a person. Initials
 * are derivable; an emoji would have to be invented per person.
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
  /** Diameter in points. The design uses 26 / 32 / 34 / 38 / 64. */
  size?: number
  /** Extra classes — a ring, usually. */
  className?: string
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

export function Avatar({ name, size = 38, className }: Props) {
  const label = initials(name)
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
