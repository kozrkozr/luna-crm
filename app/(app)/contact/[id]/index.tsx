import { useCallback, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { PublicProfile, type PublicProfileView } from '../../../../src/features/contacts/PublicProfile'
import { Text } from '../../../../src/components/ui/text'
import { Toast } from '../../../../src/components/Toast'
import { useDestructiveConfirm } from '../../../../src/components/DestructiveAction'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { toastOnNextScreen } from '../../../../src/lib/nextScreenToast'
import { failed as failedHaptic, succeeded } from '../../../../src/lib/haptics'
import {
  deleteContact,
  findContactByIdentity,
  getContact,
} from '../../../../src/features/contacts/api'
import { deleteClient, getClient } from '../../../../src/features/clients/api'
import type { DirectoryKind } from '../../../../src/features/contacts/directory'
import { Starfield } from '../../../../src/components/Starfield'

/**
 * A person from «Мої контакти», and the two ways in.
 *
 * - **The directory** (`(tabs)/contacts`) sends a real id and a `kind` saying
 *   which table it belongs to — `clients` or `contacts`, since that screen is
 *   one list over two (see `directory.ts`).
 * - **A crew row on a shoot** sends `by-identity` with what it knows, because a
 *   `crew_members` row holds no contact id.
 *
 * ── The fallback is still the interesting part ──────────────────────────────
 *
 * **A crew member need not have a contact** (owner, 2026-09-03). They may
 * predate the backfill, or their contact may have been deleted since. Rather
 * than dead-end on a row the reader can see, the crew row passes what it knows
 * as params and this screen renders that — the identity and contact methods it
 * has, and **no note**, because a note belongs to a contact and there is none.
 * Nor any way to edit or delete: there is no row to act on.
 *
 * ── Who may be deleted ──────────────────────────────────────────────────────
 *
 * A crew contact always. **A client only when they have no shoots** (owner,
 * 2026-09-04): `soft_delete_client` works, but a shoot reads its client through
 * a join under a policy that filters `deleted_at`, so removing a client who has
 * shoots blanks the name on every one of them. The full argument is on
 * `deleteClient`. The control is simply absent otherwise — no copy explains
 * why, and inventing an explanation is CLAUDE.md rule 1. Logged.
 */
export default function ContactProfileScreen() {
  const t = useStrings()
  const router = useRouter()
  const params = useLocalSearchParams<{
    id: string
    kind?: DirectoryKind
    name?: string
    role?: string
    phone?: string
    email?: string
    instagram?: string
    telegram?: string
  }>()

  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<
    | { status: 'loading' }
    | {
        status: 'ready'
        view: PublicProfileView
        /** The row this profile can act on, absent for the params fallback. */
        subject: { id: string; kind: DirectoryKind; name: string; deletable: boolean } | null
      }
    | { status: 'error' }
  >({ status: 'loading' })

  const subject = state.status === 'ready' ? state.subject : null

  const { ask: askDelete, dialog: deleteDialog } = useDestructiveConfirm<null>({
    label: t.deleteContactAction,
    question: subject
      ? t.deleteContactQuestion.replace('{name}', subject.name)
      : t.deleteContactAction,
    message: t.deleteContactExplain,
    onConfirm: () => {
      if (!subject) return
      void (async () => {
        const gone =
          subject.kind === 'client'
            ? await deleteClient(subject.id)
            : await deleteContact(subject.id)
        if (!gone) {
          failedHaptic()
          // The row is still there and so is the screen. `somethingWentWrong`
          // rather than new copy: nothing distinguishes "not yours" from
          // "already gone" from a network failure, and the RPC deliberately
          // does not say which.
          setError(t.somethingWentWrong)
          return
        }
        succeeded()
        toastOnNextScreen(t.contactDeletedTemplate.replace('{name}', subject.name))
        router.back()
      })()
    },
  })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const kind: DirectoryKind = params.kind === 'client' ? 'client' : 'crew'

        if (kind === 'client') {
          const client = await getClient(params.id)
          if (!active) return
          if (!client) return setState({ status: 'error' })
          setState({
            status: 'ready',
            view: {
              name: client.name,
              // No role column, and no invented line: a client's second line is
              // the shoot count on the list, which the profile card does not
              // repeat.
              role: '',
              phone: client.phone,
              email: null,
              instagram: client.instagram,
              telegram: client.telegram,
              avatarUri: null,
              note: client.notes,
              kind: 'client',
              backLabel: t.navContacts,
            },
            subject: {
              id: client.id,
              kind: 'client',
              name: client.name,
              deletable: client.shootCount === 0,
            },
          })
          return
        }

        /*
          `by-identity` is the crew row's way in: the same name-and-contact key
          `upsertContact` matches on is what finds their contact, and finding it
          is what puts the note on screen.
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
              backLabel: params.kind ? t.navContacts : t.crew,
            },
            subject: { id: contact.id, kind: 'crew', name: contact.name, deletable: true },
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
          // Nothing to edit or delete — there is no contact row behind this.
          subject: null,
        })
      })()
      return () => {
        active = false
      }
    }, [
      params.id,
      params.kind,
      params.name,
      params.role,
      params.phone,
      params.email,
      params.instagram,
      params.telegram,
      t.crew,
      t.navContacts,
    ])
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
      <PublicProfile
        view={state.view}
        onEdit={
          subject
            ? () =>
                router.push({
                  pathname: '/(app)/contact/[id]/edit',
                  params: { id: subject.id, kind: subject.kind },
                })
            : undefined
        }
        onDelete={subject?.deletable ? () => askDelete(null) : undefined}
      />
      {deleteDialog}
      <Toast message={error} onDone={() => setError(null)} />
    </>
  )
}
