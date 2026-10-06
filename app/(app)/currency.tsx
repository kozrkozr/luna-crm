import { Pressable, ScrollView, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { Icon } from '../../src/components/ui/icon'
import { Text } from '../../src/components/ui/text'
import { Starfield } from '../../src/components/Starfield'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { failed, selected, tapped } from '../../src/lib/haptics'
import { useCurrencySwitch } from '../../src/features/account/currency'
import { CURRENCIES, currencySymbol } from '../../src/features/shoots/money'

/**
 * `US-047` AC-4 — «Валюта», pushed from the profile like «Сповіщення» and
 * drawn with the same «‹ Профіль» header (owner, 2026-10-06).
 *
 * The five currencies as rows — symbol, name, code — the current one ticked.
 * A tap saves at once: no save button, as on «Сповіщення». The line under the
 * list says what changing it does, because the number staying put is the part
 * nobody would guess.
 */
export default function CurrencyScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const currencySwitch = useCurrencySwitch()

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-background border-border border-b" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-1.5 px-2 pb-2 pt-1">
          <Pressable
            className="active:bg-secondary min-h-11 w-[88px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
            onPress={() => {
              tapped()
              if (router.canGoBack()) router.back()
              else router.replace('/(app)/(tabs)/profile')
            }}
            role="button"
            accessibilityLabel={t.profileTitle}
          >
            <Icon as={ChevronLeft} size={16} strokeWidth={1.9} className="text-muted-foreground" />
            <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
              {t.profileTitle}
            </Text>
          </Pressable>
          <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
            {t.currencyTitle}
          </Text>
          <View className="w-[88px] shrink-0" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 10 }}>
        <View className="bg-card border-border overflow-hidden rounded-xl border">
          {CURRENCIES.map((code, index) => {
            const active = currencySwitch?.currency === code
            return (
              <Pressable
                key={code}
                className={`active:bg-secondary min-h-[52px] flex-row items-center gap-3 px-4 ${
                  index > 0 ? 'border-border border-t' : ''
                }`}
                disabled={!currencySwitch}
                onPress={() => {
                  if (!currencySwitch || active) return
                  selected()
                  void currencySwitch.setCurrency(code).then((ok) => {
                    if (!ok) failed()
                  })
                }}
                role="radio"
                accessibilityState={{ selected: active }}
              >
                <Text className="text-body text-muted-foreground w-7 font-semibold">
                  {currencySymbol(code)}
                </Text>
                <Text className="text-body-sm text-foreground flex-1">
                  {t.currencyNames[index]}
                </Text>
                <Text className="text-label text-muted-foreground">{code}</Text>
                <View className="w-5 items-end">
                  {active ? (
                    <Icon as={Check} size={18} strokeWidth={2.2} className="text-foreground" />
                  ) : null}
                </View>
              </Pressable>
            )
          })}
        </View>
        <Text className="text-label text-muted-foreground px-1">{t.currencyHint}</Text>
      </ScrollView>
    </View>
  )
}
