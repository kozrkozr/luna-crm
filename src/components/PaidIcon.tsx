import { View } from 'react-native'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Banknote from 'lucide-react-native/icons/banknote'
import Check from 'lucide-react-native/icons/check'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'

/**
 * `US-060` AC-5 — the banknote after the client's name on a calendar card.
 *
 * `Calendar.dc.html`, `paidView` = «Іконка оплати з галочкою»: in colour with a
 * green check when paid, dimmed with an amber «!» when not. **A drawn icon, not
 * the artboard's 💵** (owner, 2026-10-16): the artboard greys the emoji with a
 * CSS `grayscale` filter, which React Native cannot apply to an emoji.
 *
 * The badge's ring is the card's own colour, so it reads as cut out of the
 * icon rather than laid on it — the artboard's `border:1.5px solid
 * var(--surface)`.
 *
 * Only for a shoot with a price; the caller decides that (AC-6).
 */
export function PaidIcon({ paid }: { paid: boolean }) {
  const t = useStrings()
  return (
    <View
      accessible
      accessibilityLabel={paid ? t.paidValue : t.notPaidLabel}
      className="h-5 w-5 items-center justify-center"
    >
      <Icon
        as={Banknote}
        size={17}
        strokeWidth={1.7}
        className={paid ? 'text-success' : 'text-muted-foreground opacity-60'}
      />
      <View
        className={`border-card absolute -bottom-[3px] -right-1 h-[11px] w-[11px] items-center justify-center rounded-full border-[1.5px] ${
          paid ? 'bg-success' : 'bg-warn'
        }`}
      >
        {paid ? (
          <Icon as={Check} size={7} strokeWidth={4} className="text-success-foreground" />
        ) : (
          <Text className="text-background text-[7px] font-bold leading-[8px]">!</Text>
        )}
      </View>
    </View>
  )
}
