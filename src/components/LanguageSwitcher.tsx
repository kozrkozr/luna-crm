import { Pressable, View } from 'react-native'
import { Text } from './ui/text'
import { useLanguageSwitch } from '../i18n/LanguageProvider'
import { selected as tickSelection } from '../lib/haptics'
import type { Language } from '../i18n'

/**
 * `US-015` — the UA / EN toggle.
 *
 * Rebuilt as a **segmented control** for `Edit Profile.dc.html`'s second pass
 * (owner, 2026-09-02): two pills sharing one recessed track, the current one
 * filled. It was two loose buttons, which read as two things to press rather
 * than one setting with two positions.
 *
 * The labels are not translated and are not in the dictionary. «UA» and «EN»
 * name the languages themselves, so they read the same in either.
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
    <View
      className="bg-secondary border-border shrink-0 flex-row gap-[3px] rounded-lg border p-[3px]"
      role="radiogroup"
    >
      {(['uk', 'en'] as const).map((code) => (
        <Option
          key={code}
          code={code}
          label={code === 'uk' ? 'UA' : 'EN'}
          active={language === code}
          onPress={() => {
            if (language === code) return
            tickSelection()
            void setLanguage(code)
          }}
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
    <Pressable
      className={`min-h-[34px] min-w-[44px] items-center justify-center rounded-md px-3 ${
        active ? 'bg-primary' : 'active:bg-background/40'
      }`}
      onPress={onPress}
      role="radio"
      // Named for a screen reader, and distinct per language so a test — and a
      // person — can tell the two apart by more than their position.
      accessibilityLabel={code === 'uk' ? 'Українська' : 'English'}
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-caption font-semibold ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
