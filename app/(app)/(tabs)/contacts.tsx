import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Search from 'lucide-react-native/icons/search'
import { Button } from '../../../src/components/ui/button'
import { Card } from '../../../src/components/ui/card'
import { Icon } from '../../../src/components/ui/icon'
import { Input } from '../../../src/components/ui/input'
import { Text } from '../../../src/components/ui/text'
import { Avatar } from '../../../src/components/Avatar'
import { SectionLabel } from '../../../src/components/ShootFormFields'
import { Toast } from '../../../src/components/Toast'
import { bottomNavHeight } from '../../../src/components/BottomNav'
import { shootCountLabel } from '../../../src/components/ClientField'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { tapped } from '../../../src/lib/haptics'
import { takePendingToast } from '../../../src/lib/nextScreenToast'
import { contactIdentity, listContacts } from '../../../src/features/contacts/api'
import { listClients } from '../../../src/features/clients/api'
import { countShootsPerContact } from '../../../src/features/crew/api'
import {
  clientPerson,
  crewPerson,
  directoryGroups,
  type DirectoryFilter,
  type DirectoryPerson,
} from '../../../src/features/contacts/directory'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; people: DirectoryPerson[] }

/**
 * «Мої контакти» — `Contacts.dc.html`'s list state, and the third tab
 * (owner, 2026-09-04).
 *
 * **The tab was drawn and inert for one commit.** The bottom navigation shipped
 * with four items and this destination missing, because the artboard's screen
 * needed a decision the bar did not: it groups people into «Клієнти» and
 * «Команда» and our `contacts` table holds only crew.
 *
 * The answer was that both groups already exist as tables — see `directory.ts`.
 * `clients` (`ADR-018`) and `contacts` (`ADR-003`) are both the creator's own
 * private records, so this screen is a union of two reads and needed no
 * migration.
 *
 * Search and the filter chips run over what is loaded, not over the network:
 * one fetch on focus, then typing is instant and works the same offline. Same
 * arrangement as the calendar's date filter.
 */
