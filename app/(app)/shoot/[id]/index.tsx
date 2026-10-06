import { useCallback, useEffect, useRef, useState } from 'react'
import { SectionLabel } from '../../../../src/components/ShootFormFields'
import { ActivityIndicator, Image, Pressable, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
/*
 * Deep per-icon imports, never the `lucide-react-native` barrel — Metro does not
 * tree-shake it and it doubled the web bundle once (S-2 F-5). See select.tsx.
 */
import ChevronDown from 'lucide-react-native/icons/chevron-down'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Copy from 'lucide-react-native/icons/copy'
import FolderOpen from 'lucide-react-native/icons/folder-open'
import LinkIcon from 'lucide-react-native/icons/link'
import Pencil from 'lucide-react-native/icons/pencil'
import Trash from 'lucide-react-native/icons/trash'
import UserIcon from 'lucide-react-native/icons/user'
import { FormScrollView } from '../../../../src/components/ui/form-scroll-view'
import { Button } from '../../../../src/components/ui/button'
import { Input } from '../../../../src/components/ui/input'
import { Card } from '../../../../src/components/ui/card'
import {
} from '../../../../src/components/ui/dropdown-menu'
import { Icon } from '../../../../src/components/ui/icon'
import { Text } from '../../../../src/components/ui/text'
import { Avatar } from '../../../../src/components/Avatar'
import { ImageViewer } from '../../../../src/components/ImageViewer'
// `PersonSheet` itself is gone (2026-09-03): v3 expands a crew row in place
// rather than opening a sheet. Its type survives as the shape `copyLinkFor`
// and `removePerson` still take.
import { type SheetPerson } from '../../../../src/components/PersonSheet'
import { handleLabel, handleUrl } from '../../../../src/lib/socialHandle'
import { formatMoney, payment } from '../../../../src/features/shoots/money'
import { useDestructiveConfirm } from '../../../../src/components/DestructiveAction'
import { isValidReferenceLink } from '../../../../src/features/references/api'
import { ReferencesEditor } from '../../../../src/components/ReferencesEditor'
import { ResponsePill } from '../../../../src/components/ResponsePill'
import { ShootDetailHeader, type DetailTab } from '../../../../src/components/ShootDetailHeader'
import { StatusPill } from '../../../../src/components/StatusPill'
import { Toast } from '../../../../src/components/Toast'
import { DeliveryDeadline, type DeadlinePatch } from '../../../../src/components/DeliveryDeadline'
import {
  formatDayMonth,
  formatDayMonthWeekday,
  formatDuration,
  formatTimeRange,
  minutesUntilStart,
} from '../../../../src/features/shoots/date'
import { countdownLabel, plural } from '../../../../src/features/shoots/home'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { roleWithEmoji } from '../../../../src/i18n/uk'
import { LinkifiedText } from '../../../../src/components/LinkifiedText'
import { failed, succeeded, tapped } from '../../../../src/lib/haptics'
import { takePendingToast } from '../../../../src/lib/nextScreenToast'
import { openExternalUrl } from '../../../../src/lib/openExternalUrl'
import {
  deleteShoot,
  getShoot,
  updateShootLink,
  type Shoot,
  type ShootLinkField,
} from '../../../../src/features/shoots/api'
import {
  addImageReference,
  addLinkReference,
  listReferences,
  removeReference,
  type Reference,
} from '../../../../src/features/references/api'
import { listCrew, removeCrewMember, type CrewMember } from '../../../../src/features/crew/api'
import { clientLinkToken, crewLinkToken, linkUrl } from '../../../../src/features/crew/links'
import {
  attachmentKind,
  signedLocationUrl,
} from '../../../../src/features/shoots/locationMedia'
import { Starfield } from '../../../../src/components/Starfield'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoot: Shoot; references: Reference[]; crew: CrewMember[] }

/** What the toast is currently saying, and what it offers to undo. */
type ToastState = { message: string; undo?: () => void } | null

/**
 * The creator's shoot detail screen.
 *
 * **Rebuilt against `design_handoff_shoot_detail/` on 2026-08-30** (owner). The
 * screen was one long scroll — client, date, location, crew, references, files,
 * delete — and is now three tabs behind a fixed header, with a person sheet, a
 * client-view preview and an overflow menu. `docs/redesign-log.md` carries the
 * full account, including what the handoff asks for that this does not build.
 *
 * ux-notes.md lists this screen under nine stories at once (US-002, US-003,
 * US-005, US-006, US-018, US-019, US-020, US-024, US-025), and no story owns it
 * outright — so the redesign is filed under `ADR-017` rather than any of them.
 *
 * **Three things the handoff draws are deliberately absent**, each because the
 * data behind it does not exist and inventing it would be inventing a
 * requirement (CLAUDE.md rule 1):
 *
 * - the «Нотатки» card — there is no shoot-level notes column (`location_note`
 *   is the access note, `crew_members.note` is per-person);
 * - the location's name, access code and security phone as separate fields —
 *   one free-text `location_note` is what exists;
 * - a client confirmation state, «Надіслати нагадування», «Скопіювати посилання
 *   для всіх» and «Маршрут» — no column and no mechanism for any of them.
 */
