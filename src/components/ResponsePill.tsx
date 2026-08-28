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
 * Tones:
 *
 * - `pending` → **warning**. The one the design system specifies: §3.1 names
 *   `warning-bg` as the fill of the «Очікує» chip.
 * - `confirmed` → `status-finished`, and `declined` → destructive. Neither
 *   appears in any mockup, so these keep exactly the pairing the code already
 *   used and are not a new decision. Worth revisiting if the design ever covers
 *   them: pink for "confirmed" reads oddly, and the system's unused green
 *   (`progress`) is the obvious candidate — but adding a scale for it would be
 *   inventing, so it waits.
 *
 * No border, matching `StatusPill` and §5.3: these fills carry their own text
 * at 4.75:1 or better and need no outline to separate from a white card.
 */
const TONE: Record<CrewMember['response'], string> = {
  pending: 'bg-warning-bg',
  confirmed: 'bg-status-finished-bg',
  declined: 'bg-destructive/10',
}

const TONE_TEXT: Record<CrewMember['response'], string> = {
  pending: 'text-warning-fg',
  confirmed: 'text-status-finished-fg',
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
