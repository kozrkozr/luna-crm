import { useCallback, useEffect, useRef, useState } from 'react'
import { SectionLabel } from '../../../../src/components/ShootFormFields'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
/*
 * Deep per-icon imports, never the `lucide-react-native` barrel — Metro does not
 * tree-shake it and it doubled the web bundle once (S-2 F-5). See select.tsx.
 */
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import FolderOpen from 'lucide-react-native/icons/folder-open'
import Plus from 'lucide-react-native/icons/plus'
import { Badge } from '../../../../src/components/ui/badge'
import { Button } from '../../../../src/components/ui/button'
import { Card } from '../../../../src/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../../src/components/ui/dropdown-menu'
import { Icon } from '../../../../src/components/ui/icon'
import { Text } from '../../../../src/components/ui/text'
import { Avatar } from '../../../../src/components/Avatar'
import { ImageViewer } from '../../../../src/components/ImageViewer'
import { PersonSheet, type SheetPerson } from '../../../../src/components/PersonSheet'
import { useDestructiveConfirm } from '../../../../src/components/DestructiveAction'
import { ReferenceGrid } from '../../../../src/components/ReferenceGrid'
import { ResponsePill } from '../../../../src/components/ResponsePill'
import { ShootDetailHeader, type DetailTab } from '../../../../src/components/ShootDetailHeader'
import { StatusPill } from '../../../../src/components/StatusPill'
import { Toast } from '../../../../src/components/Toast'
import {
  formatDayMonth,
  formatDayMonthWeekday,
  formatDuration,
  formatTimeRange,
  minutesUntilStart,
} from '../../../../src/features/shoots/date'
import { pluralUk } from '../../../../src/features/shoots/home'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { succeeded, tapped } from '../../../../src/lib/haptics'
import { takePendingToast } from '../../../../src/lib/nextScreenToast'
import { openExternalUrl } from '../../../../src/lib/openExternalUrl'
import { deleteShoot, getShoot, type Shoot } from '../../../../src/features/shoots/api'
import {
  addImageReference,
  listReferences,
  removeReference,
  type AddReferenceResult,
  type Reference,
} from '../../../../src/features/references/api'
import { listCrew, removeCrewMember, type CrewMember } from '../../../../src/features/crew/api'
import { clientLinkToken, crewLinkToken, linkUrl } from '../../../../src/features/crew/links'
import {
  attachmentKind,
  signedLocationUrl,
} from '../../../../src/features/shoots/locationMedia'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [selected, setSelected] = useState<SheetPerson | null>(null)
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
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const { shoot, references, crew } = state

  const fileCount = [shoot.rawFilesUrl, shoot.finishedPhotosUrl].filter(Boolean).length

  const startsIn = minutesUntilStart(shoot.date, shoot.startTime, now)
  const countdown =
    startsIn !== null && startsIn > 0
      ? `${t.startsInPrefix} ${Math.floor(startsIn / 60) ? `${Math.floor(startsIn / 60)} ${t.hoursShort} ` : ''}${startsIn % 60} ${t.minutesShort}`
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
      <Stack.Screen options={{ headerShown: false }} />

      <ShootDetailHeader
        subtitle={detailSubtitle(shoot, t)}
        tab={tab}
        onTabChange={setTab}
        tabCounts={{
          // The client counts as a person in this tab, because the tab shows
          // them: «Люди» is crew plus the one client.
          people: String(crew.length + 1),
          materials: String(references.length + fileCount),
        }}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onHeight={setHeaderHeight}
      />

      <ScrollView
        className="bg-background"
        contentContainerStyle={{
          // The measured header height, never a constant — the banner grows it.
          paddingTop: headerHeight,
          // Room for the sticky CTA on the tabs that have one.
          paddingBottom: insets.bottom + 96,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3 p-4">
          {tab === 'details' ? (
            <DetailsTab
              shoot={shoot}
              countdown={countdown}
              crew={crew}
              onCopied={showToast}
            />
          ) : null}

          {tab === 'people' ? (
            <PeopleTab
              shoot={shoot}
              crew={crew}
              onOpenPerson={setSelected}
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
            />
          ) : null}
        </View>
      </ScrollView>

      <PersonSheet
        person={selected}
        onClose={() => setSelected(null)}
        onCopyLink={(person) => {
          setSelected(null)
          void copyLinkFor(person)
        }}
        onRemove={(person) => {
          setSelected(null)
          removePerson(person)
        }}
      />

      {/*
        Anchored under the «⋯» button rather than under the whole header: the
        button sits in the first 40pt row after the status-bar inset, so this is
        the one measurement that does NOT need `headerHeight` — and using that
        would drop the menu below the tabs, a long way from what opened it.
      */}
      <DropdownMenu open={menuOpen} onClose={() => setMenuOpen(false)} top={insets.top + 46}>
        <DropdownMenuItem
          label={t.menuEditShoot}
          onPress={() => {
            setMenuOpen(false)
            router.push(`/(app)/shoot/${shoot.id}/edit`)
          }}
        />
        <DropdownMenuSeparator />
        {/*
          `US-019`'s delete, wearing the handoff's word for it.

          **«Скасувати зйомку» is a rename, not a new action** — this still calls
          `deleteShoot`, which soft-deletes the row and revokes every link on it
          (ADR-014). Nobody is notified; the handoff's edit screen promises
          «Команда й клієнт отримають повідомлення про скасування» and that note
          is not built, because nothing sends it.

          The confirmation is `US-019` AC-2's and is kept, though the handoff
          draws none here — an accidental tap in a menu must not destroy a shoot,
          and unlike the crew removal below there is no undo to fall back on.
        */}
        <DropdownMenuItem
          destructive
          label={t.cancelShoot}
          onPress={() => {
            setMenuOpen(false)
            void (async () => {
              if (await deleteShoot(shoot.id)) {
                // AC-1 — it disappears from the list, which refetches on focus.
                // Never `push`: the deleted shoot must not stay on the stack to
                // be swiped back to. `back` only when there is something to go
                // back to — a deep link leaves the stack empty.
                if (router.canGoBack()) router.back()
                else router.replace('/(app)/shoots')
              }
            })()
          }}
        />
      </DropdownMenu>

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
function detailSubtitle(shoot: Shoot, t: ReturnType<typeof useStrings>): string {
  const day = formatDayMonth(shoot.date, t.monthsGenitive)
  return shoot.startTime ? `${day} · ${shoot.startTime}` : day
}

/**
 * Restores a removed member to where they were, rather than to the end.
 *
 * The undo puts a row back into a list it was spliced out of, and appending
 * would move a person who had done nothing but be un-removed. `original` is the
 * order the server returned.
 */
function byOriginalOrder(original: CrewMember[]) {
  const index = new Map(original.map((member, position) => [member.id, position]))
  return (a: CrewMember, b: CrewMember) =>
    (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0)
}

/* ────────────────────────────── Tab «Деталі» ───────────────────────────── */

function DetailsTab({
  shoot,
  countdown,
  crew,
  onCopied,
}: {
  shoot: Shoot
  countdown: string | null
  crew: CrewMember[]
  onCopied: (message: string) => void
}) {
  const t = useStrings()
  const duration = formatDuration(shoot.startTime, shoot.endTime, {
    hours: t.hoursShort,
    minutes: t.minutesShort,
  })
  const confirmed = crew.filter((member) => member.response === 'confirmed').length

  return (
    <>
      {/*
        The shoot card. `flat` — background, a border, no lift: the handoff's
        card is `#09090b` inside `#27272a`, which is stock shadcn's arrangement
        and the opposite of this app's lifted `--card`.
      */}
      <Card variant="flat" className="gap-0 p-0">
        <View className="gap-1 p-4 pb-3.5">
          <View className="flex-row items-center gap-2">
            <StatusPill value={shoot.status} />
            {countdown ? (
              <Text className="text-label text-muted-foreground">{countdown}</Text>
            ) : null}
          </View>
          {/* The client's name is the shoot's title, as the handoff has it —
              `-0.01em` becomes an absolute value because RN's letterSpacing is
              never em (tailwind.config.js). */}
          <Text
            className="text-title-lg text-foreground mt-2 font-semibold"
            style={{ letterSpacing: -0.2 }}
            numberOfLines={2}
          >
            {shoot.clientName}
          </Text>
          <Text className="text-body-sm text-muted-foreground">
            {[t.clientShootLabel, duration].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <SeparatorRow
          label={t.date}
          value={formatDayMonthWeekday(shoot.date, t.monthsGenitive, t.weekdaysFull)}
        />
        {/* `US-030` AC-6 — a shoot created before that story has no range, and
            the row is left out rather than showing half of one. */}
        {formatTimeRange(shoot.startTime, shoot.endTime) ? (
          <SeparatorRow
            label={t.timeLabel}
            value={formatTimeRange(shoot.startTime, shoot.endTime) as string}
          />
        ) : null}
        <SeparatorRow
          label={t.crew}
          value={t.confirmedOfTemplate
            .replace('{done}', String(confirmed))
            .replace('{total}', String(crew.length))}
        />
      </Card>

      <LocationCard shoot={shoot} onCopied={onCopied} />

      {/*
        The «Нотатки» card, restored 2026-08-30.

        It was the handoff's very first item and went unbuilt twice for want of a
        column — redesign-log S-1, then H-1. The owner added
        `shoots.notes` (migration `20260830160000`), so it is here as drawn:
        the label, the «Клієнт не бачить» badge, and the body preserving line
        breaks.

        The «Клієнт не бачить» badge is true by construction, not by anything
        this screen does: the link gateway selects this column for `crewPayload`
        and never for `clientPayload` (ADR-013, CLAUDE.md rule 2).
      */}
      {shoot.notes ? (
        <Card variant="flat" className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <SectionLabel label={t.notesSection} />
            </View>
            <Badge variant="outline" label={t.clientCannotSee} />
          </View>
          <Text className="text-body-sm text-foreground/90 leading-5">{shoot.notes}</Text>
        </Card>
      ) : null}
    </>
  )
}

/** One of the shoot card's label/value rows, under a hairline. */
function SeparatorRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="border-border flex-row items-center justify-between border-t px-4 py-3">
      <Text className="text-body-sm text-muted-foreground">{label}</Text>
      <Text className="text-body-sm text-foreground shrink pl-3 text-right font-medium">
        {value}
      </Text>
    </View>
  )
}

/**
 * `US-018` — the location, wherever it is displayed (AC-1, AC-2).
 *
 * **The handoff's name / access code / security phone are not built.** It draws
 * a venue name above the address and a sentence with the door code and the
 * guard's number in bold; `shoots` has `location_address` and one free-text
 * `location_note`, which is where a creator has been putting exactly that
 * sentence. Splitting it into three columns is a migration and an edit form, not
 * a restyle — so the note is rendered as the «Деталі» block, unparsed.
 *
 * «Маршрут» is likewise absent: it is derivable from the address, and no story
 * asks for a map. Logged (redesign-log S-4).
 *
 * Renders nothing when there is no address, note or attachment — an empty card
 * would read as a section that failed to load.
 */
function LocationCard({ shoot, onCopied }: { shoot: Shoot; onCopied: (m: string) => void }) {
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

  if (!shoot.locationAddress && !shoot.locationNote && !attachment) return null

  const kind = attachment ? attachmentKind(attachment) : null

  return (
    <Card variant="flat" className="gap-0 p-0">
      <View className="gap-3 p-4">
        <SectionLabel label={t.locationSection} />
        {shoot.locationAddress ? (
          <Text className="text-body-sm text-muted-foreground">{shoot.locationAddress}</Text>
        ) : null}
        {shoot.locationAddress ? (
          /* The handoff's buttons row: 40px high, gap 8, «Маршрут» primary and
             «Копіювати адресу» outline beside it. */
          <View className="flex-row gap-2">
            {/*
              **«Маршрут» is a stub** (owner, 2026-08-30) — it is drawn as
              designed and does nothing when tapped.

              It was left out of the first pass because no story asks for a map
              (redesign-log S-4) and the owner then asked for it back as a stub.
              This is the same arrangement as the auth screen's «Забули пароль?»
              (redesign-log A-2): the control ships so the screen matches the
              design, and it is inert so nothing claims a feature that does not
              exist.

              **Wiring it is one line** — the address is right here, and
              `openExternalUrl` would take a `maps:` or `geo:` URL built from it.
              That is deliberately not done: which map app, and what happens on
              the static web export where `maps:` does not resolve, are product
              decisions nobody has made.
            */}
            <Button
              className="h-10 flex-1"
              onPress={() => {
                // Intentionally empty — see above.
              }}
            >
              <Text className="text-body-sm font-semibold">{t.route}</Text>
            </Button>
            <Button
              variant="outline"
              className="h-10 flex-1"
              onPress={() => {
                void (async () => {
                  await Clipboard.setStringAsync(shoot.locationAddress as string)
                  succeeded()
                  onCopied(t.addressCopied)
                })()
              }}
            >
              <Text className="text-body-sm font-semibold">{t.copyAddress}</Text>
            </Button>
          </View>
        ) : null}
      </View>

      {shoot.locationNote ? (
        <View className="border-border gap-2 border-t p-4">
          <SectionLabel label={t.accessDetailsLabel} />
          {/* Line breaks are preserved: a creator writes directions as lines. */}
          <Text className="text-body-sm text-foreground/90 leading-5">{shoot.locationNote}</Text>
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

/* ─────────────────────────────── Tab «Люди» ────────────────────────────── */

function PeopleTab({
  shoot,
  crew,
  onOpenPerson,
}: {
  shoot: Shoot
  crew: CrewMember[]
  onOpenPerson: (person: SheetPerson) => void
}) {
  const t = useStrings()

  return (
    <>
      {/*
        **The confirmation card is not built** (owner, 2026-08-30).

        The handoff opens this tab with it: «2 з 4 підтвердили», a progress bar,
        «Очікують: Марія, Соломія» and a reminder button. The owner removed it,
        so the tab leads with «Клієнт».

        Nothing is lost by it. The same count is a row on the «Деталі» tab
        («Команда → 2 з 3 підтвердили»), and each person's own answer is the
        `ResponsePill` on their row below — the card was a summary of what is
        already on the screen twice. The reminder button it carried was never
        built either: there is no notification mechanism in this product.
      */}

      <View className="gap-2">
        <SectionLabel label={t.clientSection} />
        <Card variant="flat" className="gap-0 p-0">
          <PersonRow
            name={shoot.clientName}
            /* «Клієнт · Бачить команду, без нотаток» — what this person actually
               receives through their link, said on the screen where it is
               decided. Factual, not decoration: the gateway sends a client the
               crew list and never a note (ADR-013, CLAUDE.md rule 2). */
            meta={`${t.clientRole} · ${t.clientSeesCrew}`}
            /* No badge. The handoff draws «Очікує» on the client; a client has
               no response state (redesign-log S-2). */
            badge={null}
            onPress={() =>
              onOpenPerson({
                id: shoot.clientId,
                name: shoot.clientName,
                role: `${t.clientRole} · ${t.clientSeesCrew}`,
                phone: shoot.clientContact || null,
                instagram: shoot.clientInstagram,
                telegram: shoot.clientTelegram,
                badge: null,
                removable: false,
              })
            }
          />
          {/*
            The owner-only sub-row. The badge is factual rather than
            decorative: the link gateway's ShootRow has never selected the
            client's contact, so no crew member and no client has ever received
            it (ADR-018). If a story ever puts it in a payload, that is what has
            to change, not this label.
          */}
          {shoot.clientContact || shoot.clientInstagram ? (
            <View className="border-border flex-row flex-wrap items-center gap-2 border-t px-4 py-2.5">
              <Badge variant="muted" label={t.ownerOnly} />
              {shoot.clientContact ? (
                <Text className="text-label text-muted-foreground">{shoot.clientContact}</Text>
              ) : null}
              {shoot.clientInstagram ? (
                <Text className="text-label text-muted-foreground">{shoot.clientInstagram}</Text>
              ) : null}
            </View>
          ) : null}
        </Card>
      </View>

      <View className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <SectionLabel label={t.crew} />
          <Text className="text-label text-muted-foreground">
            {`${crew.length} ${pluralUk(crew.length, t.participantForms)}`}
          </Text>
        </View>

        <Card variant="flat" className="gap-0 p-0">
          {crew.map((member, index) => (
            <PersonRow
              key={member.id}
              divided={index > 0}
              name={member.name}
              meta={[member.role, member.phone ?? member.email].filter(Boolean).join(' · ')}
              badge={<ResponsePill value={member.response} label={responseLabel(member, t)} />}
              onPress={() =>
                onOpenPerson({
                  id: member.id,
                  name: member.name,
                  role: member.role,
                  phone: member.phone,
                  instagram: member.instagram,
                  telegram: member.telegram,
                  badge: {
                    label: responseLabel(member, t),
                    variant: member.response === 'confirmed' ? 'solid' : 'outline',
                  },
                  removable: true,
                })
              }
            />
          ))}

          <Link href={`/(app)/shoot/${shoot.id}/crew/add`} asChild>
            <Pressable
              /* Centred, as the handoff draws it (`justify-content:center` on
                 its «+ Додати учасника» row). It read left-aligned here, which
                 made it look like another crew row rather than the action that
                 closes the list. */
              className={`flex-row items-center justify-center gap-2 px-4 py-3.5 active:bg-secondary ${
                crew.length > 0 ? 'border-border border-t' : ''
              }`}
              onPress={tapped}
              role="button"
            >
              <Icon as={Plus} size={16} strokeWidth={2.2} className="text-muted-foreground" />
              <Text className="text-body-sm text-muted-foreground font-medium">
                {t.addCrewMember}
              </Text>
            </Pressable>
          </Link>
        </Card>
      </View>
    </>
  )
}

/** The three `US-008` answers, named. */
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
 */
function PersonRow({
  name,
  meta,
  badge,
  onPress,
  divided = false,
}: {
  name: string
  meta: string
  badge: React.ReactNode
  onPress: () => void
  divided?: boolean
}) {
  return (
    <Pressable
      className={`min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-secondary ${
        divided ? 'border-border border-t' : ''
      }`}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
      accessibilityLabel={name}
    >
      <Avatar name={name} size={40} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-body text-foreground font-semibold" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-label text-muted-foreground" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {badge}
    </Pressable>
  )
}

/* ───────────────────────────── Tab «Матеріали» ─────────────────────────── */

function MaterialsTab({
  shoot,
  references,
  onAdded,
  onRemoved,
  onCopied,
}: {
  shoot: Shoot
  references: Reference[]
  onAdded: (reference: Reference) => void
  onRemoved: (id: string) => void
  onCopied: (message: string) => void
}) {
  const t = useStrings()
  const router = useRouter()
  const [category, setCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const photos = references.filter((reference) => reference.kind === 'image').length
  const links = references.length - photos
  const shown = category === null ? references : references.filter((r) => r.category === category)

  const handle = (result: AddReferenceResult) => {
    if (result.ok) {
      onAdded(result.reference)
      setError(null)
      return
    }
    setError(
      result.reason === 'invalidLink'
        ? t.referenceLinkInvalid
        : result.reason === 'unsupportedType'
          ? t.referenceTypeUnsupported
          : t.referenceAddFailed
    )
  }

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (picked.canceled) return

    setBusy(true)
    // Into the chip that is currently active — the handoff's filter doubles as
    // the destination, which is the same idea the previous pass's per-group «+»
    // had: the group you add into IS the choice, so no picker and no new copy.
    handle(await addImageReference(shoot.id, picked.assets[0], category))
    setBusy(false)
  }

  /*
    Both slots, always — `US-024` and `US-025` are two fixed places, not a list
    that grows. An empty one is rendered rather than hidden: this is the
    CREATOR's screen, and the row is the only thing on it that says the slot
    exists and can be filled. (`FileSection`'s «В розробці» placeholder makes the
    same argument for the client's view, where AC-1 requires the section to be
    present but empty so a reader can tell "not ready" from "this app does not do
    that".)
  */
  /*
    Removing a reference asks first (owner, 2026-08-30).

    Unlike the crew removal on the «Люди» tab, which the handoff gives a 4-second
    undo instead of a question, and unlike the edit screen's location ✕, which is
    only a draft change until «Зберегти» — a ✕ here writes immediately and
    `soft_remove_reference` has no inverse. So it takes the same guarantee
    `US-019` and `US-022` use, through the same component.
  */
  const { ask: askRemove, dialog: removeDialog } = useDestructiveConfirm<Reference>({
    question: t.confirmRemoveReference,
    label: t.remove,
    onConfirm: (reference) => {
      void (async () => {
        // Removed from view only once the write succeeded. There is no undo to
        // fall back on here, so an optimistic hide that silently failed would
        // leave the reference on the shoot with nothing saying so.
        if (await removeReference(reference.id)) {
          succeeded()
          onRemoved(reference.id)
        } else {
          setError(t.referenceAddFailed)
        }
      })()
    },
  })

  const files = [
    { title: t.sourceFilesSection, url: shoot.rawFilesUrl },
    { title: t.finishedFilesSection, url: shoot.finishedPhotosUrl },
  ]
  const setLinks = files.filter((file) => file.url).length

  return (
    <>
      <View className="gap-2.5">
        <View className="flex-row items-baseline justify-between">
          <SectionLabel label={t.references} />
          <Text className="text-label text-muted-foreground">
            {`${photos} ${t.photosWord} · ${links} ${pluralUk(links, t.linkForms)}`}
          </Text>
        </View>

        {/*
          The filter chips. «Всі» plus the three categories the previous pass
          took from the Figma frame (`referenceCategories`) — no story supplies
          them, which redesign-log S-7 already records. A category with nothing in
          it still gets a chip, as the handoff draws: the chips are the shape of
          the collection, not a summary of it.
        */}
        {/*
          Wrapping rather than a horizontal ScrollView. There are four chips at
          most — «Всі» plus `referenceCategories` — and a nested scroll view
          inside the screen's own would fight it for the gesture on a row that
          rarely needs to scroll at all.
        */}
        <View className="flex-row flex-wrap gap-2">
          <FilterChip
            label={`${t.allFilter} ${references.length}`}
            active={category === null}
            onPress={() => setCategory(null)}
          />
          {t.referenceCategories.map((name) => (
            <FilterChip
              key={name}
              label={`${name} ${references.filter((r) => r.category === name).length}`}
              active={category === name}
              onPress={() => setCategory(name)}
            />
          ))}
        </View>

        <ReferenceGrid
          references={shown}
          onRemove={askRemove}
          trailing={
            <Pressable
              className="border-border h-[84px] w-[84px] items-center justify-center rounded-lg border active:bg-secondary"
              disabled={busy}
              onPress={() => void pickFromGallery()}
              role="button"
              accessibilityLabel={t.addReferenceOrFile}
            >
              <Icon as={Plus} size={20} strokeWidth={2} className="text-muted-foreground" />
            </Pressable>
          }
        />

        {/* `US-003` AC-2 — an unsupported file or a failed upload says so, and
            the list is left exactly as it was. */}
        {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
        {removeDialog}
      </View>

      {/*
        «Файли» — `US-024` and `US-025`.

        The handoff's «Незабаром: перетягуйте сюди одразу багато файлів» note is
        not built — it advertises a feature that does not exist and is on no
        backlog (redesign-log S-6).
      */}
      <View className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <SectionLabel label={t.editFilesTitle} />
          <Text className="text-label text-muted-foreground">
            {`${setLinks} ${pluralUk(setLinks, t.linkForms)}`}
          </Text>
        </View>
        <Card variant="flat" className="gap-0 p-0">
          {files.map((file, index) => (
            <FileRow
              key={file.title}
              title={file.title}
              url={file.url}
              divided={index > 0}
              onEdit={() => router.push(`/(app)/shoot/${shoot.id}/edit`)}
              onCopied={onCopied}
            />
          ))}
        </Card>
      </View>

      {/*
        The sticky CTA belongs to this tab alone.

        The handoff gives «Люди» one too — «Скопіювати для тих, хто не
        підтвердив (2)» — and it is not built: copying for a GROUP is a feature
        that does not exist (redesign-log S-5), and per-person copy lives in the
        sheet. «Деталі» has none in the handoff either.
      */}
      <Button
        variant="cta"
        size="cta"
        className="mt-2"
        disabled={busy}
        onPress={() => void pickFromGallery()}
      >
        <Text>{t.addReferenceOrFile}</Text>
      </Button>
    </>
  )
}

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
      className={`min-h-[34px] shrink-0 justify-center rounded-lg border px-3 ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
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
  onEdit,
  onCopied,
}: {
  title: string
  url: string | null
  divided: boolean
  onEdit: () => void
  onCopied: (message: string) => void
}) {
  const t = useStrings()

  return (
    <View
      className={`flex-row items-center gap-3 p-3.5 ${divided ? 'border-border border-t' : ''}`}
    >
      <View className="bg-secondary h-[34px] w-[34px] items-center justify-center rounded-lg">
        <Icon as={FolderOpen} size={16} strokeWidth={1.8} className="text-foreground" />
      </View>

      <Pressable
        className="min-w-0 flex-1 gap-0.5 active:opacity-60"
        onPress={() => {
          tapped()
          if (url) void openExternalUrl(url)
          else onEdit()
        }}
        role={url ? 'link' : 'button'}
        accessibilityLabel={title}
      >
        <Text className="text-body-sm text-foreground font-semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-label text-muted-foreground" numberOfLines={1}>
          {url ? displayLink(url) : t.inDevelopment}
        </Text>
      </Pressable>

      {url ? (
        <Button
          variant="outline"
          className="h-9 shrink-0 px-3"
          onPress={() => {
            void (async () => {
              await Clipboard.setStringAsync(url)
              succeeded()
              onCopied(`${t.linkCopied} — ${title}`)
            })()
          }}
        >
          <Text className="text-label font-semibold">{t.copyWord}</Text>
        </Button>
      ) : (
        <Icon as={ChevronRight} size={16} strokeWidth={1.8} className="text-muted-foreground" />
      )}
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