export default function ContactsScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [state, setState] = useState<State>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<DirectoryFilter>('all')
  const [toast, setToast] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        /*
          Three reads in parallel. The first two are the list's two halves —
          neither is a fallback for the other, and a photographer can have
          people of both kinds.

          The third is only the crew rows' shoot counts, so **its failure is
          not the screen's**: a null leaves those rows showing the role alone,
          the same way the calendar's rows survive a failed avatar-stack query.
          A client's count needs no request — it rides along on `listClients`
          as an aggregate.
        */
        const [clients, contacts, counts] = await Promise.all([
          listClients(),
          listContacts(),
          countShootsPerContact(),
        ])
        if (!active) return
        if (!clients || !contacts) return setState({ status: 'error' })

        const label = (count: number) => shootCountLabel(count, t)
        setState({
          status: 'loaded',
          people: [
            ...clients.map((client) => clientPerson(client, label)),
            ...contacts.map((contact) =>
              crewPerson(
                contact,
                counts?.[contactIdentity(contact.name, contact.phone, contact.email)] ?? 0,
                // With no counts at all, the role stands alone rather than
                // every crew member claiming «0 зйомок».
                counts ? label : () => ''
              )
            ),
          ],
        })
      })()
      /*
        The form and the profile's delete both pop back to this screen, so this
        is where their toast is shown — «{name} додано до контактів», «Зміни
        збережено», «{name} видалено з контактів».
      */
      const pending = takePendingToast()
      if (pending) setToast(pending)
      return () => {
        active = false
      }
    }, [t.shootCountForms])
  )

  const groups =
    state.status === 'loaded' ? directoryGroups(state.people, filter, query) : []
  const nothingToShow = state.status === 'loaded' && groups.length === 0
  const searching = query.trim().length > 0

  return (
    <View className="bg-background flex-1">
      <ContactsHeader
        query={query}
        onQuery={setQuery}
        filter={filter}
        onFilter={setFilter}
      />

      {/*
        103, from the artboard's `padding:222px 0 178px` less the 75px bottom bar
        the navigator reserves. It clears the pinned CTA (68px) with the
        artboard's own breathing room left over.
      */}
      <ScrollView contentContainerStyle={{ paddingBottom: 103 }} keyboardShouldPersistTaps="handled">
        <View className="gap-[18px] px-4 pt-3">
          {state.status === 'loading' ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" />
            </View>
          ) : state.status === 'error' ? (
            <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
          ) : nothingToShow ? (
            /*
              Two empty states, and the artboard is right to separate them: an
              address book with nobody in it needs telling how people get there,
              while a search that matched nothing needs telling to try again.
            */
            <Card variant="flat" className="items-center px-5 py-7">
              <Text className="text-body text-foreground font-semibold">
                {searching ? t.contactsNotFoundTitle : t.emptyContactsTitle}
              </Text>
              <Text
                className="text-body-sm text-muted-foreground mt-1.5 text-center leading-5"
                style={{ maxWidth: 250 }}
              >
                {searching ? t.contactsNotFoundText : t.emptyContactsText}
              </Text>
            </Card>
          ) : (
            groups.map((group) => (
              <View key={group.kind}>
                <View className="mb-2 flex-row items-baseline justify-between px-0.5">
                  <SectionLabel
                    label={group.kind === 'client' ? t.contactsGroupClients : t.crew}
                  />
                  <Text className="text-body-sm text-muted-foreground">
                    {String(group.people.length)}
                  </Text>
                </View>
                <Card variant="flat" className="gap-0 p-0">
                  {group.people.map((person, index) => (
                    <PersonRow key={person.id} person={person} divided={index > 0} />
                  ))}
                </Card>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/*
        «+ Новий контакт», pinned. The artboard puts it at `bottom:74px` — on top
        of the bar — and the bar owns the safe area, so this block adds none of
        its own. Same treatment as the calendar's CTA; the artboard's gradient
        fade is still not built (C-10), so it keeps the hairline.
      */}
      <View className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 py-2.5">
        <Button variant="cta" size="cta" onPress={() => router.push('/(app)/contact/new')}>
          <Text className="text-subtitle font-semibold">{`+ ${t.newContactTitle}`}</Text>
        </Button>
      </View>

      {/* Raised clear of the bottom bar — see the note on the profile's toast. */}
      <Toast
        message={toast}
        onDone={() => setToast(null)}
        bottom={bottomNavHeight(insets.bottom) + 21}
      />
    </View>
  )
}

/**
 * One person: initials, name, their second line, a chevron.
 *
 * 64px as drawn, and it opens «Публічний профіль» for both kinds (owner,
 * 2026-09-04) — `client/[id]` is still `US-028`'s stub, and the profile screen
 * already reads a note from either table.
 */
function PersonRow({ person, divided }: { person: DirectoryPerson; divided: boolean }) {
  return (
    <Link
      href={{
        pathname: '/(app)/contact/[id]',
        params: { id: person.id, kind: person.kind },
      }}
      asChild
    >
      <Pressable
        className={`active:bg-secondary min-h-16 flex-row items-center gap-3 px-4 py-3 ${
          divided ? 'border-border border-t' : ''
        }`}
        onPress={tapped}
        role="button"
        accessibilityLabel={person.name}
      >
        <Avatar name={person.name} size={40} />
        <View className="min-w-0 flex-1">
          <Text className="text-body text-foreground font-semibold" numberOfLines={1}>
            {person.name}
          </Text>
          {person.sub ? (
            <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={1}>
              {person.sub}
            </Text>
          ) : null}
        </View>
        <Icon as={ChevronRight} size={16} strokeWidth={1.8} className="text-muted-foreground" />
      </Pressable>
    </Link>
  )
}

/**
 * The screen's own header: a back control, the title, the search field and the
 * three filter chips — 222px of it in the artboard, which is why it is a
 * sibling of the ScrollView rather than an absolute overlay the content would
 * have to be offset by.
 *
 * **«Головна» stays** (owner, 2026-09-04), like the calendar's chevron: the
 * artboard draws a back control on a tab root beside the bar that replaced it,
 * and this one is explicit about where it goes — `Home.dc.html` is its href.
 */
function ContactsHeader({
  query,
  onQuery,
  filter,
  onFilter,
}: {
  query: string
  onQuery: (value: string) => void
  filter: DirectoryFilter
  onFilter: (value: DirectoryFilter) => void
}) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const chips: { value: DirectoryFilter; label: string }[] = [
    { value: 'all', label: t.contactsFilterAll },
    { value: 'client', label: t.contactsGroupClients },
    { value: 'crew', label: t.crew },
  ]

  return (
    <View
      className="bg-background border-border border-b"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center gap-1.5 px-2 pb-2 pt-1">
        <Pressable
          className="active:bg-secondary min-h-11 w-[88px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
          onPress={() => {
            tapped()
            router.navigate('/(app)/(tabs)')
          }}
          role="button"
          accessibilityLabel={t.navHome}
        >
          <Icon as={ChevronLeft} size={16} strokeWidth={1.9} className="text-muted-foreground" />
          <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
            {t.navHome}
          </Text>
        </Pressable>
        <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
          {t.myContactsTitle}
        </Text>
        {/* Matches the control opposite, so the title is centred on the screen. */}
        <View className="w-[88px] shrink-0" />
      </View>

      <View className="gap-2.5 px-3 pb-2.5">
        {/* The search field, with the artboard's leading magnifier. `pl-9`
            leaves room for it; the icon is positioned rather than wrapped so the
            Input keeps its own height and focus ring. */}
        <View className="relative justify-center">
          <View className="absolute left-3 z-10">
            <Icon as={Search} size={16} strokeWidth={1.9} className="text-muted-foreground" />
          </View>
          <Input
            value={query}
            onChangeText={onQuery}
            placeholder={t.contactsSearchPlaceholder}
            className="pl-9"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <View className="flex-row gap-1.5">
          {chips.map((chip) => (
            <FilterChip
              key={chip.value}
              label={chip.label}
              active={chip.value === filter}
              onPress={() => onFilter(chip.value)}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

/**
 * One of «Всі / Клієнти / Команда» — three equal chips, 36pt, radius 8.
 *
 * Not the shared `Tabs`: that is a raised segment inside a filled track, and
 * the artboard draws these as the app's fill-vs-outline pair, which is also
 * what `RoleChip` uses. Kept local because these are full-width thirds rather
 * than content-width chips.
 */
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`min-h-9 flex-1 items-center justify-center rounded-lg border ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="radio"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-body-sm font-medium ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
