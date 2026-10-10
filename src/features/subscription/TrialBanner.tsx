import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { tapped } from '../../lib/haptics'
import { plural } from '../shoots/home'
import { useAccess } from './access'

const DAY_MS = 24 * 3600 * 1000

/**
 * `US-054` AC-4 — «Пробний період: залишилось N днів», under the home header,
 * opening «Підписка» (`US-053`). `Home.dc.html`, state «Пробний період»:
 *
 *     min-height:40px; padding:0 14px; border-top:1px solid var(--border);
 *     background:var(--surface-soft); color:var(--text-soft); font-size:12.5px
 *     a 6px `--link` dot before the text, a 6px chevron in --icon after it
 *
 * For a trial that will renew and for one cancelled in Apple's settings alike —
 * both are an account on the free trial. Days are counted up: with 30 hours
 * left it says «1 день», not «0».
 */
export function TrialBanner() {
  const t = useStrings()
  const router = useRouter()
  const { subscription } = useAccess()
  const onTrial =
    subscription?.kind === 'trial' || (subscription?.kind === 'wontRenew' && subscription.trial)
  if (!onTrial || !subscription || !('until' in subscription)) return null

  const days = Math.max(1, Math.ceil((Date.parse(subscription.until) - Date.now()) / DAY_MS))

  return (
    <Pressable
      className="border-border bg-card min-h-10 flex-row items-center gap-[9px] border-t px-3.5 active:opacity-80"
      onPress={() => {
        tapped()
        router.push('/(app)/subscription')
      }}
      role="button"
    >
      <View className="bg-link h-1.5 w-1.5 rounded-full" />
      <Text className="text-body-sm text-foreground/85 min-w-0 flex-1" numberOfLines={1}>
        {t.trialBannerTemplate.replace('{days}', `${days} ${plural(days, t.dayForms)}`)}
      </Text>
      <View
        className="border-muted-foreground h-1.5 w-1.5 border-r-[1.6px] border-t-[1.6px]"
        style={{ transform: [{ rotate: '45deg' }] }}
      />
    </Pressable>
  )
}
