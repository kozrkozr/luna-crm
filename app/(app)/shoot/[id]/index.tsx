import { useCallback, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '../../../../src/components/ui/button'
import { Input } from '../../../../src/components/ui/input'
import { Separator } from '../../../../src/components/ui/separator'
import { Text } from '../../../../src/components/ui/text'
import { StatusPill } from '../../../../src/components/StatusPill'
import { formatTimeRange } from '../../../../src/features/shoots/date'
import { DestructiveAction } from '../../../../src/components/DestructiveAction'
import {
  ReferenceGrid,
  REFERENCE_DISPLAY_LIMIT,
} from '../../../../src/components/ReferenceGrid'
import { ImageViewer } from '../../../../src/components/ImageViewer'
import { openExternalUrl } from '../../../../src/lib/openExternalUrl'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import {
  deleteShoot,
  getShoot,
  setShootStatus,
  type Shoot,
  type ShootStatus,
} from '../../../../src/features/shoots/api'
import {
  addImageReference,
  addLinkReference,
  listReferences,
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

/**
 * The creator's shoot detail screen.
 *
 * ux-notes.md lists this screen under nine stories at once (US-002, US-003,
 * US-005, US-006, US-018, US-019, US-020, US-024, US-025), and no story owns it
 * outright. US-003 is the first to need it, so it arrives here carrying only
 * what US-003 requires: enough of the shoot to know which one this is, and the
 * references block.
 *
 * US-018 added the Локація section and the way into the edit screen; US-020
 * added the status toggle; US-005 added the Команда section; US-027 added the
 * Клієнт row.
 *
 * US-019 added delete.
 *
 * Deliberately absent, each belonging to a story not yet built: crew
 * (US-005/US-006) and the raw-files / finished-photos sections
 * (US-024/US-025).
 */
export default function ShootDetailScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })

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
        setState(
          shoot && references && crew
            ? { status: 'loaded', shoot, references, crew }
            : { status: 'error' }
        )
      })()
      return () => {
        active = false
      }
    }, [id])
  )

  const onAdded = (reference: Reference) =>
    setState((current) =>
      current.status === 'loaded'
        ? { ...current, references: [...current.references, reference] }
        : current
    )

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4">
        <Text className="text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const { shoot, references, crew } = state

  return (
    <>
      <Stack.Screen options={{ title: shoot.clientName }} />
      <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
        <View className="gap-3 p-4">
          {/*
            The client name is the navigation title and is not repeated in the
            body — the same pattern as the shoot list and the profile screen.
            The prototype shows it once too; it only puts it in the body because
            its header is a brand bar rather than a native title.
          */}
          <View className="flex-row items-center gap-3">
            {/*
              US-030 AC-4 — the range sits between the date and the location.
              `formatTimeRange` returns null for a shoot created before that
              story, and the segment then drops out entirely (AC-6) rather than
              showing an empty dash.
            */}
            <Text className="text-muted-foreground flex-1">
              {[shoot.date, formatTimeRange(shoot.startTime, shoot.endTime), shoot.locationAddress]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <StatusPill value={shoot.status} />
          </View>

          <View className="flex-row items-stretch gap-2">
            {/* US-018 AC-1 — the way into edit. */}
            <Link href={`/(app)/shoot/${shoot.id}/edit`} asChild>
              <Button variant="outline" className="h-auto flex-1 py-2">
                <Text>{t.edit}</Text>
              </Button>
            </Link>
            <StatusToggle
              shoot={shoot}
              onChanged={(status) =>
                setState((current) =>
                  current.status === 'loaded'
                    ? { ...current, shoot: { ...current.shoot, status } }
                    : current
                )
              }
            />
          </View>

          <ClientSection shoot={shoot} />

          <LocationSection shoot={shoot} />

          <ReferencesBlock shootId={shoot.id} references={references} onAdded={onAdded} />

          <CrewSection
            shootId={shoot.id}
            crew={crew}
            onRemoved={(removedId) =>
              setState((current) =>
                current.status === 'loaded'
                  ? { ...current, crew: current.crew.filter((m) => m.id !== removedId) }
                  : current
              )
            }
          />

          {/*
            US-019 — last on the screen, as in the prototype. A destructive
            action sitting under everything else is harder to hit by accident
            than one next to the things you came here to use, and the
            confirmation is the actual guarantee (AC-2).
          */}
          <View className="pt-6">
            <DestructiveAction
              label={t.deleteShoot}
              question={t.confirmDeleteShoot}
              onConfirm={() => {
                void (async () => {
                  if (await deleteShoot(shoot.id)) {
                    // AC-1 — it disappears from the list, which refetches on
                    // focus. Never `push`: the deleted shoot must not stay on
                    // the stack to be swiped back to.
                    //
                    // `back` only when there is something to go back to. Arrive
                    // here from a deep link — a notification, a shared URL, a
                    // cold start on this route — and the stack is empty, so
                    // `back` does nothing and leaves the reader looking at a
                    // shoot that no longer exists.
                    if (router.canGoBack()) router.back()
                    else router.replace('/(app)')
                  }
                })()
              }}
            />
          </View>
        </View>
      </ScrollView>
    </>
  )
}

