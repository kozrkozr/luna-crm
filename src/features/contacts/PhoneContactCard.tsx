import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import CircleCheck from 'lucide-react-native/icons/circle-check'
import ContactIcon from 'lucide-react-native/icons/contact'
import { Icon } from '../../components/ui/icon'
import { Text } from '../../components/ui/text'
import { Toast } from '../../components/Toast'
import { useStrings } from '../../i18n/LanguageProvider'
import { tapped } from '../../lib/haptics'
import { findSavedNameByPhone } from './api'
import { canPickFromPhone, choosePhoneNumber, pickPhoneContact } from './phoneContact'

/** What a pick fills. A field absent keeps what it held. */
export type PhoneContactFill = { name?: string; phone?: string }

/**
 * `US-065` — «Вибрати з контактів телефону», the card at the top of both
 * «Новий контакт» forms (`Contacts.dc.html`, form state): «Мої контакти» →
 * «+ Новий контакт», and the «Новий контакт» tab of «Додати учасника».
 *
 * The two forms are separate components with separate state, so this owns the
 * whole pick — picker, number menu, the «уже є» check — and hands the form only
 * the values to write. Renders nothing off the iPhone (AC-7).
 */
export function PhoneContactCard({ onFill }: { onFill: (fill: PhoneContactFill) => void }) {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  /** AC-2 — once someone is chosen, the card gives way to «Заповнено з контакту …». */
  const [filledFrom, setFilledFrom] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  if (!canPickFromPhone) return null

  const choose = async () => {
    tapped()
    const contact = await pickPhoneContact()
    if (!contact) return // AC-1 — closed without a choice: nothing changes.

    // AC-4 — one number is used as written; several open the menu; none, or a
    // closed menu, leaves «Телефон» as it was.
    const phone =
      contact.numbers.length === 1
        ? contact.numbers[0].number
        : contact.numbers.length > 1
          ? await choosePhoneNumber(contact.numbers, t.cancel)
          : null

    // AC-5 — a number already in «Мої контакти» fills nothing.
    if (phone) {
      const saved = await findSavedNameByPhone(phone)
      if (saved) return setToast(t.phoneContactAlreadySavedTemplate.replace('{name}', saved))
    }

    // A contact with no name and no company (a bare number) leaves «Імʼя» alone
    // rather than blanking what was typed.
    const name = contact.name || undefined
    if (!name && !phone) return
    onFill({ name, phone: phone ?? undefined })
    setFilledFrom(contact.name || (phone as string))
  }

  return (
    <>
      {filledFrom === null ? (
        <View className="gap-3.5">
          <Pressable
            className="bg-card border-border active:bg-secondary min-h-14 flex-row items-center gap-3 rounded-xl border px-3 py-2.5"
            onPress={() => void choose()}
            role="button"
          >
            <View className="bg-chart-5 h-[34px] w-[34px] items-center justify-center rounded-[10px]">
              <Icon as={ContactIcon} size={18} className="text-tint-foreground" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-foreground text-body font-semibold">{t.phoneContactChoose}</Text>
              <Text className="text-muted-foreground text-label mt-0.5">{t.phoneContactHint}</Text>
            </View>
            <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
          </Pressable>
          <View className="flex-row items-center gap-2.5">
            <View className="bg-border h-px flex-1" />
            <Text className="text-muted-foreground text-label">{t.phoneContactOrByHand}</Text>
            <View className="bg-border h-px flex-1" />
          </View>
        </View>
      ) : (
        <View className="bg-card border-border min-h-12 flex-row items-center gap-2.5 rounded-[10px] border py-2 pl-3 pr-1.5">
          <Icon as={CircleCheck} size={16} className="text-success" />
          <Text className="text-muted-foreground min-w-0 flex-1 text-body-sm" numberOfLines={1}>
            {t.phoneContactFilledFrom}{' '}
            <Text className="text-foreground text-body-sm font-medium">{filledFrom}</Text>
          </Text>
          <Pressable
            className="active:opacity-70 min-h-9 justify-center px-2"
            onPress={() => void choose()}
            role="button"
          >
            <Text className="text-link text-body-sm font-medium">{t.phoneContactAnother}</Text>
          </Pressable>
        </View>
      )}

      {/* Above the form's pinned button, which covers the bottom of both screens. */}
      <Toast message={toast} onDone={() => setToast(null)} bottom={insets.bottom + 84} />
    </>
  )
}
