import { View } from 'react-native'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { plural } from '../shoots/home'
import { useAccess } from './access'

const DAY_MS = 24 * 3600 * 1000

/**
 * Web — `TrialBanner.tsx`'s banner, the days left and nothing to open: the web
 * has no «Підписка» screen (`US-040` AC-6), so it is not a button and carries
 * no chevron (owner, 2026-10-16: "показувати без переходу").
 */
export function TrialBanner() {
  const t = useStrings()
  const { subscription } = useAccess()
  const onTrial =
    subscription?.kind === 'trial' || (subscription?.kind === 'wontRenew' && subscription.trial)
  if (!onTrial || !subscription || !('until' in subscription)) return null

  const days = Math.max(1, Math.ceil((Date.parse(subscription.until) - Date.now()) / DAY_MS))

  return (
    <View className="border-border bg-card min-h-10 flex-row items-center gap-[9px] border-t px-3.5">
      <View className="bg-link h-1.5 w-1.5 rounded-full" />
      <Text className="text-body-sm text-foreground/85 min-w-0 flex-1" numberOfLines={1}>
        {t.trialBannerTemplate.replace('{days}', `${days} ${plural(days, t.dayForms)}`)}
      </Text>
    </View>
  )
}