/**
 * US-005 — the shoot's crew.
 *
 * AC-1's "appears in the shoot's crew list" is this. Each row shows the name,
 * the role and whichever contact was actually stored, as the prototype's
 * crew-row does.
 *
 * US-006 put each person's link with them, as a copy icon in this block — the
 * layout change from Ilona's prototype review, rather than a separate "links"
 * section.
 *
 * US-022 added the remove control.
 *
 * Deliberately absent: opening a person for their full details, which US-023
 * gives the crew and US-026 the client, but which no story asks for on the
 * creator's own screen — they wrote the record. The note is not shown here
 * either — the prototype's row does not
 * show it, and it is the field ADR-013 exists to keep away from clients, so the
 * fewer places it is rendered the better.
 */
function CrewSection({
  shootId,
  crew,
  onRemoved,
}: {
  shootId: string
  crew: CrewMember[]
  onRemoved: (id: string) => void
}) {
  const t = useStrings()
  return (
    <View className="gap-2 pt-2">
      <Text variant="h4">{t.crew}</Text>

      {crew.length > 0 ? (
        <View className="border-border overflow-hidden rounded-lg border">
          {crew.map((member, index) => (
            <View key={member.id}>
              {index > 0 ? <Separator /> : null}
              <View className="flex-row items-center gap-3 px-4 py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="font-medium">{member.name}</Text>
                  <Text className="text-muted-foreground text-sm">
                    {`${member.role} · ${member.phone ?? member.email ?? ''}`}
                  </Text>
                </View>
                <CrewResponsePill value={member.response} />
                <CopyLink token={() => crewLinkToken(shootId, member.id)} whose={member.name} />
                <RemoveCrewMember member={member} onRemoved={onRemoved} />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Link href={`/(app)/shoot/${shootId}/crew/add`} asChild>
        <Button variant="secondary">
          <Text>{t.addCrewMember}</Text>
        </Button>
      </Link>
    </View>
  )
}

/**
 * US-022 — take someone off the shoot, after asking.
 *
 * AC-2 requires the confirmation, for the same reason US-019 does: an
 * accidental tap must not silently cut someone out. It reuses the same
 * component, so on a device this is a real iOS alert rather than an
 * approximation of one.
 *
 * The trigger is the prototype's ✕, compact so it sits in the row without
 * dominating a list of people. It carries an accessibility label, because a
 * bare glyph next to a 🔗 is two unlabelled icons doing very different things.
 */
function RemoveCrewMember({
  member,
  onRemoved,
}: {
  member: CrewMember
  onRemoved: (id: string) => void
}) {
  const t = useStrings()
  const [busy, setBusy] = useState(false)

  return (
    <DestructiveAction
      compact
      label={t.removeCrewTitle}
      question={t.confirmRemoveCrew}
      disabled={busy}
      onConfirm={() => {
        void (async () => {
          setBusy(true)
          const removed = await removeCrewMember(member.id)
          setBusy(false)
          // AC-1 — they no longer appear in the crew list. Dropping them from
          // local state moves the row now; the screen refetches on focus and
          // the policy would exclude them anyway.
          if (removed) onRemoved(member.id)
        })()
      }}
    />
  )
}

/**
 * The copy-to-clipboard control, for a crew member's link (US-006 AC-1) or the
 * client's (US-027 AC-1).
 *
 * The token is created on first tap and reused after that — US-027 AC-2 states
 * that rule and US-006 already worked this way: minting a new token would
 * silently kill a link that had already been sent.
 *
 * The delivery mechanism is deliberately just the clipboard: both stories leave
 * SMS or anything else unspecified, and the prototype copies too.
 */
function CopyLink({
  token: mintToken,
  whose,
}: {
  token: () => Promise<string | null>
  /**
   * Whose link this copies. A shoot with three crew members has four of these
   * controls, and «Скопіювати посилання» four times over says nothing about
   * which is which to anyone not looking at the row it sits in.
   */
  whose: string
}) {
  const t = useStrings()
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    setState('busy')
    const token = await mintToken()
    const url = token ? linkUrl(token) : null
    if (!url) {
      setState('failed')
      return
    }
    await Clipboard.setStringAsync(url)
    setState('copied')
    // Long enough to read, short enough that the row does not stay changed.
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={state === 'busy'}
      onPress={() => void copy()}
      accessibilityLabel={`${t.copyLinkTitle}: ${whose}`}
    >
      <Text>{state === 'copied' ? '✓' : '🔗'}</Text>
    </Button>
  )
}

/**
 * The crew member's answer to their invitation (US-008). Shown from here on
 * because the column exists and defaults to `pending`; nothing on this screen
 * can change it — that happens through their own link.
 */
function CrewResponsePill({ value }: { value: CrewMember['response'] }) {
  const t = useStrings()
  const tone =
    value === 'confirmed'
      ? 'bg-status-finished border-status-finished-border'
      : value === 'declined'
        ? 'bg-destructive/10 border-destructive/30'
        : 'bg-status-new border-status-new-border'
  const text =
    value === 'confirmed'
      ? 'text-status-finished-foreground'
      : value === 'declined'
        ? 'text-destructive'
        : 'text-status-new-foreground'
  const label =
    value === 'confirmed'
      ? t.responseConfirmed
      : value === 'declined'
        ? t.responseDeclined
        : t.responsePending

  return (
    <View className={`rounded-full border px-2.5 py-1 ${tone}`}>
      <Text className={`text-xs font-bold ${text}`}>{label}</Text>
    </View>
  )
}

/**
 * US-020 — mark the shoot Finished, or back to New.
 *
 * A toggle, not a picker. AC-2 requires that "New and Finished are the only two
 * options — there is no way to reach any other status value, intentionally or
 * by mistake", and a control with exactly one destination cannot offer a third.
 * The label names where the tap leads, as the prototype's does.
 *
 * The status is only informational in v1: US-020's Out of scope rules out
 * anything happening as a result, so nothing here locks edits or hides the
 * shoot.
 */
function StatusToggle({
  shoot,
  onChanged,
}: {
  shoot: Shoot
  onChanged: (status: ShootStatus) => void
}) {
  const t = useStrings()
  const [busy, setBusy] = useState(false)
  const next: ShootStatus = shoot.status === 'new' ? 'finished' : 'new'

  const toggle = async () => {
    setBusy(true)
    const ok = await setShootStatus(shoot.id, next)
    setBusy(false)
    // AC-1 — the shoot shows the new status wherever it is displayed. Updating
    // local state moves the pill here immediately; the list refetches on focus.
    if (ok) onChanged(next)
  }

  return (
    // The label wraps rather than truncating. «Позначити як «Закінчена»» does
    // not fit half a phone's width on one line, and a button reading
    // «Позначити як «Закін...» tells the reader less than the pill beside it
    // already does. `h-auto` and vertical padding let the button grow instead.
    <Button variant="secondary" className="h-auto flex-1 py-2" disabled={busy} onPress={toggle}>
      <Text className="text-center">{next === 'finished' ? t.markFinished : t.markNew}</Text>
    </Button>
  )
}

/**
 * US-027 — the shoot's client, and their link.
 *
 * AC-3 — the name and contact `US-002` collects, which until now appeared on no
 * screen at all: the name was only ever the navigation title and the contact was
 * nowhere. AC-1/AC-2 — the copy control beside them, mirroring a crew member's
 * row so that a link always sits next to whoever it belongs to.
 *
 * Not editable from here: `US-018`'s Out of scope excludes editing client
 * contact info, and `US-027` does not reopen it.
 */
function ClientSection({ shoot }: { shoot: Shoot }) {
  const t = useStrings()
  return (
    <View className="gap-2 pt-2">
      <Text variant="h4">{t.clientSection}</Text>
      <View className="border-border overflow-hidden rounded-lg border">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View className="flex-1 gap-0.5">
            <Text className="font-medium">{shoot.clientName}</Text>
            <Text className="text-muted-foreground text-sm">{shoot.clientContact}</Text>
          </View>
          <CopyLink token={() => clientLinkToken(shoot.id)} whose={shoot.clientName} />
        </View>
      </View>
    </View>
  )
}

/**
 * US-018 — the location, shown wherever it is displayed (AC-1, AC-2).
 *
 * Renders nothing at all when there is no address, note or attachment. An
 * empty «Локація» heading over blank space would suggest the section had
 * failed to load rather than never been filled in, and the prototype shows it
 * only when there is something in it.
 *
 * The address itself already appears next to the date above, as it does in the
 * list; this section is the note and its attachment.
 */
function LocationSection({ shoot }: { shoot: Shoot }) {
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
    <View className="gap-2 pt-2">
      <Text variant="h4">{t.locationSection}</Text>
      {shoot.locationAddress ? <Text>{shoot.locationAddress}</Text> : null}
      {shoot.locationNote ? (
        <Text className="text-muted-foreground">{shoot.locationNote}</Text>
      ) : null}

      {attachment && kind === 'image' ? (
        <Pressable
          className="bg-secondary border-border h-40 w-full overflow-hidden rounded-md border active:opacity-70"
          disabled={!uri}
          onPress={() => uri && setViewing(uri)}
          role="button"
          accessibilityLabel={t.locationSection}
        >
          {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="cover" /> : null}
        </Pressable>
      ) : null}

      {attachment && kind === 'video' ? (
        /*
          A video opens in the platform's player rather than playing inline.
          Nothing here specifies inline playback, and risks.md R-4 puts video
          behind spike S-4 — which has not run — including whether a signed URL
          survives an idle page long enough to press play. Opening it is the
          same gesture US-003 AC-3 established for a link reference.
        */
        <Pressable
          className="bg-secondary border-border h-20 w-full items-center justify-center rounded-md border active:opacity-70"
          disabled={!uri}
          onPress={() => uri && void openExternalUrl(uri)}
          role="button"
          accessibilityLabel={t.attachVideo}
        >
          <Text className="text-3xl">🎞</Text>
        </Pressable>
      ) : null}

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </View>
  )
}

/**
 * US-003. Every reference on the shoot is rendered — there is no display limit
 * here on purpose. The prototype caps the grid at four and offers a "show all"
 * button, but that button and the page behind it are US-021, and US-003's Out
 * of scope says so explicitly. Capping without the page would hide references
 * with no way to reach them.
 */
function ReferencesBlock({
  shootId,
  references,
  onAdded,
}: {
  shootId: string
  references: Reference[]
  onAdded: (reference: Reference) => void
}) {
  const t = useStrings()
  const [link, setLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // AC-2 — on rejection the list is left exactly as it was. Nothing here
  // touches `references`; only a successful add calls onAdded.
  const handle = (result: Awaited<ReturnType<typeof addLinkReference>>) => {
    if (result.ok) {
      onAdded(result.reference)
      setLink('')
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

  const submitLink = async () => {
    setBusy(true)
    handle(await addLinkReference(shootId, link))
    setBusy(false)
  }

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    })
    if (picked.canceled) return

    setBusy(true)
    handle(await addImageReference(shootId, picked.assets[0]))
    setBusy(false)
  }

  return (
    <View className="gap-3 pt-2">
      <Text variant="h4">{t.references}</Text>

      {/*
        US-021 AC-1/AC-2 — the shoot's own page shows up to the display limit,
        and offers the full list only when there is more than fits. Below the
        limit there is no link at all, which AC-2 requires.
      */}
      <ReferenceGrid references={references.slice(0, REFERENCE_DISPLAY_LIMIT)} />

      {references.length > REFERENCE_DISPLAY_LIMIT ? (
        <Link href={`/(app)/shoot/${shootId}/references`} asChild>
          <Button variant="secondary">
            <Text>{`${t.showAllReferences} (${references.length})`}</Text>
          </Button>
        </Link>
      ) : null}

      <View className="flex-row items-center gap-2">
        <Input
          className="flex-1"
          value={link}
          onChangeText={(value) => {
            setLink(value)
            setError(null)
          }}
          autoCapitalize="none"
          keyboardType="url"
          placeholder={t.refPlaceholder}
        />
        <Button variant="outline" size="icon" disabled={busy} onPress={pickFromGallery}>
          <Text>{t.pickFromGallery}</Text>
        </Button>
        <Button variant="secondary" disabled={busy || !link.trim()} onPress={submitLink}>
          <Text>{t.addRefBtn}</Text>
        </Button>
      </View>

      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
    </View>
  )
}
