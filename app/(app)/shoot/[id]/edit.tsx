import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Film from 'lucide-react-native/icons/film'
import X from 'lucide-react-native/icons/x'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../src/components/ui/alert-dialog'
import { Badge } from '../../../../src/components/ui/badge'
import { Button } from '../../../../src/components/ui/button'
import { Icon } from '../../../../src/components/ui/icon'
import { Input } from '../../../../src/components/ui/input'
import { Label } from '../../../../src/components/ui/label'
import { Tabs } from '../../../../src/components/ui/tabs'
import { Text } from '../../../../src/components/ui/text'
import { Textarea } from '../../../../src/components/ui/textarea'
import { DateField } from '../../../../src/components/DateField'
import { ImageViewer } from '../../../../src/components/ImageViewer'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { succeeded, tapped } from '../../../../src/lib/haptics'
import { openExternalUrl } from '../../../../src/lib/openExternalUrl'
import { toastOnNextScreen } from '../../../../src/lib/nextScreenToast'
import {
  deleteShoot,
  getShoot,
  listShoots,
  setShootStatus,
  updateShoot,
  type Shoot,
  type ShootStatus,
} from '../../../../src/features/shoots/api'
import { overlappingShoots, pastLocations } from '../../../../src/features/shoots/home'
import { createClient, updateClient } from '../../../../src/features/clients/api'
import {
  SectionLabel,
  ShootLocationFields,
  ShootWhenFields,
} from '../../../../src/components/ShootFormFields'
import { isValidReferenceLink } from '../../../../src/features/references/api'
import { toIsoDate } from '../../../../src/features/shoots/date'
import {
  attachmentKind,
  signedLocationUrl,
  uploadLocationAttachment,
} from '../../../../src/features/shoots/locationMedia'

/**
 * The editable shoot, as the form holds it.
 *
 * `status` joined this on 2026-08-30: the handoff's «Основне» group puts the
 * status segment on this screen, where it used to be a pill on the detail
 * screen. It is saved through `setShootStatus`, not `updateShoot` — see the
 * note in `submit`.
 */
type Draft = {
  /**
   * Which client the shoot belongs to (`ADR-018`).
   *
   * Editable since 2026-08-30 — `US-018`'s Out of scope had excluded it and the
   * owner reopened it. Changing it **moves the shoot to another client**; it
   * never renames one, for the reason on `UpdateShootInput`.
   *
   * Null only in the state a reader can reach by clearing the field: the typed
   * name in `typedName` then becomes a new client at save.
   */
  clientId: string | null
  /** Kept beside the id so `sameDraft` can see a cleared or retyped name. */
  clientName: string
  /**
   * The client's own contact details. Editing them writes `clients`, so a
   * change propagates to every shoot that person is on — see `updateClient`.
   * The NAME above does not work that way and deliberately never has.
   */
  clientPhone: string
  clientInstagram: string
  clientTelegram: string
  status: ShootStatus
  date: Date | null
  /**
   * `US-030` AC-5, collected the way the create form collects it since
   * 2026-08-30: a start plus a duration, with the end computed at save.
   *
   * **Still nullable**, which is AC-6: a shoot created before that story has
   * neither time, so the rail opens with nothing selected and save is blocked
   * until a slot is picked. A default would quietly fill a field nobody chose,
   * which is not what "the next edit collects them" means.
   */
  start: string | null
  /**
   * The end, stored rather than derived (2026-09-03). It was
   * `durationMinutes`, because variant 2b collected a duration and computed the
   * end at save; the range grid collects both, so the draft holds what the
   * columns hold.
   */
  end: string | null
  /** `location_name` — the venue («Студія KULT»), new in 20260903120000. */
  locationName: string
  address: string
  /** `location_note` — how to get in. Not the shoot's own note below. */
  note: string
  /**
   * The shoot's own note, restored 2026-08-30 with migration
   * `20260830160000_shoot_notes.sql`. It was cut from this form when there was
   * no column for it (redesign-log S-1 / H-1); the owner added one.
   */
  notes: string
  attachment: string | null
  rawFilesUrl: string
  finishedPhotosUrl: string
}

