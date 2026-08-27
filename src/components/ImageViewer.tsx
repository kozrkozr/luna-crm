import { Image, Modal, Pressable, View } from 'react-native'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'

/**
 * A full-screen image, dismissible back to where the viewer was.
 *
 * `US-003` AC-3 asks for it on a reference; `US-018` shows a location image the
 * same way. One component, so an image opens identically wherever it is tapped.
 *
 * React Native's Modal, for the same reason DateField uses one: it needs no
 * measurement of its content, which is where the previous UI layer's sheet
 * failed on this project. Tapping anywhere dismisses, and «Готово» is there so
 * the way out is visible rather than guessed — the same word the date picker
 * already uses to confirm and close.
 */
export function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const t = useStrings()
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black" onPress={onClose}>
        <View className="flex-1 items-center justify-center">
          {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : null}
        </View>
        <View className="absolute right-4 top-16">
          <Button variant="secondary" onPress={onClose}>
            <Text>{t.done}</Text>
          </Button>
        </View>
      </Pressable>
    </Modal>
  )
}
