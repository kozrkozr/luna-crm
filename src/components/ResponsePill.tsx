import { View } from 'react-native'
import { Text } from './ui/text'
import type { CrewMember } from '../features/crew/api'

/**
 * A crew member's answer to their invitation (`US-008`).
 *
 * Extracted here because the same three-state pill was written twice — on the
 * creator's shoot screen and in the crew link view — and the two copies had
 * already been edited independently. Renaming the status tokens in `ADR-017`
 * broke both silently: an unmatched Tailwind class is not an error, it simply
 * styles nothing, so the pills went transparent rather than failing loudly.
 * That is the argument for one copy.
 *
 * **Monochrome since 2026-08-30** (owner), and this is exactly the pair the
 * shoot-detail handoff draws:
 *
 * - `confirmed` — **solid `#fafafa` with `#18181b` text**, i.e. `primary` and
 *   `primary-foreground`. The brightest thing in a crew row, which is right:
 *   it is the answer the row exists to report.
 * - `pending` — **outlined**, border `#3f3f46` (`border-strong`), text
 *   `#d4d4d8`. It stays the one bordered chip in the app, as it was when it was
 *   amber; only the hue is gone.
 * - `declined` — `destructive`, still the one state no mockup covers. It keeps
 *   its hue because `--destructive` survived the monochrome pass: the handoff
 *   has a red of its own for refusals.
 *
 * The green `confirmed` and amber `pending` scales this used are gone from
 * src/theme/global.css.
 */
const TONE: Record<CrewMember['response'], string> = {
  pending: 'border-border-strong border',
  confirmed: 'bg-primary',
  declined: 'bg-destructive/10',
}

const TONE_TEXT: Record<CrewMember['response'], string> = {
  pending: 'text-foreground/85',
  confirmed: 'text-primary-foreground',
  declined: 'text-destructive',
}

export function ResponsePill({
  value,
  label,
}: {
  value: CrewMember['response']
  label: string
}) {
  return (
    <View className={`shrink-0 rounded-full px-2.5 py-1 ${TONE[value]}`}>
      <Text numberOfLines={1} className={`text-caption font-bold ${TONE_TEXT[value]}`}>
        {label}
      </Text>
    </View>
  )
}
