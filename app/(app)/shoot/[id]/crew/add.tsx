import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import { Badge } from '../../../../../src/components/ui/badge'
import { Button } from '../../../../../src/components/ui/button'
import { Card } from '../../../../../src/components/ui/card'
import { Icon } from '../../../../../src/components/ui/icon'
import { Input } from '../../../../../src/components/ui/input'
import { Label } from '../../../../../src/components/ui/label'
import { Tabs } from '../../../../../src/components/ui/tabs'
import { Text } from '../../../../../src/components/ui/text'
import { Textarea } from '../../../../../src/components/ui/textarea'
import { Avatar } from '../../../../../src/components/Avatar'
import { ROLES_UK, type Role } from '../../../../../src/i18n/uk'
import { useStrings } from '../../../../../src/i18n/LanguageProvider'
import { succeeded, tapped } from '../../../../../src/lib/haptics'
import { toastOnNextScreen } from '../../../../../src/lib/nextScreenToast'
import {
  addCrewMember,
  crewIdentity,
  hasContact,
  listCrew,
  listPastCrew,
  type PastCrewMember,
} from '../../../../../src/features/crew/api'

type AddMode = 'contacts' | 'new'

/**
 * `US-005` — add a crew member to a shoot.
 *
 * Rebuilt against the add screen in `design-new/Shoot Detail v3.dc.html`
 * (owner, 2026-08-30), which arrived after the shoot-detail redesign and turns
 * a single form into two tabs:
 *
 * - **«Мої контакти»** — search and multi-select people the creator has worked
 *   with before, so nobody is retyped for the fourth time;
 * - **«Новий контакт»** — the form this screen used to be.
 *
 * This is still the cold-start fallback that makes v1 usable with no existing
 * users (`ADR-003`): the person added here never registers, and `US-006`
 * generates their link from the row.
 *
 * **The contacts tab does not reopen `ADR-003`.** It reads the creator's own
 * past shoots (`listPastCrew`) rather than a directory of strangers, and
 * picking someone still INSERTS a new `crew_members` row — a person on three
 * shoots is still three rows. See the full argument on `listPastCrew`.
 *
 * Three departures from the design, each the owner's call on 2026-08-30 and
 * each in docs/redesign-log.md:
 *
 * - **«Телефон» is required**, and is not labelled «— необовʼязково».
 *   `US-005` AC-2 wants a phone or an email and
 *   `crew_members_contact_required` enforces it; the design's label would
 *   invite a value the row rejects.
 * - **«Нотатки» is kept**, though the design drops it — it is the field
 *   `ADR-013` and CLAUDE.md rule 2 exist for.
 * - **The role chips are `ROLES_UK`**, not the design's own six. These are
 *   values written to a column and read back on every surface, including the
 *   two Ukrainian-only ones, and the glossary confirms the list.
 */