/**
 * `US-018` — edit a shoot's date and location, restyled to
 * `design_handoff_shoot_detail/`'s "Screen 2 — Редагувати зйомку" (owner,
 * 2026-08-30).
 *
 * What the redesign changes, beyond looks:
 *
 * - **Its own header**, replacing the navigator's: «Скасувати» · «Редагувати» ·
 *   «Зберегти», with the save control dimmed until something is dirty.
 * - **Dirty tracking.** The form holds a `draft` against the `saved` shape it
 *   loaded, and leaving with unsaved changes asks first.
 * - **The status moved here** from the detail screen's pill.
 *
 * **Three of the handoff's form groups are not built**, each because the column
 * behind it does not exist (owner: "build UI only for what exists"):
 *
 * - «Клієнт» as a text field. `US-018`'s Out of scope says client name and
 *   contact were not asked for and "if that's also needed, it's a new ask". It
 *   is shown read-only instead, so the reader can see WHICH shoot they are
 *   editing without a write path being invented.
 * - «Назва локації», «Код доступу», «Охорона» — one free-text `location_note`
 *   is what `shoots` has, and it is the field a creator already puts exactly
 *   that in.
 * - «Нотатки» — there is no shoot-level notes column at all. This is
 *   redesign-log S-1, which the previous pass had already flagged as missed
 *   scope rather than invented.
 *
 * The «Скасувати зйомку» note — «Команда й клієнт отримають повідомлення про
 * скасування» — is likewise absent: nothing notifies anybody, and shipping the
 * sentence would promise it.
 */
