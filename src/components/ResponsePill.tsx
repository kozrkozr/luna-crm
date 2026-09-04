import { View } from 'react-native'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import CircleCheck from 'lucide-react-native/icons/circle-check'
import { Icon } from './ui/icon'
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
 * ── Rebuilt against `Shoot Detail v3.dc.html` (owner, 2026-09-03) ────────────
 *
 * **«Очікує» is not drawn any more.** v3 gates the badge on `hasBadge`, which is
 * true only when a person has confirmed — so a crew member who has not answered
 * carries no chip at all. The count above the list («2 з 4 підтвердили») is what
 * reports the shortfall, and it does it once rather than once per row.
 *
 * That is a quieter list, and the reasoning holds: a row with nothing on it is
 * the default state, and marking the default is what made three chips compete
 * for attention when only one of them is news.
 *
 * **`declined` keeps its chip**, which v3 has no case for. Its fixture crew are
 * only `confirmed: true | false`, so the artboard never had to decide — but
 * `US-008` defines three answers, and a refusal is not the same news as a
 * silence. Hiding it would make a crew member who said no look exactly like one
 * who has not opened their link, which is the one confusion this row exists to
 * prevent. Logged rather than followed.
 *
 * The shape is v3's: radius 6 rather than a full pill, `4px 8px`, 11px/500, and
 * a 12px check inside the confirmed chip.
 */

/** v3's check-circle, 12px, inside the confirmed chip at a 5px gap. */
const CHECK_SIZE = 12

export function ResponsePill({
  value,
  label,
  showPending = false,
}: {
  value: CrewMember['response']
  label: string
  /**
   * Render a chip for `pending` too, using `label`.
   *
   * The link view needs it for **one** row: the viewer's own, which reads
   * «Ваша черга» rather than «Очікує» — «Очікує» is what other people are
   * doing, and the person reading is the one who has to act. Every other
   * unanswered row stays bare, on both screens.
   */
  showPending?: boolean
}) {
  // No chip for a silence — see the note above — unless it is the reader's own.
  if (value === 'pending' && !showPending) return null

  const confirmed = value === 'confirmed'

  return (
    <View
      className={`shrink-0 flex-row items-center gap-[5px] rounded-md border px-2 py-1 ${
        confirmed
          ? 'bg-primary border-primary'
          : value === 'declined'
            ? 'bg-destructive/10 border-destructive/40'
            : 'border-border-strong'
      }`}
    >
      {confirmed ? (
        <Icon
          as={CircleCheck}
          size={CHECK_SIZE}
          strokeWidth={2}
          className="text-primary-foreground"
        />
      ) : null}
      <Text
        numberOfLines={1}
        className={`text-caption font-medium ${
          confirmed
            ? 'text-primary-foreground'
            : value === 'declined'
              ? 'text-destructive'
              : 'text-foreground/85'
        }`}
      >
        {label}
      </Text>
    </View>
  )
}
