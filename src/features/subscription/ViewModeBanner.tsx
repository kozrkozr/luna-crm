import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { tapped } from '../../lib/haptics'
import { useAccess } from './access'

/**
 * `US-052` AC-9 — «Режим перегляду · Оформити підписку», under the home
 * header, opening the paywall. `Home.dc.html`, state «Режим перегляду»:
 *
 *     min-height:40px; padding:0 14px; border-top:1px solid var(--warn-border);
 *     background:var(--warn-bg); color:var(--warn); font-size:12.5px
 *     «Оформити підписку» 600, var(--text); a 6px chevron in --warn
 *
 * Drawn only once the server has answered `false` — never while access is
 * still being read, so it does not flash on launch.
 */
export function ViewModeBanner() {
  const t = useStrings()
  const router = useRouter()
  const { hasAccess } = useAccess()
  if (hasAccess !== false) return null

  return (
    <Pressable
      className="border-warn-border bg-warn-bg min-h-10 flex-row items-center gap-1.5 border-t px-3.5 active:opacity-80"
      onPress={() => {
        tapped()
        router.push('/(app)/paywall')
      }}
      role="button"
    >
      <Text className="text-body-sm text-warn min-w-0 flex-1" numberOfLines={1}>
        {`${t.viewModeBanner} · `}
        <Text className="text-body-sm text-foreground font-semibold">{t.viewModeSubscribe}</Text>
      </Text>
      {/* The artboard's chevron: two 1.6px borders of a 6px square, turned 45°. */}
      <View
        className="border-warn h-1.5 w-1.5 border-r-[1.6px] border-t-[1.6px]"
        style={{ transform: [{ rotate: '45deg' }] }}
      />
    </Pressable>
  )
}
