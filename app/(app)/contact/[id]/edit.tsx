import { useCallback, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { ContactForm, type ContactDraft } from '../../../../src/features/contacts/ContactForm'
import { Text } from '../../../../src/components/ui/text'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { getContact } from '../../../../src/features/contacts/api'
import { getClient } from '../../../../src/features/clients/api'
import type { DirectoryKind } from '../../../../src/features/contacts/directory'
import { Starfield } from '../../../../src/components/Starfield'

/**
 * «Редагувати контакт», reached from «Публічний профіль».
 *
 * `kind` says which table the id belongs to — `clients` or `contacts` — the
 * same param the profile route reads, and for the same reason: «Мої контакти»
 * is one list over two tables (see `directory.ts`), so an id alone is ambiguous.
 *
 * The row is fetched here rather than passed through params. A profile screen
 * already holds the values, but passing them would make the form editable from
 * a stale copy if the row changed underneath — and the fetch is one round trip
 * on a screen that is about to accept typing.
 */
export default function EditContactScreen() {
  const t = useStrings()
  const params = useLocalSearchParams<{ id: string; kind?: DirectoryKind }>()
  const kind: DirectoryKind = params.kind === 'client' ? 'client' : 'crew'

  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ready'; draft: ContactDraft } | { status: 'error' }
  >({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        if (kind === 'client') {
          const client = await getClient(params.id)
          if (!active) return
          if (!client) return setState({ status: 'error' })
          setState({
            status: 'ready',
            draft: {
              name: client.name,
              // A client has no role column, and the form hides the chips for
              // one — this value is never read on that path.
              role: '',
              phone: client.phone ?? '',
              instagram: client.instagram ?? '',
              note: client.notes ?? '',
            },
          })
          return
        }

        const contact = await getContact(params.id)
        if (!active) return
        if (!contact) return setState({ status: 'error' })
        setState({
          status: 'ready',
          draft: {
            name: contact.name,
            role: contact.role,
            phone: contact.phone ?? '',
            instagram: contact.instagram ?? '',
            note: contact.note ?? '',
          },
        })
      })()
      return () => {
        active = false
      }
    }, [params.id, kind])
  )

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 items-center justify-center p-4">
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ContactForm mode="edit" kind={kind} initial={state.draft} id={params.id} />
    </>
  )
}