export default function ShootDetailScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [state, setState] = useState<State>({ status: 'loading' })
  const [tab, setTab] = useState<DetailTab>('details')
  const [headerHeight, setHeaderHeight] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)

  /*
    The countdown's clock. A minute's resolution is all «Початок через 2 год
    40 хв» shows, so it ticks every 20 seconds rather than every second — three
    renders a minute instead of sixty, and the label can never be more than 20
    seconds stale.
  */
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20_000)
    return () => clearInterval(timer)
  }, [])

  /*
    `US-022`'s removal, deferred.

    The handoff replaces the confirmation dialog with a 4-second undo, so the row
    has to disappear before the database is told anything — otherwise «Скасувати»
    would need a restore, and `soft_remove_crew_member` has no inverse (there is
    no `restore_crew_member` RPC and adding one is a migration, not a restyle).

    So the row is hidden locally, the write is scheduled, and undo cancels it.
    The ref is what survives a re-render; the cleanup below is what stops a
    removal from being silently forgotten when the reader navigates away inside
    the four seconds — it commits immediately instead.

    Declared above the fetch because the fetch reads it: a refetch must not put
    back a row whose removal is still in flight.
  */
  const pendingRemoval = useRef<{ memberId: string; timer: ReturnType<typeof setTimeout> } | null>(
    null
  )

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const [shoot, references, crew] = await Promise.all([
          getShoot(id),
          listReferences(id),
          listCrew(id),
        ])
        if (!active) return
        if (!shoot || !references || !crew) return setState({ status: 'error' })
        /*
          A removal that has not been committed yet is still only local — the
          row is hidden and `soft_remove_crew_member` has not run. Without this
          filter, blurring and returning inside the undo window (opening the edit
          screen and coming back, say) would refetch the member and put them
          back on screen, and the pending write would then remove them from the
          database while the row stayed visible until some later focus.
        */
        const pendingId = pendingRemoval.current?.memberId
        setState({
          status: 'loaded',
          shoot,
          references,
          crew: pendingId ? crew.filter((member) => member.id !== pendingId) : crew,
        })
      })()
      /*
        A message left behind by the screen that just popped — the edit
        screen's «Зміни збережено». Read on focus, and reading clears it, so it
        cannot appear a second time when this screen is focused again.
      */
      const handed = takePendingToast()
      if (handed) setToast({ message: handed })

      return () => {
        active = false
      }
    }, [id])
  )

  const commitRemoval = useCallback(async (memberId: string) => {
    pendingRemoval.current = null
    // AC-1 — they no longer appear in the crew list. The row is already gone
    // from local state; this is what makes it true after a refetch, and it is
    // what revokes their link (ADR-014).
    //
    // A failure is not reported. The row is hidden locally and the write did not
    // happen, so the screen is briefly wrong — and it corrects itself on the
    // next focus, which refetches. Surfacing it would need an error state on a
    // toast that has already gone, and `removeCrewMember` does not say WHY it
    // failed (the RPC returns a bare boolean by design).
    await removeCrewMember(memberId)
  }, [])

  useEffect(() => {
    return () => {
      const pending = pendingRemoval.current
      if (!pending) return
      clearTimeout(pending.timer)
      void commitRemoval(pending.memberId)
    }
  }, [commitRemoval])

  /*
    `US-019` — «Скасувати зйомку», moved out of the ⋯ menu and onto the «Деталі»
    tab by v3.

    **It now confirms, and it did not before.** The menu item called
    `deleteShoot` on a single tap; its own comment claimed AC-2's confirmation
    was "kept", and `DropdownMenuItem` has never had one. AC-2 is required, and a
    full-width button is easier to hit than a menu row, so this goes through the
    same hook `US-019`/`US-022` use elsewhere — a real iOS alert on device.

    «Скасувати зйомку» is still a rename rather than a new action: this
    soft-deletes the row and revokes every link on it (ADR-014). Nobody is
    notified; the handoff's «Команда й клієнт отримають повідомлення про
    скасування» is not built, because nothing sends it.

    **It has to sit above the loading and error returns.** It is a hook, and it
    was first written beside `removePerson` — below them — which crashed the
    screen with "Rendered more hooks than during the previous render" the moment
    a shoot finished loading: the first render returned early and never called
    it.
  */
  const { ask: askCancelShoot, dialog: cancelShootDialog } = useDestructiveConfirm<null>({
    label: t.cancelShoot,
    question: t.confirmDeleteShoot,
    onConfirm: () => {
      void (async () => {
        if (!(await deleteShoot(id))) return
        // AC-1 — it disappears from the list, which refetches on focus. Never
        // `push`: the deleted shoot must not stay on the stack to be swiped
        // back to. `back` only when there is something to go back to.
        if (router.canGoBack()) router.back()
        else router.replace('/(app)/(tabs)/shoots')
      })()
    },
  })

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
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const { shoot, references, crew } = state

  const fileCount = [shoot.rawFilesUrl, shoot.finishedPhotosUrl].filter(Boolean).length

  const startsIn = minutesUntilStart(shoot.date, shoot.startTime, now)
  /*
    Days once the span passes 24 hours (owner, 2026-09-06) — this read «Початок
    через 311 год 51 хв» for a shoot a fortnight out, which is arithmetic left
    to the reader. `countdownLabel` also drops a zero remainder, so a shoot
    exactly two hours away no longer reads «2 год 0 хв».
  */
  const countdown =
    startsIn !== null && startsIn > 0
      ? `${t.startsInPrefix} ${countdownLabel(startsIn, t)}`
      : /*
          Nothing once the shoot has started. The handoff defines only the
          counting-down state — no «Триває» and no «Почалася» — and writing one
          would be new user-facing copy nobody has reviewed. Logged.
        */
        null

  const showToast = (message: string, undo?: () => void) => setToast({ message, undo })

  const copyLinkFor = async (person: SheetPerson) => {
    const token = await (person.id === shoot.clientId
      ? clientLinkToken(shoot.id)
      : crewLinkToken(shoot.id, person.id))
    const url = token ? linkUrl(token) : null
    if (!url) return showToast(t.somethingWentWrong)
    await Clipboard.setStringAsync(url)
    succeeded()
    showToast(`${t.linkCopied} — ${person.name}`)
  }

  const removePerson = (person: SheetPerson) => {
    // Hide the row now; write in four seconds unless undone.
    setState((current) =>
      current.status === 'loaded'
        ? { ...current, crew: current.crew.filter((member) => member.id !== person.id) }
        : current
    )
    const removed = crew.find((member) => member.id === person.id)
    const timer = setTimeout(() => void commitRemoval(person.id), 4000)
    pendingRemoval.current = { memberId: person.id, timer }

    showToast(t.removedFromCrewTemplate.replace('{name}', person.name), () => {
      clearTimeout(timer)
      pendingRemoval.current = null
      if (removed) {
        setState((current) =>
          current.status === 'loaded'
            ? { ...current, crew: [...current.crew, removed].sort(byOriginalOrder(crew)) }
            : current
        )
      }
    })
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      <ShootDetailHeader
        tab={tab}
        onTabChange={setTab}
        tabCounts={{
          // Crew alone since 2026-09-03. It was `crew.length + 1`, because the
          // tab showed the client too; v3 moved the client onto «Деталі», so
          // counting them here would promise a person who is not in the list.
          people: String(crew.length),
          materials: String(references.length + fileCount),
        }}
        onHeight={setHeaderHeight}
      />

      <FormScrollView
        contentContainerStyle={{
          // The measured header height, never a constant — the banner grows it.
          paddingTop: headerHeight,
          /*
            Room for the pinned footer, on the two tabs that have one. It said
            "the tabs that have one" while applying 96pt to all three — true
            when «Матеріали» had a CTA of its own, and left behind when that was
            removed earlier today.
          */
          paddingBottom: insets.bottom + (tab === 'materials' ? 24 : 96),
        }}
      >
        <View className="gap-3 p-4">
          {tab === 'details' ? (
            <DetailsTab
              shoot={shoot}
              countdown={countdown}
              crew={crew}
              onCopyClientLink={() =>
                void copyLinkFor({
                  id: shoot.clientId,
                  name: shoot.clientName,
                  role: t.clientRole,
                  phone: shoot.clientContact || null,
                  instagram: shoot.clientInstagram,
                  telegram: shoot.clientTelegram,
                  badge: null,
                  removable: false,
                })
              }
            />
          ) : null}

          {tab === 'people' ? (
            <PeopleTab
              crew={crew}
              onCopyLink={(person) => void copyLinkFor(person)}
              onRemove={removePerson}
            />
          ) : null}

          {tab === 'materials' ? (
            <MaterialsTab
              shoot={shoot}
              references={references}
              onAdded={(reference) =>
                setState((current) =>
                  current.status === 'loaded'
                    ? { ...current, references: [...current.references, reference] }
                    : current
                )
              }
              onRemoved={(id) =>
                setState((current) =>
                  current.status === 'loaded'
                    ? {
                        ...current,
                        references: current.references.filter((r) => r.id !== id),
                      }
                    : current
                )
              }
              onCopied={showToast}
              onToast={showToast}
              onDeadlineChanged={(patch) =>
                setState((current) =>
                  current.status === 'loaded'
                    ? { ...current, shoot: { ...current.shoot, ...patch } }
                    : current
                )
              }
              onLinkSaved={(field, url) =>
                setState((current) =>
                  current.status === 'loaded'
                    ? { ...current, shoot: { ...current.shoot, [field]: url } }
                    : current
                )
              }
            />
          ) : null}
        </View>
      </FormScrollView>

      {/*
        ── The pinned footer (owner, 2026-09-06) ──────────────────────────────

        Each tab's action, in the place «+ Нова зйомка» occupies on the calendar:
        the same spot on every shoot, rather than below however much location,
        payment and notes this particular one carries.

        `insets.bottom` IS added here, unlike the calendar's — that screen sits
        inside `(tabs)` where the bar owns the safe area, and this one does not,
        so its own bottom edge runs into the home indicator.

        «Матеріали» has no action: adding a reference is the `+` tile at the end
        of its grid, and its two file links are edited in place. The footer is
        absent rather than empty there, and `paddingBottom` above drops with it —
        96pt of blank scroll under a tab with nothing pinned to it is what the
        old constant did, and it did it on every tab.
      */}
      {tab === 'details' || tab === 'people' ? (
        <View
          className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pt-2.5"
          style={{ paddingBottom: insets.bottom + 10 }}
        >
          {tab === 'details' ? (
            <DetailsActions
              onEdit={() => router.push(`/(app)/shoot/${shoot.id}/edit`)}
              onCancelShoot={() => askCancelShoot(null)}
            />
          ) : (
            /*
              «+ Додати учасника» as the calendar's CTA, not the centred row that
              used to close the crew list (owner, 2026-09-06). It was a quiet
              `muted-foreground` row inside the card — which read as another crew
              member until you got to the «+» — and it is the only action on this
              tab, so it takes the shape the app gives its one action per screen.
            */
            <Button
              variant="cta"
              size="cta"
              onPress={() => {
                tapped()
                router.push(`/(app)/shoot/${shoot.id}/crew/add`)
              }}
            >
              {/* `router.push`, not `Link asChild` — the calendar's «+ Нова
                  зйомка» is a plain `Button` and this is meant to be the same
                  control. It also keeps the rendered element a button rather
                  than whatever `asChild` resolves to on the web export, which
                  is what `us005-check.mjs` matches on. */}
              <Text className="text-subtitle font-semibold">{`+ ${t.addCrewMember}`}</Text>
            </Button>
          )}
        </View>
      ) : null}

      {cancelShootDialog}

      <Toast
        message={toast?.message ?? null}
        onDone={() => setToast(null)}
        action={toast?.undo ? { label: t.cancel, onPress: toast.undo } : undefined}
      />
    </View>
  )
}

