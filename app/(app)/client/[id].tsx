import { View } from 'react-native'
import { Text } from '../../../src/components/ui/text'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { Starfield } from '../../../src/components/Starfield'

/**
 * `US-028`'s client profile — a stub, so «Глянути профіль» on the shoot form
 * has somewhere to go (owner's instruction, 2026-08-29).
 *
 * The story is written and the data is all here already: `clients` carries the
 * name, contacts and the notes that persist between shoots, and `shoots.client_id`
 * gives the history. What is missing is the screen, which
 * `client-profile-screen.html` specifies.
 */
export default function ClientProfileScreen() {
  const t = useStrings()
  return (
    <View className="bg-background flex-1 items-center justify-center p-4">
      <Starfield />
      <Text className="text-body text-muted-foreground text-center">
        {t.clientProfileComingSoon}
      </Text>
    </View>
  )
}
