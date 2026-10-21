import { Pressable, View } from 'react-native'
import Eye from 'lucide-react-native/icons/eye'
import { Icon } from '../../components/ui/icon'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { useDesktop } from '../../lib/desktop'
import { openExternalUrl } from '../../lib/openExternalUrl'
import { useAccess } from './access'
import { APP_STORE_URL } from './appStoreArt'

/**
 * Web — `US-072` AC-3: the web sells no subscription (`ADR-024` decision 4),
 * so the banner says where to get one and opens the App Store (`ADR-028`).
 * A row on a desktop, as `MainReadOnly` draws it; on a phone the button goes
 * under the line, as `MainReadOnlyPhone` does. Inset to `TabHeader`'s gutters.
 */
export function ViewModeBanner() {
  const t = useStrings()
  const desktop = useDesktop()
  const { hasAccess } = useAccess()
  if (hasAccess !== false) return null

  const button = (
    <Pressable
      role="link"
      onPress={() => void openExternalUrl(APP_STORE_URL)}
      className={`border-info-border h-10 justify-center rounded-full border px-4 active:opacity-70 ${
        desktop ? '' : 'ml-8 self-start'
      }`}
    >
      <Text className="text-body text-foreground font-semibold">{t.viewModeOpenAppStore}</Text>
    </Pressable>
  )

  return (
    <View
      role="status"
      className={`bg-info-bg border-info-border rounded-2xl border p-4 ${
        desktop ? 'mx-10 mb-5 mt-3 flex-row items-center gap-3.5' : 'mx-3.5 mb-3 mt-1.5 gap-3'
      }`}
    >
      <View className={`min-w-0 flex-row items-start gap-3 ${desktop ? 'flex-1' : ''}`}>
        <Icon as={Eye} className="text-info mt-0.5" size={20} />
        <Text className="text-subtitle text-foreground min-w-0 flex-1" style={{ lineHeight: 22 }}>
          <Text className="text-subtitle text-foreground font-semibold">{t.viewModeWebLead}</Text>
          {` ${t.viewModeWebLine}`}
        </Text>
      </View>
      {button}
    </View>
  )
}
