import { Pressable, View } from 'react-native'
import { Text } from '../../components/ui/text'
import { useLanguageSwitch, useStrings } from '../../i18n/LanguageProvider'
import type { Language } from '../../i18n'
import { selected } from '../../lib/haptics'

/** `US-046` AC-2 — the two segments, in this order. Codes, so not translated. */
const OPTIONS: { language: Language; label: string }[] = [
  { language: 'uk', label: 'UA' },
  { language: 'en', label: 'EN' },
]

/**
 * The bar across the top of every link page: the product mark on the left, the
 * UA / EN switch on the right (`US-046`, owner 2026-10-06).
 *
 * It used to live inside `ShootLinkView` and say «Приватне посилання» where the
 * switch now is. It moved up to `app/s/_layout.tsx` so that AC-4's "every link
 * page" holds by construction — a crew member's page, all references and the
 * broken-link page had no bar at all. The privacy warning is still said at the
 * foot of the shoot page.
 */
export function LinkBar() {
  const t = useStrings()
  const languageSwitch = useLanguageSwitch()

  return (
    <View className="bg-background border-border flex-row items-center gap-2.5 border-b px-4 py-3">
      <View className="bg-secondary h-[26px] w-[26px] items-center justify-center rounded-md">
        <Text className="text-caption text-foreground font-semibold">{t.appName.slice(0, 1)}</Text>
      </View>
      <Text className="text-body text-foreground flex-1 font-semibold">{t.appName}</Text>
      {languageSwitch ? (
        /*
          The sign-in screen's segmented control, small: a `secondary` track and
          the page colour showing through under the current segment.
        */
        <View className="bg-secondary border-border flex-row rounded-lg border p-[3px]">
          {OPTIONS.map(({ language, label }) => {
            const active = languageSwitch.language === language
            return (
              <Pressable
                key={language}
                className={`items-center rounded-sm px-2.5 py-1 ${active ? 'bg-background' : ''}`}
                onPress={() => {
                  if (active) return
                  selected()
                  void languageSwitch.setLanguage(language)
                }}
                role="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={language === 'uk' ? 'Українська' : 'English'}
              >
                <Text
                  className={`text-caption font-semibold ${
                    active ? 'text-card-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
