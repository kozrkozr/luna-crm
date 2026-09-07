import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Search from 'lucide-react-native/icons/search'
import { Button } from '../../../src/components/ui/button'
import { FormScrollView } from '../../../src/components/ui/form-scroll-view'
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
import { Starfield } from '../../../src/components/Starfield'
import { TabHeader } from '../../../src/components/TabHeader'

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
      <Starfield />
      <ContactsHeader
        shown={groups.reduce((count, group) => count + group.people.length, 0)}
        total={state.status === 'loaded' ? state.people.length : 0}
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
      <FormScrollView contentContainerStyle={{ paddingBottom: 103 }}>
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
      </FormScrollView>

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
 * The screen's own header: the title with its count, the search field and the
 * three filter chips — the shared `TabHeader` since 2026-09-07, with the second
 * block passed as children.
 *
 * `Contacts.dc.html` draws those two under the title row and INSIDE the same
 * bordered container (`padding:0 12px 10px`, `gap:9`), which is what keeps them
 * still while the list scrolls beneath. That is why they are children of the
 * header rather than the first rows of the list.
 *
 * **«Головна» is gone** (owner, 2026-09-07). It was kept on 2026-09-04 because
 * the artboard drew a back control on a tab root; the artboard draws none now,
 * and neither does the calendar's — see `CalendarHeader` in `shoots.tsx`.
 *
 * **The count is the artboard's own `headerMeta`** — `visible.length` of
 * `people.length`, so filtering or typing says how much of the address book is
 * on screen. It reads «9 з 9» untouched, which is the drawing's own answer to
 * the unfiltered case rather than a blank.
 */
function ContactsHeader({
  shown,
  total,
  query,
  onQuery,
  filter,
  onFilter,
}: {
  shown: number
  total: number
  query: string
  onQuery: (value: string) => void
  filter: DirectoryFilter
  onFilter: (value: DirectoryFilter) => void
}) {
  const t = useStrings()

  const chips: { value: DirectoryFilter; label: string }[] = [
    { value: 'all', label: t.contactsFilterAll },
    { value: 'client', label: t.contactsGroupClients },
    { value: 'crew', label: t.crew },
  ]

  return (
    <TabHeader
      title={t.myContactsTitle}
      meta={t.contactsCountTemplate
        .replace('{shown}', String(shown))
        .replace('{total}', String(total))}
    >
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
    </TabHeader>
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