export default function EditShootScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [saved, setSaved] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [clientError, setClientError] = useState(false)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [startError, setStartError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  /** Every shoot, for the location chips and the clash warning. */
  const [existing, setExisting] = useState<Shoot[]>([])

  /*
    Loaded once, not on every focus.

    The previous version used `useFocusEffect` and would have overwritten a
    half-typed form the moment the reader came back from the date picker or the
    image library. Nothing dirty may be clobbered now that "dirty" is a concept
    this screen has.
  */
  const loadedFor = useRef<string | null>(null)
  useFocusEffect(
    useCallback(() => {
      if (loadedFor.current === id) return
      loadedFor.current = id
      let active = true
      void (async () => {
        const shoot = await getShoot(id)
        if (!active) return
        if (!shoot) return setFailedToLoad(true)
        const loaded: Draft = {
          clientId: shoot.clientId,
          clientName: shoot.clientName,
          clientPhone: shoot.clientContact,
          clientInstagram: shoot.clientInstagram ?? '',
          clientTelegram: shoot.clientTelegram ?? '',
          status: shoot.status,
          // The stored date is a plain YYYY-MM-DD. Split rather than
          // `new Date(string)`, which parses a bare date as UTC midnight and
          // can land on the previous day west of Greenwich.
          date: fromIsoDate(shoot.date),
          start: shoot.startTime,
          // Taken as stored. A shoot saved at 09:30 keeps its half hour — the
          // grid cannot highlight it, but nothing here rewrites it either.
          end: shoot.endTime,
          locationName: shoot.locationName ?? '',
          address: shoot.locationAddress ?? '',
          note: shoot.locationNote ?? '',
          notes: shoot.notes ?? '',
          attachment: shoot.locationAttachment,
          rawFilesUrl: shoot.rawFilesUrl ?? '',
          finishedPhotosUrl: shoot.finishedPhotosUrl ?? '',
        }
        setSaved(loaded)
        setDraft(loaded)
      })()
      return () => {
        active = false
      }
    }, [id])
  )

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoots = await listShoots()
        // Not fatal: the chips and the clash warning are both conveniences.
        if (active && shoots) setExisting(shoots)
      })()
      return () => {
        active = false
      }
    }, [])
  )

  const dirty = !!draft && !!saved && !sameDraft(draft, saved)

  const leave = () => {
    if (dirty) return setConfirmDiscard(true)
    router.back()
  }

  const pick = async (kind: 'image' | 'video') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? ['images'] : ['videos'],
      quality: 1,
    })
    if (picked.canceled) return

    setBusy(true)
    setFormError(null)
    const path = await uploadLocationAttachment(id, picked.assets[0])
    setBusy(false)

    if (!path) return setFormError(t.attachmentTypeUnsupported)
    // One column, so a new attachment replaces the old one — AC-2 allows one
    // image OR one video, not both.
    set('attachment', path)
  }

  const submit = async () => {
    if (!draft) return

    // The same rule the create form applies: a shoot always has a client.
    // Reachable here now that the field can be cleared.
    if (!draft.clientId && !draft.clientName.trim()) {
      setClientError(true)
      setFormError(null)
      return
    }
    setClientError(false)

    // AC-3 — a shoot always needs a date, the same rule as creation. Checked
    // before the request, so a cleared date never reaches the row.
    if (!draft.date) {
      setDateError(true)
      setFormError(null)
      return
    }
    setDateError(false)

    // US-030 AC-6 — a shoot created before that story opens with no start, and
    // save is blocked until one is picked. There is no end to check any more:
    // the duration always holds a value, so an end can always be computed.
    if (!draft.start) {
      setStartError(true)
      setFormError(null)
      return
    }
    setStartError(false)

    // US-024 AC-3 and US-025 AC-3 — a malformed link is refused with a message
    // and nothing is saved, exactly as US-003 AC-2 refuses a reference. Empty is
    // not malformed: clearing the field is how a link is removed. Checked
    // together so neither can be saved while the other is malformed.
    const links = [draft.rawFilesUrl, draft.finishedPhotosUrl]
    if (links.some((link) => link.trim() && !isValidReferenceLink(link))) {
      setFormError(t.referenceLinkInvalid)
      return
    }

    setBusy(true)

    /*
      Either the shoot keeps its client, moves to one picked from the search, or
      the typed name becomes a NEW client and it moves there.

      **Never a rename.** Writing the typed name onto the linked client would
      change that person on every shoot they appear on, which `ADR-018` gave them
      cross-shoot identity precisely to make visible. `US-029`'s dedup rules the
      create form follows are the other half of this — see the note below.
    */
    const clientId =
      draft.clientId ??
      (
        await createClient({
          name: draft.clientName.trim(),
          phone: draft.clientPhone,
          instagram: draft.clientInstagram,
          telegram: draft.clientTelegram,
        })
      )?.id ??
      null
    if (!clientId) {
      setBusy(false)
      setFormError(t.shootUpdateFailed)
      return
    }

    /*
      Only when the shoot kept its existing client — a client just created above
      already carries these values, and writing them again would be a second
      round trip for nothing.
    */
    if (draft.clientId) {
      const contactChanged =
        draft.clientPhone !== saved?.clientPhone ||
        draft.clientInstagram !== saved?.clientInstagram ||
        draft.clientTelegram !== saved?.clientTelegram
      if (contactChanged) {
        await updateClient(draft.clientId, {
          phone: draft.clientPhone,
          instagram: draft.clientInstagram,
          telegram: draft.clientTelegram,
        })
      }
    }

    const ok = await updateShoot(id, {
      clientId,
      date: toIsoDate(draft.date),
      startTime: draft.start as string,
      endTime: draft.end as string,
      locationName: draft.locationName,
      locationAddress: draft.address,
      locationNote: draft.note,
      locationAttachment: draft.attachment,
      notes: draft.notes,
      rawFilesUrl: draft.rawFilesUrl,
      finishedPhotosUrl: draft.finishedPhotosUrl,
    })
    /*
      The status goes through its own call.

      `UpdateShootInput` does not carry it and is not being widened to: `US-020`
      AC-2 requires that there is "no way to reach any other status value,
      intentionally or by mistake", and `setShootStatus`'s signature — which
      admits exactly the two enum values — is one of the three barriers holding
      that. Folding status into the general update would replace a typed
      two-value door with a field on a nine-field object.

      Only sent when it changed, so an edit that touches the address does not
      write the status column too.
    */
    const statusOk =
      draft.status === saved?.status ? true : await setShootStatus(id, draft.status)
    setBusy(false)

    if (!ok || !statusOk) return setFormError(t.shootUpdateFailed)

    // AC-1 — the shoot reflects the change where it is shown. `back` returns to
    // the detail screen, which refetches on focus.
    //
    // The toast is handed to that screen rather than shown here: this one is
    // popped on the next line, and a toast rendered by a screen goes with it
    // (see src/lib/nextScreenToast.ts).
    succeeded()
    setSaved(draft)
    toastOnNextScreen(t.changesSaved)
    router.back()
  }

  if (failedToLoad) {
    return (
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  if (!draft) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const chips = pastLocations(existing)
  /*
    **This shoot is excluded**, or it would always report overlapping itself —
    it is in `existing` too, at the very times the form is showing.
  */
  const clashes =
    draft.date && draft.start && draft.end
      ? overlappingShoots(
          existing.filter((shoot) => shoot.id !== id),
          toIsoDate(draft.date),
          draft.start,
          draft.end
        )
      : []

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        The screen's own header — drawn rather than the navigator's, because
        «Зберегти» has to change colour with `dirty` and iOS's `headerRight`
        cannot be restyled per render without re-declaring the whole screen's
        options.
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
            leave()
          }}
          role="button"
        >
          <Text className="text-body text-muted-foreground" numberOfLines={1}>
            {t.cancel}
          </Text>
        </Pressable>
        <Text className="text-title-sm text-foreground flex-1 text-center font-semibold">
          {t.editTitle}
        </Text>
        <Pressable
          className="w-24 active:opacity-60"
          hitSlop={10}
          disabled={!dirty || busy}
          onPress={() => {
            tapped()
            void submit()
          }}
          role="button"
        >
          {/* Dimmed rather than hidden when there is nothing to save — the
              handoff's `#fafafa` when dirty, `#52525b` when not. A control that
              vanished would move the title. */}
          <Text
            className={`text-body text-right font-semibold ${
              dirty ? 'text-foreground' : 'text-muted-foreground/50'
            }`}
            numberOfLines={1}
          >
            {t.save}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="bg-background"
        contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-5 p-4">
          {/* ── Основне ── */}
          <View className="gap-3.5">
            <SectionLabel label={t.basicSection} />

            {/*
              **A plain input, temporarily** (owner, 2026-08-31). It was
              `ClientField` — `US-029`'s search over existing clients, with the
              suggestion list and «Переглянути профіль». That feature is parked
              for a discussion, not deleted: the create form still uses
              `ClientField`, so nothing about `US-029` is lost, and restoring it
              here is swapping this block back.

              **What save does is unchanged**, which is the point of doing it
              this way. Leave the name alone and the shoot keeps its `clientId`;
              change it and the typed name becomes a NEW client at save, exactly
              as unlinking and retyping did before. It still never renames the
              linked client — an `ADR-018` client has cross-shoot identity, so a
              rename here would silently rewrite every other shoot that person is
              on.

              The visible cost while this is parked: typing a name that already
              belongs to a client creates a second one, because nothing is
              looking any more. That is what the search prevented.
            */}
            <View className="gap-2">
              <Label htmlFor="client-name">{t.clientField}</Label>
              <Input
                id="client-name"
                value={draft.clientName}
                onChangeText={(value) => {
                  setClientError(false)
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          clientName: value,
                          // Back to the original name restores the original
                          // link, so an edit-then-undo does not strand the shoot
                          // on a client it never had.
                          clientId:
                            value.trim() === saved?.clientName ? (saved?.clientId ?? null) : null,
                        }
                      : current
                  )
                }}
                placeholder={t.clientNamePlaceholder}
                autoCapitalize="words"
              />
              {clientError ? (
                <Text className="text-destructive text-sm">{t.clientRequiredShort}</Text>
              ) : null}
            </View>

            {/*
              The client's contact details (owner, 2026-08-31), the same pair the
              create form collects.

              **These write `clients`, so they propagate to every shoot that
              person is on.** That is the point of `ADR-018` giving a client
              identity across shoots, and it is why a handle is safe to edit here
              where the NAME is not — a stale phone number everywhere is the bug
              this fixes, whereas silently rewriting a name across someone's
              history is a different kind of change.
            */}
            <View className="gap-2">
              <Label htmlFor="client-phone">{t.phoneField}</Label>
              <Input
                id="client-phone"
                value={draft.clientPhone}
                onChangeText={(value) => set('clientPhone', value)}
                autoCapitalize="none"
                keyboardType="phone-pad"
                placeholder={t.phonePlaceholder}
              />
            </View>

            <View className="gap-2">
              <Label>{t.instagramLabel}</Label>
              <Input
                value={draft.clientInstagram}
                onChangeText={(value) => set('clientInstagram', value)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t.crewInstagramPlaceholder}
              />
            </View>

            <View className="gap-2">
              <Label>{t.telegramLabel}</Label>
              <Input
                value={draft.clientTelegram}
                onChangeText={(value) => set('clientTelegram', value)}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t.telegramPlaceholder}
              />
            </View>

            {/*
              `US-020`'s two statuses, as the handoff's segmented control.

              **Two, not the handoff's three.** It draws «Заплановано / В роботі
              / Завершено»; `shoot_status` is an enum of exactly two and AC-2
              says they are "the only two options — there is no way to reach any
              other status value, intentionally or by mistake". A third segment
              would be a value the database rejects. Logged.
            */}
            <View className="gap-2">
              <Label>{t.statusLabel}</Label>
              <Tabs
                items={[
                  { value: 'new', label: t.statusNew },
                  { value: 'finished', label: t.statusFinished },
                ]}
                value={draft.status}
                onChange={(status) => set('status', status)}
              />
            </View>
          </View>

          {/*
            ── Дата й час ── The same component the create form uses (owner,
            2026-08-30): a month grid, the time range grid, the summary bar and
            the clash warning. The control inside it changed on 2026-09-03 —
            see `ShootWhenFields` — and it changed for both screens at once,
            which is the point of sharing it.

            `allowPastDates` is the one difference between the two screens, and
            it is not cosmetic — a shoot that has already happened is still
            editable, and with the past locked its own date would render dimmed
            and untappable.
          */}
          <ShootWhenFields
            date={draft.date}
            onDateChange={(picked) => {
              set('date', picked)
              setDateError(false)
            }}
            dateInvalid={dateError}
            allowPastDates
            start={draft.start}
            end={draft.end}
            onRangeChange={(nextStart, nextEnd) => {
              setDraft((current) =>
                current ? { ...current, start: nextStart, end: nextEnd } : current
              )
              setStartError(false)
            }}
            timeInvalid={startError}
            clashes={clashes}
          />

          {/*
            ── Локація ── «Назва» · «Адреса» · «Деталі», shared with the create
            form since 2026-09-03. «Деталі» is the same `location_note` this
            screen already collected as «Нотатки (як доїхати тощо)» — only the
            label moved. «Назва» is the new column.

            The attachment controls below are the one part of «Локація» that is
            not common to both screens, so they stay here.
          */}
          <View className="gap-3.5">
            <ShootLocationFields
              name={draft.locationName}
              onNameChange={(value) => set('locationName', value)}
              address={draft.address}
              onAddressChange={(value) => set('address', value)}
              details={draft.note}
              onDetailsChange={(value) => set('note', value)}
              chips={chips}
            />

            {/*
              The attachment, ABOVE the two buttons that change it: what is
              already on the shoot is the thing to see first, and the buttons
              read as "replace" once it is visible.
            */}
            {draft.attachment ? (
              <AttachmentField
                path={draft.attachment}
                onRemove={() => set('attachment', null)}
              />
            ) : null}

            <View className="flex-row gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={busy}
                onPress={() => void pick('image')}
              >
                <Text className="text-body-sm">{t.attachImage}</Text>
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={busy}
                onPress={() => void pick('video')}
              >
                <Text className="text-body-sm">{t.attachVideo}</Text>
              </Button>
            </View>
          </View>

          {/* ── Нотатки ── */}
          <View className="gap-3.5">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <SectionLabel label={t.notesSection} />
              </View>
              {/* True by construction, not by this label: the link gateway
                  builds both payloads from explicit column lists and neither
                  selects `shoots.notes`. See migration 20260830160000. */}
              <Badge variant="outline" label={t.clientCannotSee} />
            </View>
            {/*
              Restored 2026-08-30. The handoff drew this group and it was cut
              because no column existed (redesign-log S-1, then H-1); the owner
              added one, so all three places that wanted it are built.
            */}
            <Textarea
              value={draft.notes}
              onChangeText={(value) => set('notes', value)}
              placeholder={t.shootNotesPlaceholder}
              numberOfLines={5}
              className="min-h-28"
            />
          </View>

          {/* ── Файли ── */}
          <View className="gap-3.5">
            <SectionLabel label={t.editFilesTitle} />

            <View className="gap-2">
              <Label htmlFor="raw-files">{t.sourceFilesSection}</Label>
              <Input
                id="raw-files"
                value={draft.rawFilesUrl}
                onChangeText={(value) => {
                  set('rawFilesUrl', value)
                  setFormError(null)
                }}
                placeholder={t.setLinkPlaceholder}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View className="gap-2">
              <Label htmlFor="finished-photos">{t.finishedFilesSection}</Label>
              <Input
                id="finished-photos"
                value={draft.finishedPhotosUrl}
                onChangeText={(value) => {
                  set('finishedPhotosUrl', value)
                  setFormError(null)
                }}
                placeholder={t.setLinkPlaceholder}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

          {/*
            `US-019`'s delete, under a divider and last — the handoff's placement
            and the previous version's reasoning both: a destructive action
            sitting under everything else is harder to hit by accident than one
            next to the things you came here to use.

            The confirmation is AC-2's and is a real iOS alert on device
            (`DestructiveAction` is not reused here only because the handoff
            draws this as a bordered destructive button rather than that
            component's filled one — the confirmation it wraps is below).

            The handoff's note under it — «Команда й клієнт отримають
            повідомлення про скасування» — is NOT built. Nothing notifies anyone.
          */}
          <View className="border-border mt-2 border-t pt-5">
            <CancelShootButton shootId={id} />
          </View>
        </View>
      </ScrollView>

      {/*
        The sticky save. Two states, as drawn: primary and «Зберегти зміни» when
        dirty, a flat `secondary` «Немає змін» when not. Not `disabled` — it is
        already inert, and `disabled` would drop it to 50% opacity on top of the
        dimming it already has.
      */}
      <View
        className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          variant={dirty ? 'cta' : 'secondary'}
          size="cta"
          disabled={busy}
          onPress={() => dirty && void submit()}
        >
          <Text className={dirty ? undefined : 'text-muted-foreground'}>
            {dirty ? t.saveChanges : t.noChanges}
          </Text>
        </Button>
      </View>

      {/* Leaving with unsaved changes asks first — the handoff's centred alert. */}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.discardChangesTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.discardChangesBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t.keepEditing}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onPress={() => {
                setConfirmDiscard(false)
                router.back()
              }}
            >
              <Text className="text-destructive-foreground">{t.discardChanges}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  )
}

