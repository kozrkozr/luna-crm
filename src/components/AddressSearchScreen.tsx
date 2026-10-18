import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import MapPin from 'lucide-react-native/icons/map-pin'
import TextAlignStart from 'lucide-react-native/icons/text-align-start'
import { Icon } from './ui/icon'
import { Input } from './ui/input'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { useAddressSuggestions } from '../features/shoots/addressSuggestions'
import type { PastPlace } from '../features/shoots/home'
import type { ResolvedPlace } from '../../modules/address-search'
import { tapped } from '../lib/haptics'

/**
 * `US-067` — the address search, on a screen of its own (AC-1).
 *
 * It was a list under «Адреса» first; at the bottom of the form the keyboard
 * hid it (owner, 2026-10-17). Apple Calendar's «Місце» is the model: a sheet
 * over the form, the field at the top, the suggestions between it and the
 * keyboard. The look is the owner's screenshot of a location picker, with its
 * Google attribution swapped for Apple's.
 *
 * It returns one of four outcomes and never touches the form itself:
 * - `onPick` — a suggestion, resolved (AC-2, AC-3);
 * - `onPickPast` — one of «Ваші локації», both halves (AC-1a);
 * - `onDone` — the typed text, from «Зберегти» or the return key (AC-4), or
 *   when Apple could not resolve the tapped row: the text is the best there is;
 * - `onCancel` — nothing changes (AC-4).
 */
export function AddressSearchScreen({
  visible,
  initial,
  places,
  onPick,
  onPickPast,
  onDone,
  onCancel,
}: {
  visible: boolean
  /** The form's current address — the search starts from it. */
  initial: string
  places: PastPlace[]
  onPick: (place: ResolvedPlace) => void
  onPickPast: (place: PastPlace) => void
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

  const change = (value: string) => {
    setQuery(value)
    search(value)
  }

  const pick = async (index: number) => {
    tapped()
    const place = await suggestions.resolve(index)
    if (place?.address) onPick(place)
    else onDone(query)
  }

  const empty = !query.trim()
  // «Зберегти» lights up once there is something to save, as the form's own
  // does; dimmed it still closes with the text, which is then unchanged.
  const changed = query !== initial

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View className="bg-background flex-1">
        {/* The shoot form's header, the same classes: «Скасувати» · title ·
            «Зберегти» (AC-1). */}
        <View className="border-border flex-row items-center border-b px-4 pb-2.5 pt-4">
          <Pressable
            className="w-24 active:opacity-60"
            hitSlop={10}
            onPress={() => {
              tapped()
              onCancel()
            }}
            role="button"
          >
            <Text className="text-body text-muted-foreground" numberOfLines={1}>
              {t.cancel}
            </Text>
          </Pressable>
          <Text className="text-title-sm text-foreground flex-1 text-center font-semibold">
            {t.address}
          </Text>
          <Pressable
            className="w-24 active:opacity-60"
            hitSlop={10}
            onPress={() => {
              tapped()
              onDone(query)
            }}
            role="button"
          >
            <Text
              className={`text-body text-right font-semibold ${
                changed ? 'text-foreground' : 'text-muted-foreground/50'
              }`}
              numberOfLines={1}
            >
              {t.save}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* The form's own «Адреса» field, pin and all — the same `Input`, no
              focus ring or icons of its own (owner, 2026-10-17). */}
          <View className="justify-center">
            <Input
              value={query}
              onChangeText={change}
              onSubmitEditing={() => onDone(query)}
              placeholder={t.addressSearchPlaceholder}
              className="pl-10"
              returnKeyType="done"
              autoCorrect={false}
              autoFocus
            />
            <View className="absolute left-3" pointerEvents="none">
              <Icon as={MapPin} size={18} strokeWidth={1.8} className="text-muted-foreground" />
            </View>
          </View>

          {empty ? (
            <>
              <Text className="text-body-sm text-muted-foreground px-1">{t.addressSearchHint}</Text>
              {places.length > 0 ? (
                <View className="gap-1 pt-2">
                  <Text className="text-body-sm text-muted-foreground px-1 pb-1">
                    {t.yourLocations}
                  </Text>
                  {places.map((place) => (
                    <PlaceRow
                      key={`${place.name}\n${place.address}`}
                      icon={place.address ? MapPin : TextAlignStart}
                      title={place.name || place.address}
                      subtitle={place.name ? place.address || t.noAddress : ''}
                      onPress={() => {
                        tapped()
                        onPickPast(place)
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : suggestions.items.length > 0 ? (
            <>
              <View className="border-border bg-card overflow-hidden rounded-xl border">
                {suggestions.items.map((item, index) => (
                  <View
                    key={`${item.title}|${item.subtitle}`}
                    className={index > 0 ? 'border-border border-t' : ''}
                  >
                    <PlaceRow
                      icon={MapPin}
                      title={item.title}
                      subtitle={item.subtitle}
                      onPress={() => void pick(index)}
                    />
                  </View>
                ))}
              </View>
              <Text className="text-caption text-muted-foreground px-1 text-right">
                {t.appleMapsAttribution}
              </Text>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}

/** One row: an icon in a dark rounded square, the title, the subtitle. */
function PlaceRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: typeof MapPin
  title: string
  subtitle: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      className="active:bg-secondary flex-row items-center gap-3 rounded-xl px-3 py-3"
    >
      <View className="bg-secondary h-10 w-10 items-center justify-center rounded-lg">
        <Icon as={icon} size={17} strokeWidth={1.8} className="text-muted-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-subtitle text-foreground font-medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-body-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
