import { Slot } from 'expo-router'
import { View } from 'react-native'
import { LinkLanguageProvider } from '../../src/i18n/LanguageProvider'
import { LinkBar } from '../../src/features/links/LinkBar'
import { LinkColumnContext } from '../../src/features/links/linkColumn'

/**
 * Every crew and client link page (`US-046`): the reader's language, and the
 * bar with the UA / EN switch above whatever page the link opened — the shoot,
 * a crew member, all references, or the broken-link message (AC-4).
 *
 * The in-app crew view renders the same `ShootLinkView` from `(app)/crew/`,
 * under the account's language and the navigator's own header — not here.
 *
 * `US-057` AC-6 — and the 640 px column the pages keep on a wide window.
 */
export default function LinkLayout() {
  return (
    <LinkLanguageProvider>
      <LinkColumnContext.Provider value={true}>
        <View className="bg-background flex-1">
          <LinkBar />
          <Slot />
        </View>
      </LinkColumnContext.Provider>
    </LinkLanguageProvider>
  )
}
