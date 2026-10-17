import { ActionSheetIOS, Platform } from 'react-native'
/*
 * **`legacy`, deliberately.** The current API's `Contact.presentPicker()`
 * resolves to a handle, and every getter on it (`getFullName`, `getPhones`)
 * re-reads the contact from `CNContactStore` — which needs the contacts
 * permission. The legacy `presentContactPickerAsync` serialises the `CNContact`
 * the picker itself hands back, so the app reads the one person chosen and
 * never asks for the address book (`US-065`, Context).
 */
import { presentContactPickerAsync } from 'expo-contacts/legacy'

/**
 * `US-065` AC-7 — iPhone only. A browser cannot open the phone's contacts
 * (`EP-10`), and Android is deferred.
 */
export const canPickFromPhone = Platform.OS === 'ios'

export type PhoneNumberChoice = { label: string; number: string }

export type PickedContact = {
  /** AC-3 — the full name, or the company when the contact has neither name. */
  name: string
  numbers: PhoneNumberChoice[]
}

/** The iPhone's contact picker. Null when it is closed without a choice. */
export async function pickPhoneContact(): Promise<PickedContact | null> {
  let contact
  try {
    contact = await presentContactPickerAsync()
  } catch {
    // A second tap while the picker is still opening throws "in progress".
    return null
  }
  if (!contact) return null

  /*
    Built from the parts, not read from `contact.name`: the legacy serialiser
    only writes `name` when `"name"` is among the keys asked for, and for a
    picked contact it asks with the mapped `CNContact` keys instead — so `name`
    never arrives (found on a device, 2026-10-17). Given and family name, the
    two AC-3 names; the company when there is neither.
  */
  const fullName = [contact.firstName, contact.middleName, contact.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  const name = fullName || contact.company?.trim() || ''

  const numbers = (contact.phoneNumbers ?? [])
    .filter((p) => !!p.number?.trim())
    .map((p) => ({ label: p.label ?? '', number: (p.number as string).trim() }))

  return { name, numbers }
}

/**
 * AC-4 — several numbers: a menu from the bottom with each one and its label
 * from the contacts, as the phone gives it. Null when the menu is closed.
 */
export function choosePhoneNumber(
  numbers: PhoneNumberChoice[],
  cancelLabel: string
): Promise<string | null> {
  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          ...numbers.map((n) => (n.label ? `${n.label} · ${n.number}` : n.number)),
          cancelLabel,
        ],
        cancelButtonIndex: numbers.length,
      },
      (index) => resolve(index < numbers.length ? numbers[index].number : null)
    )
  })
}