/**
 * «19 вересня · 09:00» — the header's subline.
 *
 * `formatDayMonth`, not the weekday form the card below uses: the header has one
 * line beside two 40pt buttons, and «19 вересня, пʼятниця · 09:00» does not fit
 * on a narrow phone. The weekday is on the card's Дата row, which has the width
 * for it.
 */
function byOriginalOrder(original: CrewMember[]) {
  const index = new Map(original.map((member, position) => [member.id, position]))
  return (a: CrewMember, b: CrewMember) =>
    (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0)
}

/* ────────────────────────────── Tab «Деталі» ───────────────────────────── */


/**
 * The «Деталі» tab, rebuilt against `Shoot Detail v3.dc.html` (owner,
 * 2026-09-03).
 *
 * Four changes from the first pass:
 *
 * - **The subtitle line is gone.** It read «Зйомка · 3 год»; v3 drops it and
 *   moves the duration into the «Час» row, where the number it qualifies is.
 * - **The «Команда» row is gone**, and its count is the «Команда» section
 *   heading on the «Команда» tab instead — beside the list it describes rather
 *   than two tabs away from it.
 * - **The client's contacts moved here**, into the shoot card, from the «Команда»
 *   tab's «Клієнт» section.
 * - **Two actions were added** — the ⋯ menu's whole contents, now full-width
 *   buttons at the foot of the tab, as v3 draws them.
 */
function DetailsTab({
  shoot,
  countdown,
  crew,
  onCopyClientLink,
}: {
  shoot: Shoot
  countdown: string | null
  crew: CrewMember[]
  onCopyClientLink: () => void
}) {
  const t = useStrings()
  const duration = formatDuration(shoot.startTime, shoot.endTime, {
    hours: t.hoursShort,
    minutes: t.minutesShort,
  })
  const range = formatTimeRange(shoot.startTime, shoot.endTime)

  /*
    The client's own contacts, as v3 has them: label on the left, the value on
    the right, and a tap that opens it.

    **The «Лише власник» badge went with the move.** The fact it stated is
    unchanged and is not enforced by any label: the link gateway's `ShootRow`
    has never selected the client's contact, so no crew member and no client has
    ever received it (`ADR-018`). If a story ever puts it in a payload, that is
    what has to change — a badge on the creator's own screen was a rehearsal of
    a guarantee made elsewhere, which is the same reason client view went.
  */
  type ClientRow = { label: string; value: string; url: string | null; linkTone?: boolean }
  const clientRows: (ClientRow | null)[] = [
    shoot.clientContact
      ? {
          label: t.phoneField,
          value: shoot.clientContact,
          url: `tel:${shoot.clientContact.replace(/[^+\d]/g, '')}`,
          // No `linkTone`: a phone dials, and it looks the way it always did.
        }
      : null,
    shoot.clientInstagram
      ? {
          label: t.instagramLabel,
          value: handleLabel('instagram', shoot.clientInstagram),
          url: handleUrl('instagram', shoot.clientInstagram),
          linkTone: true,
        }
      : null,
    shoot.clientTelegram
      ? {
          label: t.telegramLabel,
          value: handleLabel('telegram', shoot.clientTelegram),
          url: handleUrl('telegram', shoot.clientTelegram),
          linkTone: true,
        }
      : null,
  ]
  const contacts = clientRows.filter((row): row is ClientRow => row !== null)

  return (
    <>
      {/*
        The shoot card. `flat` — background, a border, no lift: the handoff's
        card is `#09090b` inside `#27272a`, which is stock shadcn's arrangement
        and the opposite of this app's lifted `--card`.
      */}
      <Card variant="flat" className="gap-0 p-0">
        <View className="p-4 pb-3.5">
          {/*
            ── «Клієнт», and the status on the right (owner, 2026-09-06) ───────

            The card names its section the way «Локація» and «Оплата» name
            theirs — it held the shoot's title with no label at all, which made
            it the one block on the tab a reader had to infer.

            **The status moved right** and onto this row. It led the card from
            the left, which gave «Запланована» more weight than the client whose
            shoot it is; the label leads now and the state trails, which is the
            arrangement the payment card already uses for its own badge.

            The countdown keeps the pill's company rather than the label's — the
            two are one fact between them, «за 3 дні · Запланована».
          */}
          <View className="mb-2.5 flex-row items-center gap-2">
            <View className="flex-1">
              <SectionLabel label={t.clientSection} />
            </View>
            {countdown ? (
              <Text className="text-label text-muted-foreground">{countdown}</Text>
            ) : null}
            <StatusPill value={shoot.status} />
          </View>

          {/* The client's name is the shoot's title, as the handoff has it —
              `-0.01em` becomes an absolute value because RN's letterSpacing is
              never em (tailwind.config.js).

              The avatar is the app's own, at the 40 the «Команда» rows use: the
              closest analogue is a person's name in a row, and this is the same
              object one size of type larger. It carries initials, since a
              client is an `ADR-018` row with no photo and no emoji — `Avatar`
              falls back to them on its own, so nothing here asks for it. */}
          <View className="flex-row items-center gap-3">
            <Avatar name={shoot.clientName} size={40} />
            <Text
              className="text-title-lg text-foreground flex-1 font-semibold"
              style={{ letterSpacing: -0.2 }}
              numberOfLines={2}
            >
              {shoot.clientName}
            </Text>
          </View>
        </View>

        <SeparatorRow
          label={t.date}
          value={formatDayMonthWeekday(shoot.date, t.monthsGenitive, t.weekdaysFull)}
        />
        {/* `US-030` AC-6 — a shoot created before that story has no range, and
            the row is left out rather than showing half of one. The duration
            trails the range here rather than sitting in a subtitle. */}
        {range ? <SeparatorRow label={t.timeLabel} value={range} trailing={duration} /> : null}

        {contacts.map((contact) => (
          <ContactRow
            key={contact.label}
            label={contact.label}
            value={contact.value}
            url={contact.url}
            linkTone={contact.linkTone}
          />
        ))}

        {/*
          The client's own link, at the foot of the card the client's details
          live in (owner, 2026-09-03 — added to `Shoot Detail v3` after the
          screen was built against it).

          It is `US-027`'s share, reached from the client rather than from a
          menu: the same control the «Команда» tab gives each crew member, so
          «поділитися посиланням» is one gesture wherever the person is on
          screen. `clientLinkToken` already existed — the retired `PersonSheet`
          used it — so nothing new writes a token.

          «Запрошення на зйомку», the artboard's word, on this row and the crew
          rows alike (owner, 2026-09-03) — one key, so they cannot diverge.
        */}
        <Pressable
          className="active:bg-secondary border-border min-h-11 flex-row items-center justify-center gap-[7px] border-t p-2"
          onPress={() => {
            tapped()
            void onCopyClientLink()
          }}
          role="button"
        >
          <Icon as={LinkIcon} size={14} strokeWidth={1.8} className="text-muted-foreground" />
          {/*
            `text-foreground` — the theme's near-white, `#FAFAFB` (owner,
            2026-09-06). Not a literal `#fff`: the theme handoff says "не
            використовувати чистий білий", and every other light text on this
            screen is this token.

            **The row on the «Команда» tab keeps `muted-foreground`**, and the
            two are now deliberately unlike. This one is the only way to share a
            shoot with the client and sits alone at the foot of their card; the
            crew one is a per-person action repeated down a list, where lifting
            every copy to full white would make the list shout.

            The glyph beside it stays muted, which is what was asked for — text
            only. Worth an eye on a device: an icon and its label in two tones
            can read as an oversight rather than a hierarchy.
          */}
          <Text className="text-label text-foreground font-semibold">{t.copyPersonLink}</Text>
        </Pressable>
      </Card>

      <LocationCard shoot={shoot} />

      <PaymentCard shoot={shoot} />

      {/*
        The «Нотатки для команди» card, restored 2026-08-30 and renamed
        2026-09-05.

        It was the handoff's very first item and went unbuilt twice for want of a
        column — redesign-log S-1, then H-1. The owner added `shoots.notes`
        (migration `20260830160000`), so it is here as drawn: the label and the
        body, line breaks preserved.

        **The «Клієнт не бачить» badge is gone** (owner, 2026-09-06), the last
        of the three that carried it — the form and the crew link view lost
        theirs the same day. The card is titled «Нотатки для команди» and sits
        directly above «Нотатки для клієнта»; the two headings say who each is
        for, and the badge was a third element restating one of them.

        It was never what made the rule true, either. The gateway selects this
        column for `crewPayload` and never for `clientPayload` (`ADR-013`,
        CLAUDE.md rule 2) — the badge only ever described that, and describing
        it is what stopped.
      */}
      {shoot.notes ? (
        <Card variant="flat" className="gap-2.5">
          <SectionLabel label={t.teamNotesSection} />
          <Text className="text-body-sm text-foreground/90 leading-5">{shoot.notes}</Text>
        </Card>
      ) : null}

      {/*
        The «Нотатки для клієнта» card (owner, 2026-09-05, migration
        `20260905160000`).

        **The one card on this screen that the client also sees**, which is why
        it carries no badge and why `Shoot Detail v3.dc.html` draws it outside
        the `showPrivate` gate that hides «Оплата» and the crew note from its
        client-view preview. The link view renders the same text under a
        different heading — «Нотатки від організатора», which is what the crew
        note is called there too, because «Нотатки для клієнта» names an audience
        the reader already knows they are.

        Hidden when empty, unlike the payment card above it. That is not an
        inconsistency to tidy: a note has nothing to say when it is empty, where
        «0 ₴» is a fact about the shoot.
      */}
      {shoot.clientNotes ? (
        <Card variant="flat" className="gap-2.5">
          <SectionLabel label={t.clientNotesSection} />
          <Text className="text-body-sm text-foreground/90 leading-5">{shoot.clientNotes}</Text>
        </Card>
      ) : null}

    </>
  )
}

