import { View } from 'react-native'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { useAccess } from './access'

/**
 * Web — «Режим перегляду» alone: the web offers no subscription (`US-040`
 * AC-6), so there is no «Оформити підписку», no chevron, nothing to press.
 * Interim, until `ADR-024` open question 1 (a newcomer on the web) settles what
 * an account without access sees here (owner, 2026-10-16).
 */
export function ViewModeBanner() {
  const t = useStrings()
  const { hasAccess } = useAccess()
  if (hasAccess !== false) return null

  return (
    <View className="border-warn-border bg-warn-bg min-h-10 flex-row items-center border-t px-3.5">
      <Text className="text-body-sm text-warn min-w-0 flex-1" numberOfLines={1}>
        {t.viewModeBanner}
      </Text>
    </View>
  )
}
