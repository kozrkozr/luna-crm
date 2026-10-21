import { View } from 'react-native'
import { Button } from '../../components/ui/button'
import { Sheet } from '../../components/ui/sheet'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { useDesktopShell } from '../../lib/desktop'
import { useAccess } from './access'
import { AppStoreGet } from './AppStoreGet'

/**
 * `US-072` AC-4 — web only: what a create, edit or delete without access opens
 * instead of the paywall (`useGuard`). A dialog in the middle on a desktop
 * (`SubscriptionNeeded`, 460 wide), a sheet from the bottom on a phone
 * (`SubscriptionNeededPhone`) — `Sheet` already does both. Mounted once, in
 * `AppShell.web`.
 */
export function SubscriptionNeeded() {
  const t = useStrings()
  const { subscriptionNeeded, setSubscriptionNeeded } = useAccess()
  const desktop = useDesktopShell()
  const close = () => setSubscriptionNeeded(false)

  return (
    <Sheet open={subscriptionNeeded} onClose={close} width={460} className={desktop ? 'p-7' : 'px-5'}>
      <View className="items-center gap-5 pb-2">
        <View className="gap-2.5">
          <Text className="text-display text-foreground text-center font-bold">{t.subscriptionNeededTitle}</Text>
          <Text className="text-subtitle text-muted-foreground text-center" style={{ lineHeight: 22 }}>
            {t.subscriptionNeededLine}
          </Text>
        </View>
        <AppStoreGet centered />
        <Button variant="outline" size="cta" className="w-full rounded-full" onPress={close}>
          <Text>{t.subscriptionNeededClose}</Text>
        </Button>
      </View>
    </Sheet>
  )
}