/**
 * «Редагувати зйомку» and delete, **pinned to the bottom of the «Деталі» tab**.
 *
 * ── Why it is out here and not in `DetailsTab` ──────────────────────────────
 *
 * It scrolled with the card stack until 2026-09-06, which put the screen's two
 * actions below however much location, payment and notes a shoot happened to
 * carry — reachable only by scrolling past everything. Pinned, they are where
 * «+ Нова зйомка» is on the calendar: the same place on every shoot.
 *
 * Living outside the tab is what lets it be pinned at all — a sticky footer has
 * to be a sibling of the scroll view, not a child of it. `DetailsTab` lost its
 * `onEdit` and `onCancelShoot` props in the move; the screen already holds both
 * handlers.
 *
 * ── The row itself, from `Shoot Detail v3.dc.html` ──────────────────────────
 *
 * One row, not two stacked outlines. «Редагувати зйомку» is a filled pill taking
 * the width that is left; deleting is a 48pt circle beside it holding a trash
 * glyph and no words. Both used to be outlines of equal weight — the primary
 * action and the irreversible one, drawn identically and told apart only by the
 * colour of one label. Editing is now the obvious thing to tap, and destroying
 * is a small target you have to aim at.
 *
 * The delete control is icon-only, so «Скасувати зйомку» lives in
 * `accessibilityLabel` — the artboard's own `aria-label`, and the only place the
 * words exist before the confirmation dialog.
 *
 * **The artboard's `--accent` is not this app's `--accent`.** There it is the
 * pale blue-white CTA fill; here that is `--primary`, and `--accent` is a raised
 * chip surface. `Badge` carries the same warning about the word. The circle's
 * `--danger-bg`/`--danger-border`/`--danger-soft` cross unchanged, and its press
 * state is `active:opacity-80` because the artboard's hover fill (`--danger`)
 * has no token here.
 */
function DetailsActions({
  onEdit,
  onCancelShoot,
}: {
  onEdit: () => void
  onCancelShoot: () => void
}) {
  const t = useStrings()
  return (
    <View className="flex-row items-center gap-2.5">
      <Pressable
        className="bg-primary active:bg-primary/90 h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full"
        onPress={() => {
          tapped()
          onEdit()
        }}
        role="button"
      >
        <Icon as={Pencil} size={16} strokeWidth={1.9} className="text-primary-foreground" />
        <Text className="text-body-sm text-primary-foreground font-semibold">
          {t.menuEditShoot}
        </Text>
      </Pressable>

      <Pressable
        className="border-danger-border bg-danger-bg h-12 w-12 shrink-0 items-center justify-center rounded-full border active:opacity-80"
        onPress={() => {
          tapped()
          onCancelShoot()
        }}
        role="button"
        accessibilityLabel={t.cancelShoot}
      >
        <Icon as={Trash} size={18} strokeWidth={1.9} className="text-danger-soft" />
      </Pressable>
    </View>
  )
}

/**
 * One of the shoot card's label/value rows, under a hairline.
 *
 * `trailing` is v3's dimmer suffix — «09:00 – 12:00 · 3 год» — which is one row
 * carrying two facts rather than a duration stranded in a subtitle.
 */
function SeparatorRow({
  label,
  value,
  trailing,
}: {
  label: string
  value: string
  trailing?: string | null
}) {
  return (
    <View className="border-border flex-row items-center justify-between gap-3 border-t px-4 py-3">
      <Text className="text-body-sm text-muted-foreground">{label}</Text>
      <Text className="text-body-sm text-foreground font-medium">
        {value}
        {trailing ? (
          <Text className="text-label text-muted-foreground font-normal">{` · ${trailing}`}</Text>
        ) : null}
      </Text>
    </View>
  )
}

