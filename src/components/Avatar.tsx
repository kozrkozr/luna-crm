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
 * One surface, not a hashed tint. ADR-017's system gave every avatar one of six
 * warm colours picked by hashing the name; that palette went with the rest of it
 * on 2026-08-29, and RNR has no equivalent scale. `secondary` is the stock
 * raised surface, and `secondary-foreground` reads on it by construction.
 *
 * `ring` draws the client's 2px surround (§5.7). The ring colour has to be
 * passed as a class rather than assumed: on a white card it is `client-ring`,
 * and in an overlapping stack it must be the colour of the card *behind* it, or
 * a purple client card gets white halos.
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

export function Avatar({ name, size = 38, className }: Props) {
  const label = initials(name)
  return (
    <View
      className={`bg-secondary shrink-0 items-center justify-center rounded-full ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {/*
        lineHeight pinned to the font size: without it Android adds its own
        leading and the initials sit low in the circle. The same trap the design
        system flags for emoji avatars applies to text ones.
      */}
      <Text
        className="text-secondary-foreground font-semibold"
        style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.36) }}
      >
        {label}
      </Text>
    </View>
  )
}
