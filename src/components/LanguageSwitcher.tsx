import { View } from 'react-native'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { useLanguageSwitch } from '../i18n/LanguageProvider'
import type { Language } from '../i18n'

/**
 * `US-015` — the UA / EN toggle, from the prototype's `langSwitchHtml`: two
 * short codes in the account header with the current one marked.
 *
 * The labels are not translated and are not in the dictionary. «UA» and «EN»
 * name the languages themselves, so they read the same in either — the
 * prototype writes them as literals for the same reason.
 *
 * Renders nothing without a provider, which is how `EP-05`'s scope holds: on
 * the link surface and the auth screens there is no account to remember a
 * choice, so there is no control to press. The switcher's absence there is a
 * consequence of the provider's placement rather than a rule this file applies.
 */
export function LanguageSwitcher() {
  const context = useLanguageSwitch()
  if (!context) return null

  const { language, setLanguage } = context

  return (
    <View className="flex-row gap-1">
      {(['uk', 'en'] as const).map((code) => (
        <Option
          key={code}
          code={code}
          label={code === 'uk' ? 'UA' : 'EN'}
          active={language === code}
          onPress={() => void setLanguage(code)}
        />
      ))}
    </View>
  )
}

function Option({
  code,
  label,
  active,
  onPress,
}: {
  code: Language
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      onPress={onPress}
      // Named for a screen reader, and distinct per language so a test — and a
      // person — can tell the two apart by more than their position.
      accessibilityLabel={code === 'uk' ? 'Українська' : 'English'}
      accessibilityState={{ selected: active }}
    >
      <Text className={active ? 'text-xs font-bold' : 'text-muted-foreground text-xs'}>
        {label}
      </Text>
    </Button>
  )
}