/**
 * The location attachment, as something you can actually see and get rid of.
 *
 * It used to be a line of text naming the KIND («Фото локації» / «+ Відео»), and
 * before that a 🖼 emoji — so a creator who had attached a photo could see it on
 * the detail screen and nowhere on the form that owns it, and had no way to
 * remove it at all. `US-018` AC-2 gives the field one image or one video; being
 * able to clear it is part of editing it, and `updateShoot` has always accepted
 * `locationAttachment: null`.
 *
 * A video gets a glyph rather than a frame: extracting a poster needs a video
 * library this project does not have, and `expo-video`'s thumbnailer is not a
 * dependency. It opens in the platform's player, the same gesture the detail
 * screen uses — `risks.md` R-4 puts inline playback behind spike S-4, which has
 * not run.
 *
 * **Removing clears the column, not the bucket.** The file stays in Storage,
 * unreachable because nothing points at it — exactly what
 * `uploadLocationAttachment` already documents about replacing one, and for the
 * same reason: v1 grants no DELETE anywhere (grants migration), and no story
 * asks for cleanup. It costs storage, not correctness.
 */
function AttachmentField({ path, onRemove }: { path: string; onRemove: () => void }) {
  const t = useStrings()
  const [uri, setUri] = useState<string | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const isVideo = attachmentKind(path) === 'video'

  /*
    Re-signed whenever the path changes — including when the reader replaces one
    attachment with another, where the component stays mounted and only `path`
    moves. Signed URLs expire (CLAUDE.md, "things that will surprise you"), but
    an hour is far longer than a form is open.
  */
  useEffect(() => {
    let active = true
    setUri(null)
    void (async () => {
      const signed = await signedLocationUrl(path)
      if (active) setUri(signed)
    })()
    return () => {
      active = false
    }
  }, [path])

  return (
    <View className="flex-row">
      <View>
        <Pressable
          className="bg-secondary border-border h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-lg border active:opacity-70"
          disabled={!uri}
          onPress={() => {
            if (!uri) return
            tapped()
            if (isVideo) void openExternalUrl(uri)
            else setViewing(uri)
          }}
          role="button"
          accessibilityLabel={isVideo ? t.attachVideo : t.locationPhotoLabel}
        >
          {isVideo ? (
            <Icon as={Film} size={22} strokeWidth={1.6} className="text-muted-foreground" />
          ) : uri ? (
            <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
          ) : null}
        </Pressable>

        {/*
          The ✕, half off the tile's corner. `hitSlop` rather than a bigger
          circle: §6.3's rule is to keep the visual size and widen the touch
          area, and a 44pt button over an 84pt tile would cover a quarter of it.
        */}
        <Pressable
          className="bg-secondary border-border absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full border active:opacity-70"
          hitSlop={10}
          onPress={() => {
            tapped()
            onRemove()
          }}
          role="button"
          accessibilityLabel={t.remove}
        >
          <Icon as={X} size={13} strokeWidth={2.4} className="text-foreground" />
        </Pressable>
      </View>

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </View>
  )
}

