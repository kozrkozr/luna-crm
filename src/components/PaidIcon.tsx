import { View } from 'react-native'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'

/**
 * `US-060` AC-5 — the banknote after the client's name on a calendar card, and
 * on the home screen's cards (owner, 2026-10-19).
 *
 * `Calendar.dc.html`, `paidView` = «Іконка оплати з галочкою»: the 💵 emoji
 * with a green check when paid, and with an amber «!» when not. **The unpaid
 * one is only translucent** — the artboard also greys it with a CSS
 * `grayscale` filter, which React Native cannot apply to an emoji (owner,
 * 2026-10-17; a drawn vector banknote was tried first and read unlike the
 * artboard).
 *
 * The badge's ring is the card's own colour, so it reads as cut out of the
 * emoji rather than laid on it — the artboard's `border:1.5px solid
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
      <Text
        className={`text-[15px] leading-[18px] ${paid ? '' : 'opacity-60'}`}
        importantForAccessibility="no"
      >
        💵
      </Text>
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