export default function AddCrewScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [mode, setMode] = useState<AddMode>('contacts')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // ── «Мої контакти» ──
  const [past, setPast] = useState<PastCrewMember[] | null>(null)
  const [onShoot, setOnShoot] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  // ── «Новий контакт» ──
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [telegram, setTelegram] = useState('')
  const [role, setRole] = useState<Role>(ROLES_UK[0])
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ name?: boolean; contact?: boolean }>({})

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        /*
          Both, together: the contact list is only correct once it knows who is
          already on this shoot — otherwise someone already on the crew is
          offered again and added twice.
        */
        const [rows, current] = await Promise.all([listPastCrew(), listCrew(id)])
        if (!active) return
        setPast(rows ?? [])
        setOnShoot(
          new Set((current ?? []).map((m) => crewIdentity(m.name, m.phone, m.email)))
        )
      })()
      return () => {
        active = false
      }
    }, [id])
  )

  /** `US-005` AC-1 — the added people appear in the shoot's crew list. */
  const finish = (message: string) => {
    succeeded()
    toastOnNextScreen(message)
    router.back()
  }

  const addPicked = async () => {
    if (!past || picked.size === 0) return
    const people = past.filter((person) => picked.has(person.key))

    setBusy(true)
    /*
      Sequential, not `Promise.all`. Six parallel inserts against one table gain
      nothing a photographer would notice, and a partial failure in a batch is
      much harder to report honestly than one that stops where it stopped.
    */
    const added: PastCrewMember[] = []
    for (const person of people) {
      const row = await addCrewMember(id, {
        name: person.name,
        role: person.role,
        /*
          `addCrewMember` takes the one «Телефон або email» field the form has
          always had and splits it on `@`. Handing it back whichever was stored
          round-trips correctly — an email has the `@`, a phone does not — so
          this needs no second insert path. The Instagram handle also has an `@`
          and is deliberately NOT passed here; it goes in its own field.
        */
        contact: person.phone ?? person.email ?? '',
        instagram: person.instagram ?? '',
        telegram: person.telegram ?? '',
        // Not carried over. A note belongs to the shoot it was written on —
        // «привозить свій набір» is not a fact about the person — and ADR-013
        // gives every reason to copy it around as little as possible.
        note: '',
        noteImage: null,
      })
      if (!row) break
      added.push(person)
    }
    setBusy(false)

    if (added.length === 0) return setFormError(t.crewAddFailed)
    if (added.length < people.length) {
      // Some went in and some did not. Saying so beats a success message that
      // is two thirds true; the crew list behind this screen shows which.
      setFormError(t.crewAddFailed)
      setPicked(new Set(added.map((p) => p.key)))
      return
    }

    finish(
      added.length === 1
        ? t.addedToCrewTemplate.replace('{name}', added[0].name)
        : t.addedCrewCountTemplate.replace('{count}', String(added.length))
    )
  }

  const saveNew = async () => {
    // AC-2 — a phone number or email is required, and an Instagram handle alone
    // is not enough. Checked before the request; the CHECK constraint would
    // also refuse it, but a database error is not an actionable message.
    //
    // The name is required too. The schema says so (`name text not null`) and
    // AC-1 lists it, but no story supplies copy for its absence — the same gap
    // US-002 hit with the client's name.
    const nextErrors = { name: !name.trim(), contact: !hasContact(phone) }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.contact) {
      setFormError(null)
      return
    }

    setBusy(true)
    const added = await addCrewMember(id, {
      name,
      role,
      contact: phone,
      instagram,
      telegram,
      note,
      // No image. The picker was removed from this form (owner, 2026-08-30) —
      // see the note on the «Нотатки» field below.
      noteImage: null,
    })
    setBusy(false)

    if (!added) return setFormError(t.crewAddFailed)
    finish(t.addedToCrewTemplate.replace('{name}', added.name))
  }

  /*
    The «Новий контакт» CTA is ready only when the row would actually insert —
    name AND a contact. The design keys its label off the name alone, which
    would show a white, ready-looking button that then refuses for a missing
    phone. Looking ready and being ready are the same thing here.
  */
  const newReady = name.trim().length > 1 && hasContact(phone)
  const contacts = filterContacts(past ?? [], query)

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        The screen's own header, matching the other two rebuilt screens:
        «Скасувати» · centred title · a spacer where a right action would be.
        The design draws no right action — both CTAs are pinned to the bottom.
      */}
      <View
        className="bg-background border-border flex-row items-center border-b px-4 pb-2.5"
        style={{ paddingTop: insets.top }}
      >
        <Pressable
          className="w-24 active:opacity-60"
          hitSlop={10}
          onPress={() => {
            tapped()
            router.back()
          }}
          role="button"
        >
          {/* `numberOfLines`: «Скасувати» is 9 characters and was wrapping its
              last letter onto a second line at the old 64pt width. The width is
              the fix; this is the guard, so a longer translation ellipsizes
              instead of silently growing the header. */}
          <Text className="text-body text-muted-foreground" numberOfLines={1}>
            {t.cancel}
          </Text>
        </Pressable>
        <Text className="text-title-sm text-foreground flex-1 text-center font-semibold">
          {t.addCrewMember}
        </Text>
        {/* Matches the control opposite, so the title is centred on the screen
            rather than on what is left of it. */}
        <View className="w-24" />
      </View>

      <ScrollView
        className="bg-background"
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3.5 p-4">
          <Tabs
            items={[
              { value: 'contacts', label: t.addCrewTabContacts },
              { value: 'new', label: t.addCrewTabNew },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === 'contacts' ? (
            <ContactsTab
              contacts={contacts}
              loading={past === null}
              onShoot={onShoot}
              picked={picked}
              query={query}
              onQuery={setQuery}
              onToggle={(key) =>
                setPicked((current) => {
                  const next = new Set(current)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }
            />
          ) : (
            <NewContactTab
              name={name}
              onName={(value) => {
                setName(value)
                setErrors((e) => ({ ...e, name: false }))
              }}
              phone={phone}
              onPhone={(value) => {
                setPhone(value)
                setErrors((e) => ({ ...e, contact: false }))
              }}
              instagram={instagram}
              onInstagram={setInstagram}
              telegram={telegram}
              onTelegram={setTelegram}
              role={role}
              onRole={setRole}
              note={note}
              onNote={setNote}
              errors={errors}
            />
          )}

          {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}
        </View>
      </ScrollView>

      {/*
        The sticky CTA, one per tab. Both take the design's two states: `cta`
        (white) when the action would do something, flat `secondary` when it
        would not — the same pair the edit screen's save uses.
      */}
      <View
        className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {mode === 'contacts' ? (
          <Button
            variant={picked.size > 0 ? 'cta' : 'secondary'}
            size="cta"
            disabled={busy}
            onPress={() => picked.size > 0 && void addPicked()}
          >
            <Text className={picked.size > 0 ? undefined : 'text-muted-foreground'}>
              {picked.size > 0
                ? t.addToCrewTemplate.replace('{count}', String(picked.size))
                : t.pickCrewMembers}
            </Text>
          </Button>
        ) : (
          <Button
            variant={newReady ? 'cta' : 'secondary'}
            size="cta"
            disabled={busy}
            onPress={() => void saveNew()}
          >
            <Text className={newReady ? undefined : 'text-muted-foreground'}>
              {newReady ? t.saveAndAdd : t.save}
            </Text>
          </Button>
        )}
      </View>
    </View>
  )
}

/** Name or role, case-insensitively — the two fields the design's search covers. */
function filterContacts(contacts: PastCrewMember[], query: string): PastCrewMember[] {
  const term = query.trim().toLowerCase()
  if (!term) return contacts
  return contacts.filter(
    (person) =>
      person.name.toLowerCase().includes(term) || person.role.toLowerCase().includes(term)
  )
}

/* ───────────────────────────── «Мої контакти» ──────────────────────────── */

function ContactsTab({
  contacts,
  loading,
  onShoot,
  picked,
  query,
  onQuery,
  onToggle,
}: {
  contacts: PastCrewMember[]
  loading: boolean
  onShoot: Set<string>
  picked: Set<string>
  query: string
  onQuery: (value: string) => void
  onToggle: (key: string) => void
}) {
  const t = useStrings()

  return (
    <View className="gap-3.5">
      <Input
        value={query}
        onChangeText={onQuery}
        placeholder={t.contactSearchPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="gap-2">
        <Text
          className="text-label text-muted-foreground font-semibold uppercase"
          // RN letterSpacing is absolute, never em — 0.04em at 12px is 0.48.
          style={{ letterSpacing: 0.48 }}
        >
          {t.savedContacts}
        </Text>

        <Card variant="flat" className="gap-0 p-0">
          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : contacts.length === 0 ? (
            /*
              «Нікого не знайдено. Створіть новий контакт.» — the design's one
              empty state, and it covers both cases here: a search that matched
              nothing, and a creator on their first shoot who has no past crew at
              all. The second is the cold start `ADR-003` warned about, and the
              sentence already says the right thing about it: make a new one.
            */
            <View className="px-4 py-7">
              <Text className="text-body-sm text-muted-foreground text-center">
                {t.noContactsFound}
              </Text>
            </View>
          ) : (
            contacts.map((person, index) => (
              <ContactRow
                key={person.key}
                person={person}
                divided={index > 0}
                inCrew={onShoot.has(person.key)}
                checked={picked.has(person.key)}
                onToggle={() => onToggle(person.key)}
              />
            ))
          )}
        </Card>
      </View>
    </View>
  )
}

function ContactRow({
  person,
  divided,
  inCrew,
  checked,
  onToggle,
}: {
  person: PastCrewMember
  divided: boolean
  inCrew: boolean
  checked: boolean
  onToggle: () => void
}) {
  const t = useStrings()
  const contact = person.phone ?? person.email

  return (
    /*
      The ROW is the checkbox, not the box inside it.

      The design puts the tap on the whole row and draws the 22px box as an
      indicator. Rendering a real `Checkbox` inside a `Pressable` row would make
      two controls out of one — two tap targets, two things for a screen reader
      to announce, and a 24pt hitSlop swallowing part of the row's own press. So
      the row carries `role="checkbox"` and its state, and the box below is a
      plain View.
    */
    <Pressable
      className={`min-h-16 flex-row items-center gap-3 px-4 py-3 ${
        divided ? 'border-border border-t' : ''
      } ${checked ? 'bg-secondary/40' : ''} ${inCrew ? '' : 'active:bg-secondary'}`}
      disabled={inCrew}
      onPress={() => {
        tapped()
        onToggle()
      }}
      role="checkbox"
      accessibilityState={{ checked, disabled: inCrew }}
      accessibilityLabel={person.name}
    >
      <Avatar name={person.name} size={38} />

      <View className="min-w-0 flex-1 gap-0.5">
        {/* Dimmed when they are already here — the design greys the name to
            #71717a rather than hiding the row, so a creator can see that the
            person they were looking for is already on the shoot. */}
        <Text
          className={`text-body font-semibold ${inCrew ? 'text-muted-foreground' : 'text-foreground'}`}
          numberOfLines={1}
        >
          {person.name}
        </Text>
        <Text className="text-label text-muted-foreground" numberOfLines={1}>
          {inCrew
            ? t.alreadyInCrewMeta
            : [person.role, contact].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {inCrew ? (
        <Badge variant="outline" label={t.alreadyInCrew} />
      ) : (
        <View
          className={`h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.6px] ${
            checked ? 'bg-primary border-primary' : 'border-border-strong'
          }`}
        >
          {checked ? (
            <Icon as={Check} size={13} strokeWidth={3} className="text-primary-foreground" />
          ) : null}
        </View>
      )}
    </Pressable>
  )
}

/* ───────────────────────────── «Новий контакт» ─────────────────────────── */

function NewContactTab({
  name,
  onName,
  phone,
  onPhone,
  instagram,
  onInstagram,
  telegram,
  onTelegram,
  role,
  onRole,
  note,
  onNote,
  errors,
}: {
  name: string
  onName: (value: string) => void
  phone: string
  onPhone: (value: string) => void
  instagram: string
  onInstagram: (value: string) => void
  telegram: string
  onTelegram: (value: string) => void
  role: Role
  onRole: (role: Role) => void
  note: string
  onNote: (value: string) => void
  errors: { name?: boolean; contact?: boolean }
}) {
  const t = useStrings()

  return (
    <View className="gap-3.5">
      <View className="gap-2">
        <Label htmlFor="crew-name">{t.crewName}</Label>
        <Input
          id="crew-name"
          value={name}
          onChangeText={onName}
          placeholder={t.crewNameExample}
          autoCapitalize="words"
        />
        {errors.name ? (
          <Text className="text-destructive text-sm">{t.crewNameRequired}</Text>
        ) : null}
      </View>

      <View className="gap-2">
        {/*
          No «— необовʼязково» here, though the design writes one: `US-005` AC-2
          requires a phone or an email and `crew_members_contact_required`
          enforces it, so the row would be refused. The label carries the app's
          existing «Телефон або email» wording rather than the design's
          «Телефон», because that is what the field actually accepts —
          `splitContact` decides by the `@`.
        */}
        <Label htmlFor="crew-contact">{t.crewContact}</Label>
        <Input
          id="crew-contact"
          value={phone}
          onChangeText={onPhone}
          placeholder={t.crewPhonePlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.contact ? (
          <Text className="text-destructive text-sm">{t.contactRequired}</Text>
        ) : null}
      </View>

      <View className="gap-2">
        <FieldLabel label={t.crewInstagramLabel} optional />
        <Input
          value={instagram}
          onChangeText={onInstagram}
          placeholder={t.crewInstagramPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/*
        Telegram, under Instagram (owner, 2026-08-31). `crew_members.telegram`,
        migration `20260831140000` — **no story defines it**; `US-005` collects
        one optional handle.

        **The link gateway does not send it**, where it does send `instagram`.
        That is the safe default rather than a considered asymmetry — widening
        an anonymous payload is the expensive direction to undo. Logged.
      */}
      <View className="gap-2">
        <FieldLabel label={t.telegramLabel} optional />
        <Input
          value={telegram}
          onChangeText={onTelegram}
          placeholder={t.telegramPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View className="gap-2">
        <Label>{t.crewRoleOnShoot}</Label>
        {/*
          Chips, replacing the `Select` this form used. The design draws a
          wrapping row of them, and with five roles that is one fewer tap than a
          picker and shows every option at once.

          `ROLES_UK`, not the design's six — these are values written to
          `crew_members.role` and read back on the Ukrainian-only link views, so
          they are not the dictionary's to translate. See the note on ROLES_UK.
        */}
        <View className="flex-row flex-wrap gap-1.5">
          {ROLES_UK.map((option) => (
            <RoleChip
              key={option}
              label={option}
              active={option === role}
              onPress={() => onRole(option)}
            />
          ))}
        </View>
      </View>

      {/*
        «Нотатки» — kept although the design drops it (owner, 2026-08-30). It is
        `US-005`'s field and the one `ADR-013` and CLAUDE.md rule 2 exist to keep
        away from clients; with no way to write one, half the story would be
        unreachable from the app.

        **The note IMAGE is gone** (owner, 2026-08-30) — the «+ Зображення»
        button that stood here was removed. `US-005` collects an image with the
        note, so that half now has no UI: `uploadCrewNoteImage` has no caller
        left, though the column, the gateway's `noteImageUrl` and the crew link
        view's rendering are all still there and still work for rows that
        already have one. Same shape as S-10 — the way in is missing, not the
        feature. Logged.
      */}
      <View className="gap-2">
        <FieldLabel label={t.crewNotes} optional />
        <Textarea
          value={note}
          onChangeText={onNote}
          placeholder={t.crewNotesPlaceholder}
          numberOfLines={4}
          className="min-h-20"
        />
      </View>

      <Text className="text-label text-muted-foreground leading-5">{t.contactWillBeSaved}</Text>
    </View>
  )
}

/** A label with the design's «— необовʼязково» suffix in a lighter tone. */
function FieldLabel({ label, optional = false }: { label: string; optional?: boolean }) {
  const t = useStrings()
  return (
    <Text className="text-body-sm text-foreground font-medium">
      {label}
      {optional ? (
        <Text className="text-label text-muted-foreground font-normal">{` ${t.optionalSuffix}`}</Text>
      ) : null}
    </Text>
  )
}

function RoleChip({
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
      className={`min-h-9 justify-center rounded-lg border px-3 ${
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
        className={`text-body-sm font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