/**
 * `US-019` AC-2's confirmation, under the handoff's destructive-outline button.
 *
 * Split out so the dialog's open state does not sit among the form's twelve
 * other pieces of state.
 */
function CancelShootButton({ shootId }: { shootId: string }) {
  const t = useStrings()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="border-destructive/60 h-11 w-full active:bg-destructive/15"
        disabled={busy}
        onPress={() => setOpen(true)}
      >
        <Text className="text-body-sm text-destructive font-semibold">{t.cancelShoot}</Text>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDeleteShoot}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t.cancel}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onPress={() => {
                void (async () => {
                  setBusy(true)
                  const ok = await deleteShoot(shootId)
                  setBusy(false)
                  setOpen(false)
                  // AC-1 — it disappears from the list. `/(app)/shoots`, not
                  // `back`: back would land on the detail screen of a shoot that
                  // no longer exists.
                  if (ok) router.replace('/(app)/shoots')
                })()
              }}
            >
              <Text className="text-destructive-foreground">{t.cancelShoot}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Whether two drafts are the same — what `dirty` is built on.
 *
 * Field by field rather than `JSON.stringify`, which the prototype uses: `date`
 * is a `Date`, and stringify would compare it by its full ISO instant. The
 * picker returns a NEW Date on every interaction, so a reader who opened it and
 * chose the same day would have made the form dirty. Comparing the values that
 * are actually saved is the only thing that matches what "changed" means here.
 */
function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.clientId === b.clientId &&
    a.clientName === b.clientName &&
    a.clientPhone === b.clientPhone &&
    a.clientInstagram === b.clientInstagram &&
    a.clientTelegram === b.clientTelegram &&
    a.status === b.status &&
    sameDay(a.date, b.date) &&
    a.start === b.start &&
    a.end === b.end &&
    a.locationName === b.locationName &&
    a.address === b.address &&
    a.note === b.note &&
    a.notes === b.notes &&
    a.attachment === b.attachment &&
    a.rawFilesUrl === b.rawFilesUrl &&
    a.finishedPhotosUrl === b.finishedPhotosUrl
  )
}

const sameDay = (a: Date | null, b: Date | null) =>
  a === null || b === null ? a === b : toIsoDate(a) === toIsoDate(b)

/** YYYY-MM-DD to a local Date, avoiding `new Date(string)`'s UTC parsing. */
function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
