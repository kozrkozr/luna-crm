import { Stack } from 'expo-router'
import { ContactForm, EMPTY_DRAFT } from '../../../src/features/contacts/ContactForm'

/**
 * «+ Новий контакт» from «Мої контакти» — `Contacts.dc.html`'s form state.
 *
 * A pushed route rather than a mode of the list, so it covers the bottom bar
 * the way the artboard's full-frame form does. Its sibling is
 * `contact/[id]/edit`, and both render one `ContactForm` — the arrangement the
 * shoot forms were merged into on 2026-09-03.
 *
 * Opens on «Команда», which is the artboard's own default (`EMPTY.kind`) and
 * the commoner case: a client normally arrives through a shoot, where `US-029`
 * matches or creates one.
 */
export default function NewContactScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ContactForm mode="create" kind="crew" initial={EMPTY_DRAFT} />
    </>
  )
}
