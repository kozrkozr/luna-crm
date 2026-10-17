import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { Input } from './ui/input'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { useAddressSuggestions } from '../features/shoots/addressSuggestions'
import type { ResolvedPlace } from '../../modules/address-search'
import { tapped } from '../lib/haptics'

/**
 * `US-067` — the address search, on a screen of its own (AC-1).
 *
 * It was a list under «Адреса» first; at the bottom of the form the keyboard
 * hid it (owner, 2026-10-17). Apple Calendar's «Місце» is the model: a sheet
 * over the form, the field at the top, the suggestions between it and the
 * keyboard, so there is room wherever the form's field happened to sit.
 *
 * It returns one of three outcomes and never touches the form itself:
 * - `onPick` — a suggestion, resolved (AC-2, AC-3);
 * - `onDone` — the typed text, from the return key (AC-4), or when Apple could
 *   not resolve the tapped row: the creator's text is then the best there is;
 * - `onCancel` — nothing changes (AC-4).
 */
export function AddressSearchScreen({
  visible,
  initial,
  onPick,
  onDone,
  onCancel,
}: {
  visible: boolean
  /** The form's current address — the search starts from it. */
  initial: string
  onPick: (place: ResolvedPlace) => void
  onDone: (text: string) => void
  onCancel: () => void
}) {
  const t = useStrings()
  const suggestions = useAddressSuggestions()
  const { search, clear } = suggestions
  const [query, setQuery] = useState(initial)

  // Each opening starts from the form's address and searches it right away,
  // as Calendar does; closing drops the list so the next opening is fresh.
  useEffect(() => {
    if (visible) {
      setQuery(initial)
      search(initial)
    } else {
      clear()
    }
  }, [visible, initial, search, clear])

  const pick = async (index: number) => {
    tapped()
    const place = await suggestions.resolve(index)
    if (place?.address) onPick(place)
    else onDone(query)
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View className="bg-background flex-1">
        {/* «Скасувати» on the left, the title centred — the iOS sheet header. */}
        <View className="h-14 flex-row items-center px-4">
          <Pressable
            onPress={() => {
              tapped()
              onCancel()
            }}
            hitSlop={10}
            role="button"
            className="z-10"
          >
            <Text className="text-body text-link">{t.cancel}</Text>
          </Pressable>
          <View className="absolute inset-x-0 items-center" pointerEvents="none">
            <Text className="text-body text-foreground font-semibold">{t.address}</Text>
          </View>
        </View>

        <View className="px-4 pb-3">
          <Input
            value={query}
            onChangeText={(value) => {
              setQuery(value)
              search(value)
            }}
            onSubmitEditing={() => onDone(query)}
            placeholder={t.locationAddressPlaceholder}
            returnKeyType="done"
            autoFocus
            autoCorrect={false}
          />
        </View>

        {/* `automaticallyAdjustKeyboardInsets` keeps the last rows reachable
            above the keyboard; `handled` lets a row take the first tap. */}
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {query.trim()
            ? suggestions.items.map((item, index) => (
                <Pressable
                  key={`${item.title}|${item.subtitle}`}
                  onPress={() => void pick(index)}
                  role="button"
                  className="border-border active:bg-secondary border-b px-4 py-3"
                >
                  <Text className="text-body text-foreground" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text className="text-body-sm text-muted-foreground" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