/** A client contact row: the value is the control, where there is one. */
function ContactRow({
  label,
  value,
  url,
  linkTone = false,
}: {
  label: string
  value: string
  url: string | null
  /** Draw the value in the link colour. Handles only — see below. */
  linkTone?: boolean
}) {
  const body = (
    <View className="border-border flex-row items-center gap-2.5 border-t px-4 py-3">
      <Text className="text-body-sm text-muted-foreground shrink-0">{label}</Text>
      {/*
        **`text-link` for handles only** (owner, 2026-09-05) — the token named
        for links, already the active tab's colour and `Button`'s `link`
        variant. It marks a value that leads somewhere *else*: an Instagram or
        Telegram profile. A phone number is tappable too and is deliberately
        NOT blue — it dials, which is the phone doing its own job, and the row
        keeps the colour it has always had.

        Which is why the tone is passed in rather than read off `url`. Blue
        still never appears on something that opens nothing — the rule the
        calendar row's address settled on 2026-09-04 — it is simply no longer
        true that everything openable is blue.
      */}
      <Text
        className={`text-body-sm min-w-0 flex-1 text-right font-medium ${
          linkTone ? 'text-link' : 'text-foreground'
        }`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )

  if (!url) return body
  return (
    <Pressable className="active:bg-secondary" onPress={() => void openExternalUrl(url)} role="link">
      {body}
    </Pressable>
  )
}

/**
 * «Оплата» — what the shoot costs and what is still owed.
 *
 * `Shoot Detail v3.dc.html` (owner, 2026-09-05). **No story covers money**;
 * `US-002` and `US-018` both need amending.
 *
 * **Shown even when nothing has been priced** — the owner's call on 2026-09-05,
 * and what the artboard literally does: it gates the card on the viewer, not on
 * having a figure. So every shoot that existed before this feature grows a card
 * reading «0 ₴ · Без передплати». The column keeps null and zero apart, so
 * hiding it for untouched shoots is one condition away if that reads badly.
 *
 * **Creator-only, and nothing here enforces that** — the gateway does, by
 * naming its columns. `Shoot Link Preview.dc.html` draws no payment section for
 * a crew member or a client, and this card sits behind the same viewer gate as
 * the private notes. Same guarantee the «Клієнт не бачить» badge relies on
 * below (`ADR-013`, CLAUDE.md rule 2) — so no badge is needed here: nobody but
 * the creator can reach this screen at all.
 */
function PaymentCard({ shoot }: { shoot: Shoot }) {
  const t = useStrings()
  const pay = payment(shoot)

  /*
    ── The «Оплачено» / «Часткова оплата» / «Без передплати» chip is gone ─────

    Removed on the owner's instruction, 2026-09-06. It sat beside the heading
    and named a state the two figures under it already state: «Передплата» and
    «Залишок» are what the chip summarised, and the remainder is coloured, so
    the card said the same thing three ways.

    The comment it replaces claimed the chip was "the only place in the app
    that uses `--warn-*` as a fill". That was not true when it was written and
    is not true now: `ResponsePill`'s «Очікує» and the calendar's
    tight-turnaround chip both fill with it. Corrected rather than carried over.

    `pay.badge` is still read, one line below the removal — it decides whether
    «Залишок» reads green or amber. `payment()` is unchanged, and so is the
    arithmetic: nothing about what is owed depended on the chip.
  */

  return (
    <Card variant="flat" className="gap-0 p-0">
      <View className="px-4 pb-2.5 pt-4">
        <SectionLabel label={t.paymentSection} emoji="💵" />
      </View>

      {/* 26px, `-0.5` tracking — the one number on this screen drawn large
          enough to read without looking for it. RN letterSpacing is absolute. */}
      <View className="flex-row items-baseline gap-2.5 px-4 pb-3.5">
        <Text
          className="text-foreground font-semibold"
          style={{ fontSize: 26, lineHeight: 30, letterSpacing: -0.5 }}
        >
          {formatMoney(pay.price)}
        </Text>
        <Text className="text-body-sm text-muted-foreground">{t.fullPrice}</Text>
      </View>

      <View className="border-border flex-row border-t">
        <View className="flex-1 px-4 py-3">
          <Text className="text-caption text-muted-foreground">{t.prepaymentLabel}</Text>
          {/* «Немає» rather than «0 ₴»: nothing paid is an absence, and the
              artboard dims it to say so. */}
          <Text
            className={`text-subtitle mt-1 font-semibold ${
              pay.prepayment === 0 ? 'text-muted-foreground' : 'text-foreground'
            }`}
          >
            {pay.prepayment === 0 ? t.prepaymentNoneValue : formatMoney(pay.prepayment)}
          </Text>
        </View>
        <View className="border-border flex-1 border-l px-4 py-3">
          <Text className="text-caption text-muted-foreground">{t.balanceLabel}</Text>
          {/*
            Amber while anything is outstanding, green when it is not — and
            note this is NOT what the form does with the same number, which
            leaves it plain until it reaches zero. Both are as drawn; logged.
          */}
          <Text
            className={`text-subtitle mt-1 font-semibold ${
              pay.badge === 'paid' ? 'text-success' : 'text-warn'
            }`}
          >
            {formatMoney(pay.balance)}
          </Text>
        </View>
      </View>
    </Card>
  )
}

function LocationCard({ shoot }: { shoot: Shoot }) {
  const t = useStrings()
  const [uri, setUri] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const attachment = shoot.locationAttachment

  useFocusEffect(
    useCallback(() => {
      if (!attachment) return
      let active = true
      void (async () => {
        const signed = await signedLocationUrl(attachment)
        if (active) setUri(signed)
      })()
      return () => {
        active = false
      }
    }, [attachment])
  )

  if (!shoot.locationName && !shoot.locationAddress && !shoot.locationNote && !attachment) {
    return null
  }

  const kind = attachment ? attachmentKind(attachment) : null

  return (
    <Card variant="flat" className="gap-0 p-0">
      <View className="gap-3 p-4">
        <SectionLabel label={t.locationSection} emoji="📍" />
        {/* The venue leads, the address supports it — which is the order v3
            draws and the reason the two are separate columns
            (`location_name`, migration 20260903120000). */}
        {shoot.locationName ? (
          <Text className="text-subtitle text-foreground font-semibold">
            {shoot.locationName}
          </Text>
        ) : null}
        {/* A creator pastes a maps pin into the address as often as a street:
            any URL inside it is tappable since 2026-09-06. See `linkify`. */}
        {shoot.locationAddress ? (
          <LinkifiedText className="text-body-sm text-muted-foreground leading-5">
            {shoot.locationAddress}
          </LinkifiedText>
        ) : null}
        {/*
          **The card has no buttons**, as v3 draws it. «Маршрут» went first — it
          was a stub the owner asked for on 2026-08-30 and never did anything
          when tapped — and «Копіювати адресу» followed on the owner's word,
          though it worked. Which map app, and what a `maps:` URL does on the
          static web export, remain the unanswered questions behind «Маршрут»
          (S-4).

          The address is still copyable where a reader without the app needs it:
          the link view draws its own «Копіювати адресу» (`uk.copyAddress`), and
          that one is untouched.
        */}
      </View>

      {shoot.locationNote ? (
        <View className="border-border gap-2 border-t p-4">
          <SectionLabel label={t.accessDetailsLabel} />
          {/* Line breaks are preserved: a creator writes directions as lines.
              A URL among them is tappable — a floor plan or a parking map is
              the usual reason one is here at all. */}
          <LinkifiedText className="text-body-sm text-foreground/90 leading-5">
            {shoot.locationNote}
          </LinkifiedText>
        </View>
      ) : null}

      {attachment && kind === 'image' ? (
        <View className="border-border gap-2 border-t p-4">
          {/*
            «Фото локації». The handoff draws a four-column grid and a «+»;
            `Shoot.locationAttachment` is ONE image or video (`US-018` AC-2), so
            one tile renders and the rest is logged rather than stubbed
            (redesign-log S-3). No «+» either — the attachment is set on the edit
            screen, and an add control here would be a write path no story asks
            for.
          */}
          <SectionLabel label={t.locationPhotoLabel} />
          <Pressable
            className="bg-secondary h-[84px] w-[84px] overflow-hidden rounded-lg active:opacity-70"
            disabled={!uri}
            onPress={() => uri && setViewing(uri)}
            role="button"
            accessibilityLabel={t.locationPhotoLabel}
          >
            {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="cover" /> : null}
          </Pressable>
        </View>
      ) : null}

      {attachment && kind === 'video' ? (
        /*
          A video opens in the platform's player rather than playing inline.
          Nothing specifies inline playback, and risks.md R-4 puts video behind
          spike S-4, which has not run.
        */
        <View className="border-border gap-2 border-t p-4">
          <SectionLabel label={t.locationPhotoLabel} />
          <Button
            variant="outline"
            className="h-10 self-start"
            disabled={!uri}
            onPress={() => uri && void openExternalUrl(uri)}
          >
            <Text className="text-body-sm font-semibold">{t.attachVideo}</Text>
          </Button>
        </View>
      ) : null}

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </Card>
  )
}

/* ─────────────────────────────── Tab «Команда» ────────────────────────────── */

/**
 * The «Команда» tab, rebuilt against `Shoot Detail v3.dc.html` (owner,
 * 2026-09-03).
 *
 * **The «Клієнт» section is gone**, and with it the sheet. v3 has one section
 * here — «Команда» — with the client's own contacts moved onto the «Деталі»
 * tab's shoot card, and each crew row expanding **in place** rather than
 * opening `PersonSheet`.
 *
 * Expanding in place is the change worth knowing about. The sheet showed the
 * same four things (contacts, a profile link, copy-link, remove) over a
 * backdrop that hid the list; an expanded row keeps the person in the list they
 * were found in, which is what makes «2 з 4 підтвердили» above it legible while
 * you work through them.
 *
 * The confirmation count is that heading now, rather than a «Команда» row two
 * tabs away on «Деталі».
 */
/**
 * «Команда». The «+ Додати учасника» row that closed this list moved out to the
 * screen's pinned footer on 2026-09-06 (owner) — see `PeopleActions`. `shoot`
 * went with it: the row's `href` was the only thing here that needed it.
 */
function PeopleTab({
  crew,
  onCopyLink,
  onRemove,
}: {
  crew: CrewMember[]
  onCopyLink: (person: SheetPerson) => void
  onRemove: (person: SheetPerson) => void
}) {
  const t = useStrings()
  // One at a time: two open rows push the second one off the screen, and the
  // list is the thing being scanned.
  const [expanded, setExpanded] = useState<string | null>(null)
  const confirmed = crew.filter((member) => member.response === 'confirmed').length

  /*
    `US-022` AC-2 — **required**, and it was not being met: "an accidental tap
    must not silently cut someone out", and nothing is removed before the
    creator confirms.

    The row removed on a single tap and offered four seconds of undo instead.
    That is not what AC-2 asks for — it removes first and asks after — and the
    comment on the button claimed AC-2 accepted the trade, which it does not.
    `Shoot Detail v3` draws no confirmation here either; the owner asked for one
    (2026-09-03).

    Generic over the member so the question carries which one all the way to
    `onConfirm`, rather than a second piece of state that could drift from what
    the dialog is asking about.
  */
  const { ask: askRemove, dialog: removeDialog } = useDestructiveConfirm<CrewMember>({
    label: t.remove,
    question: t.confirmRemoveCrew,
    onConfirm: (member) =>
      onRemove({
        id: member.id,
        name: member.name,
        role: member.role,
        phone: member.phone,
        instagram: member.instagram,
        telegram: member.telegram,
        badge: null,
        removable: true,
      }),
  })

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between px-0.5">
        <SectionLabel label={t.crew} />
        {crew.length > 0 ? (
          <Text className="text-label text-muted-foreground">
            {t.confirmedOfTemplate
              .replace('{done}', String(confirmed))
              .replace('{total}', String(crew.length))}
          </Text>
        ) : null}
      </View>

      <Card variant="flat" className="gap-0 p-0">
        {crew.map((member, index) => (
          <PersonRow
            key={member.id}
            divided={index > 0}
            member={member}
            open={expanded === member.id}
            onToggle={() => setExpanded((current) => (current === member.id ? null : member.id))}
            onCopyLink={() =>
              onCopyLink({
                id: member.id,
                name: member.name,
                role: member.role,
                phone: member.phone,
                instagram: member.instagram,
                telegram: member.telegram,
                badge: null,
                removable: true,
              })
            }
            onRemove={() => {
              setExpanded(null)
              askRemove(member)
            }}
          />
        ))}
      </Card>

      {removeDialog}
    </View>
  )
}

