import { useCallback, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { PublicProfile, type PublicProfileView } from '../../../src/features/contacts/PublicProfile'
import { Text } from '../../../src/components/ui/text'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { findContactByIdentity, getContact } from '../../../src/features/contacts/api'

/**
 * A person from «Мої контакти», reached from a crew row's «Профіль учасника».
 *
 * The crew row passes the id it already holds: `PastCrewMember.key` is a real
 * `contacts.id` since migration `20260904100000`, where it used to be a string
 * computed from a name — which is the whole reason this screen could not exist
 * before.
 *
 * ── The fallback is the interesting part ────────────────────────────────────
 *
 * **A crew member need not have a contact** (owner, 2026-09-03). They may
 * predate the backfill, or their contact may have been deleted since. Rather
 * than dead-end on a row the reader can see, the crew row passes what it knows
 * as params and this screen renders that — the identity and contact methods it
 * has, and **no note**, because a note belongs to a contact and there is none.
 *
 * That is why the params are read at all: they are not a cache of the contact,
 * they are the answer when there isn't one.
 */
export default function ContactProfileScreen() {
  const t = useStrings()
  const params = useLocalSearchParams<{
    id: string
    name?: string
    role?: string
    phone?: string
    email?: string
    instagram?: string
    telegram?: string
  }>()

  const [state, setState] = useState<
    { status: 'loading' } | { status: 'ready'; view: PublicProfileView } | { status: 'error' }
  >({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        /*
          Three ways to arrive, tried in order.

          A crew row sends `by-identity` rather than a uuid, because a
          `crew_members` row holds no contact id — the same name-and-contact key
          `upsertContact` matches on is what finds their contact, and finding it
          is what puts the note on screen. A future Contacts list will send a
          real id instead.
        */
        const contact =
          params.id === 'by-identity'
            ? params.name
              ? await findContactByIdentity(params.name, params.phone ?? null, params.email ?? null)
              : null
            : await getContact(params.id)
        if (!active) return

        if (contact) {
          setState({
            status: 'ready',
            view: {
              name: contact.name,
              role: contact.role,
              phone: contact.phone,
              email: contact.email,
              instagram: contact.instagram,
              telegram: contact.telegram,
              avatarUri: null,
              note: contact.note,
              kind: 'contact',
              backLabel: t.crew,
            },
          })
          return
        }

        if (!params.name) return setState({ status: 'error' })
        setState({
          status: 'ready',
          view: {
            name: params.name,
            role: params.role ?? '',
            phone: params.phone ?? null,
            email: null,
            instagram: params.instagram ?? null,
            telegram: params.telegram ?? null,
            avatarUri: null,
            note: null,
            kind: 'contact',
            backLabel: t.crew,
          },
        })
      })()
      return () => {
        active = false
      }
    }, [
      params.id,
      params.name,
      params.role,
      params.phone,
      params.email,
      params.instagram,
      params.telegram,
      t.crew,
    ])
  )

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 items-center justify-center p-4">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PublicProfile view={state.view} />
    </>
  )
}