function responseLabel(member: CrewMember, t: ReturnType<typeof useStrings>): string {
  return member.response === 'confirmed'
    ? t.responseConfirmed
    : member.response === 'declined'
      ? t.responseDeclined
      : t.responsePending
}

/**
 * One person — the client or a crew member — as a tappable row.
 *
 * **The row itself is the affordance now.** The previous version put a copy
 * button and a remove button in each row; the handoff has neither, and moves
 * both into the sheet the row opens. `min-h-16` is its 64px.

/**
 * One crew member: a 64pt row that expands to show what the sheet used to.
 *
 * The avatar is **not** a link. v3 wraps it in an `<a>` to a participant
 * profile, and «Профіль учасника» below points at the same place — there is no
 * such route in this app, so the row is drawn and inert (the precedent the
 * owner set on 2026-09-02 for controls whose destination does not exist yet).
 * Making the avatar a second dead link would add nothing.
 */
function PersonRow({
  member,
  open,
  onToggle,
  onCopyLink,
  onRemove,
  divided = false,
}: {
  member: CrewMember
  open: boolean
  onToggle: () => void
  onCopyLink: () => void
  onRemove: () => void
  divided?: boolean
}) {
  const t = useStrings()
  const router = useRouter()

  /*
    ── The contact rows are gone (owner, 2026-09-06) ─────────────────────────

    An expanded row held «Телефон», «Email», «Instagram» and «Telegram» in a
    sub-card above the actions. It now holds three things and they are all
    actions: «Профіль учасника», «Запрошення на зйомку», «Видалити».

    The contacts had two homes and this was the worse of them. «Профіль
    учасника» — one tap below — is the person's own screen, which shows the same
    four fields with room for them; here they were a nested card inside an
    expanded row inside a card, three surfaces deep, and every one of them was
    something to read rather than something to do.

    `handleLabel`/`handleUrl` are still imported by this file for the client's
    rows on «Деталі», which keep theirs: a shoot has one client and it is not a
    list, so nothing is nested and there is no second screen to send them to.
  */

  return (
    /*
      **An open row sinks; it does not lift.** `Shoot Detail v3.dc.html` reads
      `rowBg: expanded === p.id ? '#0d0d0f' : 'transparent'` on a card that is
      `var(--surface)` — the open row is DARKER than the card it sits in, and
      the panel's own blocks are darker again (`var(--bg)`). Three levels
      descending, which is this design's idiom throughout.

      It was `bg-secondary/30`, which is wrong twice over: it lifted where the
      artboard sinks, and since the 2026-09-04 theme made `--secondary` equal
      `--card` it was 30% of the card's own colour painted on the card —
      nothing at all. The same collision as the link view's «ВИ» row.

      `bg-muted` is `#0F0F10` against the artboard's `#0d0d0f` — two parts in
      255 per channel, below anything a screen resolves. Not worth a fourteenth
      token; `--surface-soft`, which the artboard uses for this row's hover, is
      exactly `#0F0F10` anyway.
    */
    <View className={`${divided ? 'border-border border-t' : ''} ${open ? 'bg-muted' : ''}`}>
      <Pressable
        className="active:bg-muted min-h-16 flex-row items-center gap-3 px-4 py-3"
        onPress={() => {
          tapped()
          onToggle()
        }}
        role="button"
        accessibilityState={{ expanded: open }}
      >
        <Avatar name={member.name} size={40} />
        <View className="min-w-0 flex-1">
          <Text className="text-subtitle text-foreground font-semibold" numberOfLines={1}>
            {member.name}
          </Text>
          {/* The glyph reaches the READ surfaces too since 2026-09-05 — see
              `ROLE_EMOJI`. `member.role` is untouched; only what is drawn from
              it changes, and a role that has no glyph draws as it always did. */}
          <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={1}>
            {roleWithEmoji(member.role)}
          </Text>
        </View>
        <ResponsePill value={member.response} label={responseLabel(member, t)} />
        {/*
          **One chevron that turns**, not two that swap. v3 draws a single
          border-square caret at `rotate(45deg)` collapsed — pointing DOWN — and
          `rotate(-135deg)` open, which is the same glyph turned through 180°.
          This was `open ? ChevronDown : ChevronRight`, so it pointed right until
          you tapped it.

          The artboard's `transition:transform 160ms ease` is not animated here:
          it would want an `Animated.Value` per row, and the two end states are
          what carries the meaning.

          **The rotation is on a wrapping `View`, never on `Icon`.** `Icon` runs
          `cssInterop` with `className` targeting `style` and `nativeStyleToProp`
          mapping that style's width and height onto the `size` prop
          (src/components/ui/icon.tsx). An explicit `style` prop collides with
          the generated one and takes the colour and the size mapping with it —
          the icon then renders invisibly, which is exactly what it did when the
          transform was passed to `Icon` directly.
        */}
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon
            as={ChevronDown}
            size={16}
            strokeWidth={2}
            className="text-muted-foreground shrink-0"
          />
        </View>
      </Pressable>

      {open ? (
        <View className="gap-2 px-4 pb-3.5">
          {/*
            Live since 2026-09-04 — inert for two days, waiting for
            `app/(app)/contact/[id].tsx`.

            **The params are the fallback, not a cache.** A crew member need not
            have a contact: they may predate the directory's backfill, or their
            contact may since have been deleted. `contactId` is `'unknown'` in
            that case, and what this row knows is passed alongside so the screen
            can render the person rather than an error.
          */}
          <Pressable
            className="bg-background border-border active:bg-card min-h-11 flex-row items-center gap-2.5 rounded-lg border px-3"
            onPress={() => {
              tapped()
              router.push({
                pathname: '/(app)/contact/[id]',
                params: {
                  // A crew member holds no contact id. The screen resolves one
                  // by identity from these, exactly as `upsertContact` does.
                  id: 'by-identity',
                  name: member.name,
                  role: member.role,
                  ...(member.phone ? { phone: member.phone } : {}),
                  ...(member.email ? { email: member.email } : {}),
                  ...(member.instagram ? { instagram: member.instagram } : {}),
                  ...(member.telegram ? { telegram: member.telegram } : {}),
                },
              })
            }}
            role="button"
          >
            <Icon as={UserIcon} size={14} strokeWidth={1.8} className="text-muted-foreground" />
            <Text className="text-label text-muted-foreground flex-1">{t.crewProfile}</Text>
            <Icon
              as={ChevronRight}
              size={13}
              strokeWidth={2}
              className="text-muted-foreground/50 shrink-0"
            />
          </Pressable>

          <View className="flex-row items-center gap-2">
            <Pressable
              className="active:bg-secondary min-h-10 min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg"
              onPress={() => {
                tapped()
                onCopyLink()
              }}
              role="button"
            >
              <Icon as={LinkIcon} size={14} strokeWidth={1.8} className="text-muted-foreground" />
              {/*
                `text-foreground` (owner, 2026-09-06), as on the client's row on
                «Деталі». That row was lifted to white first and this one was
                deliberately left muted, on the grounds that it repeats down a
                list — but only one row is ever expanded, so it does not repeat.
                The earlier reasoning does not survive the row being open.

                The glyph stays muted, which is what was asked for both times:
                the label, not the icon.
              */}
              <Text className="text-label text-foreground font-semibold" numberOfLines={1}>
                {t.copyPersonLink}
              </Text>
            </Pressable>

            {/*
              `US-022`'s removal. **It confirms now** (owner, 2026-09-03) — AC-2
              is marked *required* and says nothing is removed until the creator
              has confirmed, which a remove-then-undo does not satisfy.

              The four-second undo toast stays behind the confirmation. AC-2's
              Out of scope calls re-adding someone "just `US-005` again, no
              special undo flow", so the toast is not what the story asked for
              and is now belt-and-braces; it is kept because losing a colleague
              from a shoot is worth two chances, not because AC-2 wants it.
            */}
            <Pressable
              className="active:bg-destructive/10 min-h-10 shrink-0 flex-row items-center justify-center gap-1.5 rounded-lg px-3"
              onPress={() => {
                tapped()
                onRemove()
              }}
              role="button"
              /* Named as well as labelled: the button carries its word, but
                 `us022-check.mjs` addresses it by `aria-label`, and an icon
                 button that only reads as its text is one restyle away from
                 announcing nothing. */
              accessibilityLabel={t.remove}
            >
              <Icon as={Trash} size={14} strokeWidth={1.8} className="text-destructive" />
              <Text className="text-label text-destructive font-semibold">{t.remove}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function MaterialsTab({
  shoot,
  references,
  onAdded,
  onRemoved,
  onCopied,
  onToast,
  onDeadlineChanged,
  onLinkSaved,
}: {
  shoot: Shoot
  references: Reference[]
  onAdded: (reference: Reference) => void
  onRemoved: (id: string) => void
  onCopied: (message: string) => void
  /** The screen's toast, with an optional undo — `US-042`'s needs one. */
  onToast: (message: string, undo?: () => void) => void
  /** `US-042` — the deadline or the delivered mark was written. */
  onDeadlineChanged: (patch: DeadlinePatch) => void
  /** One of the two file links was written — see `updateShootLink`. */
  onLinkSaved: (field: ShootLinkField, url: string | null) => void
}) {
  const t = useStrings()
  // Which file link is open for editing, if any. One at a time: the two rows
  // sit on top of each other and a second open editor would push the first
  // off-screen mid-paste.
  const [editingLink, setEditingLink] = useState<ShootLinkField | null>(null)
  const photos = references.filter((reference) => reference.kind === 'image').length
  const links = references.length - photos

  /*
    Both slots, always — `US-024` and `US-025` are two fixed places, not a list
    that grows. An empty one is rendered rather than hidden: this is the
    CREATOR's screen, and the row is the only thing on it that says the slot
    exists and can be filled. (`FileSection`'s «В розробці» placeholder makes the
    same argument for the client's view, where AC-1 requires the section to be
    present but empty so a reader can tell "not ready" from "this app does not do
    that".)
  */
  const files: { field: ShootLinkField; title: string; url: string | null }[] = [
    { field: 'rawFilesUrl', title: t.sourceFilesSection, url: shoot.rawFilesUrl },
    { field: 'finishedPhotosUrl', title: t.finishedFilesSection, url: shoot.finishedPhotosUrl },
  ]
  const setLinks = files.filter((file) => file.url).length

  return (
    <>
      {/*
        ── «Файли» (`US-024`, `US-025`), and why it is first ──────────────────

        The two were the other way round, which is how the shoot-detail handoff
        draws them. Swapped on the owner's instruction, and the reason holds on
        its own: the file links are the fixed part of this tab — two slots that
        exist whether or not anything is in them (`US-024`, `US-025`) — where
        the reference grid grows without limit. With the unbounded collection
        first, a pair of one-line rows sat below a scroll on any shoot with more
        than a handful of references.

        The handoff's «Незабаром: перетягуйте сюди одразу багато файлів» note is
        not built — it advertises a feature that does not exist and is on no
        backlog (redesign-log S-6).
      */}
      <View className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <SectionLabel label={t.editFilesTitle} />
          <Text className="text-label text-muted-foreground">
            {`${setLinks} ${plural(setLinks, t.linkForms)}`}
          </Text>
        </View>
        {/* `US-042` — above the two links, where the artboard puts it. */}
        <DeliveryDeadline shoot={shoot} onChanged={onDeadlineChanged} onToast={onToast} />
        <Card variant="flat" className="gap-0 p-0">
          {files.map((file, index) => (
            <FileRow
              key={file.field}
              title={file.title}
              url={file.url}
              divided={index > 0}
              editing={editingLink === file.field}
              onStartEdit={() => setEditingLink(file.field)}
              onCancelEdit={() => setEditingLink(null)}
              onSave={async (value) => {
                const ok = await updateShootLink(shoot.id, file.field, value)
                if (!ok) return false
                // The row reads from `shoot`, so the screen has to hear about
                // it — a refetch would work too and would blink the whole tab.
                onLinkSaved(file.field, value.trim() || null)
                setEditingLink(null)
                return true
              }}
              onCopied={onCopied}
            />
          ))}
        </Card>
      </View>

      {/*
        ── «Референси» ──

        **The sticky «Додати референс або файл» CTA is gone** (owner,
        2026-09-05). It opened the gallery picker — exactly what the `+` tile at
        the end of the grid below already does. One action had two controls, and
        the button named files it could not add: it reached the image picker
        only, where «Файли» above are pasted links (`US-024`, `US-025`).

        Adding a reference is the `+` tile now, and nothing else about it
        changed. `t.addReferenceOrFile` survives as that tile's
        `accessibilityLabel`, which is the one place the phrase was ever true of
        what the control did.
      */}
      <View className="gap-2.5">
        <View className="flex-row items-baseline justify-between">
          <SectionLabel label={t.references} />
          <Text className="text-label text-muted-foreground">
            {`${photos} ${t.photosWord} · ${links} ${plural(links, t.linkForms)}`}
          </Text>
        </View>

        <ReferencesEditor
          references={references}
          addImage={(asset, category) => addImageReference(shoot.id, asset, category)}
          addLink={(link, category) => addLinkReference(shoot.id, link, category)}
          onAdded={onAdded}
          remove={(reference) => removeReference(reference.id)}
          onRemoved={onRemoved}
          confirmRemove
        />
      </View>
    </>
  )
}


/**
 * One of the two file slots — «Вихідні файли» or «Готові файли».
 *
 * Two states, and the empty one is the reason this is a component rather than
 * markup inside the map:
 *
 * - **A link is set** — the host leads, the row opens it, and «Копіювати» puts
 *   it on the clipboard. That is what a creator sends to a client.
 * - **Nothing is set** — «В розробці», the string `FileSection` has always used
 *   for this exact case, and the row leads to the edit screen where the field
 *   is. No new copy: the chevron says the row goes somewhere, and the screen it
 *   goes to is the one that already owns both inputs.
 *
 * The empty row is NOT a dead label. Hiding it (which this did until it was
 * pointed out) leaves the creator with nothing on this screen saying the slots
 * exist at all — the section simply was not there.
 */
function FileRow({
  title,
  url,
  divided,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onCopied,
}: {
  title: string
  url: string | null
  divided: boolean
  editing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: (value: string) => Promise<boolean>
  onCopied: (message: string) => void
}) {
  const t = useStrings()
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)

  // Seeded when the editor opens, not on every render — the reader may already
  // be typing by the time the parent re-renders for something else.
  useEffect(() => {
    if (editing) {
      setDraft(url ?? '')
      setInvalid(false)
    }
  }, [editing, url])

  const save = () => {
    const value = draft.trim()
    // Empty clears the link, which is a real thing to want; anything else has
    // to be a link. `US-003` AC-2's rule, reused rather than restated.
    if (value && !isValidReferenceLink(value)) {
      failed()
      setInvalid(true)
      return
    }
    void (async () => {
      setBusy(true)
      const ok = await onSave(value)
      setBusy(false)
      if (ok) succeeded()
      else setInvalid(true)
    })()
  }

  return (
    <View className={`gap-2.5 p-3.5 ${divided ? 'border-border border-t' : ''}`}>
      <View className="flex-row items-center gap-3">
        <View className="bg-secondary h-[34px] w-[34px] items-center justify-center rounded-lg">
          <Icon as={FolderOpen} size={16} strokeWidth={1.8} className="text-foreground" />
        </View>

        <Pressable
          className="min-w-0 flex-1 gap-0.5 active:opacity-60"
          onPress={() => {
            tapped()
            if (url) void openExternalUrl(url)
            else onStartEdit()
          }}
          role={url ? 'link' : 'button'}
          accessibilityLabel={title}
        >
          <Text className="text-body-sm text-foreground font-semibold" numberOfLines={1}>
            {title}
          </Text>
          {/* The link itself is the editor's business while it is open — v3
              hides this line behind `f.idle` for exactly that reason. */}
          {!editing ? (
            <Text className="text-label text-muted-foreground" numberOfLines={1}>
              {url ? displayLink(url) : t.inDevelopment}
            </Text>
          ) : null}
        </Pressable>

        {!editing ? (
          <>
            {/*
              An icon, not v3's «Копіювати» text button (owner, 2026-09-03). It
              sits beside the pencil, and two controls that do the same KIND of
              thing to the same row read better as a matched pair than as a word
              next to a glyph — which is also what stops the row from wrapping
              once a title is long. The word survives as the accessibility name.
            */}
            {url ? (
              <Pressable
                className="active:bg-secondary h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                onPress={() => {
                  tapped()
                  void (async () => {
                    await Clipboard.setStringAsync(url)
                    succeeded()
                    onCopied(`${t.linkCopied} — ${title}`)
                  })()
                }}
                role="button"
                accessibilityLabel={t.copyWord}
              >
                <Icon as={Copy} size={15} strokeWidth={1.8} className="text-muted-foreground" />
              </Pressable>
            ) : null}
            {/*
              The pencil, which used to push to the edit screen and now opens
              the row (v3). Editing a link where you can see it is the whole
              point of the change; the edit screen still owns the same two
              fields for anyone who arrives that way.
            */}
            <Pressable
              className="active:bg-secondary h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              onPress={() => {
                tapped()
                onStartEdit()
              }}
              role="button"
              accessibilityLabel={t.editLinkLabel}
            >
              <Icon as={Pencil} size={15} strokeWidth={1.8} className="text-muted-foreground" />
            </Pressable>
          </>
        ) : null}
      </View>

      {editing ? (
        <View className="gap-2">
          <Input
            value={draft}
            onChangeText={(value) => {
              setDraft(value)
              setInvalid(false)
            }}
            placeholder={t.pasteLink}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            className={invalid ? 'border-destructive/60' : undefined}
          />
          {invalid ? (
            <Text className="text-label text-destructive">{t.referenceLinkInvalid}</Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            <Button variant="cta" className="h-10 flex-1" disabled={busy} onPress={save}>
              <Text className="text-label font-semibold">{t.done}</Text>
            </Button>
            <Button
              variant="ghost"
              className="h-10 shrink-0 px-3"
              disabled={busy}
              onPress={() => {
                tapped()
                onCancelEdit()
              }}
            >
              <Text className="text-label text-muted-foreground font-semibold">{t.cancel}</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  )
}

/**
 * The link as the handoff shows it — `drive.google.com/folders/…` — with the
 * scheme stripped.
 *
 * On a link with no account the host is the only thing telling a reader where
 * they are about to be sent, so it leads; `https://` in front of it is noise
 * that pushes the meaningful half out of a truncated line.
 */
function displayLink(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
