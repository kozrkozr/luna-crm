import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Text } from '../../components/ui/text'
import { Textarea } from '../../components/ui/textarea'
import {
  SectionLabel,
  ShootLocationFields,
  ShootWhenFields,
} from '../../components/ShootFormFields'
import { VisibilityNote } from '../../components/Visibility'
import { Toast } from '../../components/Toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../../components/ui/alert-dialog'
import { useStrings } from '../../i18n/LanguageProvider'
import {
  createShoot,
  getShoot,
  listShoots,
  updateShoot,
  type Shoot,
} from '../../features/shoots/api'
import { toIsoDate as isoOf } from '../../features/shoots/date'
import { overlappingShoots, pastLocations } from '../../features/shoots/home'
import {
  createClient,
  digitsOf,
  findClientByPhone,
  getClient,
  updateClient,
  type Client,
} from '../../features/clients/api'
import { toIsoDate, toTimeValue } from '../../features/shoots/date'
import { failed, selected as selectedTick, succeeded, tapped } from '../../lib/haptics'
import { toastOnNextScreen } from '../../lib/nextScreenToast'

/**
 * `US-002` — create a shoot, rebuilt against `client-match-flow.html`
 * (`ADR-017`), which is also where `US-029`'s client matching lives.
 *
 * The client is a row now (`ADR-018`), so this form's job is to end up holding
 * one: either an existing client picked from the search, or a name that becomes
 * a client when the shoot is saved. `createShoot` deliberately cannot create a
 * client itself — every path goes through here, which is the only way the
 * matching rule stays enforceable.
 *
 * The date, start and end start unset rather than defaulting, so `US-002` AC-2
 * and `US-030` AC-2's "required field left empty" stay states a user can
 * actually reach.
 *
 * **Location is collected here**, which `US-002`'s Out of scope excludes — it
 * moved to `US-018` after Ilona's prototype review, to keep creation minimal.
 * The mockup puts it back and the owner confirmed it (2026-08-29). Logged in
 * docs/redesign-log.md as a story that needs amending, not a rule quietly
 * broken.
 */
/**
 * `mode` is the only thing that differs, and it differs in four places: what
 * loads, whether the past is pickable, which API the save calls, and the two
 * words on the header and the CTA. Everything between them is one form.
 */
export type ShootFormMode = { mode: 'create' } | { mode: 'edit'; id: string }

export function ShootForm(props: ShootFormMode) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isEdit = props.mode === 'edit'
  const shootId = props.mode === 'edit' ? props.id : null

  /** Edit only: nothing to load when the shoot does not exist yet. */
  const [loading, setLoading] = useState(isEdit)
  const [failedToLoad, setFailedToLoad] = useState(false)

  const [client, setClient] = useState<Client | null>(null)
  const [typedName, setTypedName] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [telegram, setTelegram] = useState('')
  const [date, setDate] = useState<Date | null>(null)
  /*
    `New Shoot.dc.html`'s second pass (owner, 2026-09-03): a **range grid** of
    hourly slots, where variant 2b had a rail plus a derived duration. Both ends
    are collected now, and both start unset — so `US-030` AC-2's "required field
    left empty" stays a state a user can reach for the end as well as the start.
  */
  const [start, setStart] = useState<string | null>(null)
  const [end, setEnd] = useState<string | null>(null)
  /* «Локація», split into three by the second pass — `location_name` is new
     (migration 20260903120000). */
  const [locationName, setLocationName] = useState('')
  const [address, setAddress] = useState('')
  const [locationDetails, setLocationDetails] = useState('')
  const [notes, setNotes] = useState('')
  /** Every shoot, for the location chips and the overlap warning. */
  const [existing, setExisting] = useState<Shoot[]>([])

  /** `US-029` AC-4 — the client this number turns out to belong to. */
  const [phoneMatch, setPhoneMatch] = useState<Client | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoots = await listShoots()
        // A failure is not fatal: the chips and the clash warning are both
        // conveniences, and the form works without either.
        if (active && shoots) setExisting(shoots)
      })()
      return () => {
        active = false
      }
    }, [])
  )

  /*
    Edit only: load the shoot into the same fields the create mode starts empty.

    **Loaded once, not on every focus.** `useFocusEffect` would overwrite a
    half-typed form the moment the reader came back from the image library.

    The client is still fetched rather than reconstructed from the shoot's
    columns. The chip that needed its «N зйомок» is gone, but `submit` compares
    the typed name against `client.name` to decide whether the shoot keeps its
    client or moves to a new one, and that comparison needs the real row.
  */
  const loadedFor = useRef<string | null>(null)
  useFocusEffect(
    useCallback(() => {
      if (!shootId || loadedFor.current === shootId) return
      loadedFor.current = shootId
      let active = true
      void (async () => {
        const shoot = await getShoot(shootId)
        if (!active) return
        if (!shoot) {
          setFailedToLoad(true)
          setLoading(false)
          return
        }
        const owner = await getClient(shoot.clientId)
        if (!active) return

        setClient(owner)
        setTypedName(owner?.name ?? shoot.clientName)
        setPhone(shoot.clientContact ?? '')
        setInstagram(shoot.clientInstagram ?? '')
        setTelegram(shoot.clientTelegram ?? '')
        // A plain YYYY-MM-DD split by hand: `new Date(string)` parses a bare
        // date as UTC midnight and can land on the previous day west of
        // Greenwich.
        const [year, month, day] = shoot.date.split('-').map(Number)
        setDate(new Date(year, month - 1, day))
        // Taken as stored. A shoot saved at 09:30 keeps its half hour — the
        // grid cannot highlight it, but nothing here rewrites it either.
        setStart(shoot.startTime)
        setEnd(shoot.endTime)
        setLocationName(shoot.locationName ?? '')
        setAddress(shoot.locationAddress ?? '')
        setLocationDetails(shoot.locationNote ?? '')
        setNotes(shoot.notes ?? '')
        setLoading(false)
      })()
      return () => {
        active = false
      }
    }, [shootId])
  )

  const [errors, setErrors] = useState<{
    client?: boolean
    date?: boolean
    time?: boolean
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const link = (found: Client) => {
    setClient(found)
    // The name field IS the client now, so linking has to fill it — there is no
    // chip left to show who was matched.
    setTypedName(found.name)
    // AC-3 — picking a client fills their number in. The handles follow the
    // same rule: they are that person's, and retyping them would be busywork.
    if (found.phone) setPhone(found.phone)
    setInstagram(found.instagram ?? '')
    setTelegram(found.telegram ?? '')
    setErrors((current) => ({ ...current, client: false }))
  }

  /**
   * AC-4 — a number that already belongs to someone, under a different name.
   *
   * Only asked while nothing is linked, and only when the typed name differs
   * from the match: picking a client fills in their own number, and asking
   * whether their number is theirs would be absurd.
   */
  const checkPhone = async (value: string) => {
    if (client || digitsOf(value).length < 9) return
    const found = await findClientByPhone(value)
    if (found && found.name.trim().toLowerCase() !== typedName.trim().toLowerCase()) {
      setPhoneMatch(found)
    }
  }

  const submit = async () => {
    // AC-2 — save is blocked, the missing field is indicated, and nothing is
    // created. Validated before the request for exactly that reason.
    //
    // Not checked, deliberately: whether the end is before the start. US-030
    // AC-3 is unwritten (02-product/open-questions.md item 14) — and the range
    // grid can legitimately produce one, since a shoot ending at 24:00 is
    // stored as 00:00.
    const nextErrors = {
      client: !typedName.trim(),
      date: !date,
      // Both ends, now that the grid collects both. 2b derived the end from a
      // stepper that always held a value, which removed this refusal; the
      // second pass puts it back.
      time: !start || !end,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      // A refusal feels different from a success, which is the whole point of
      // the notification generators — the finger learns the outcome before the
      // eye finds the message.
      failed()
      setFormError(null)
      return
    }

    setSubmitting(true)

    // Either the client already exists, or the typed name becomes one. AC-5's
    // "answering no creates a second profile" falls out of this: declining the
    // phone match leaves `client` null, so the typed name is used.
    /*
      Either the shoot attaches to the client that was picked, or the typed name
      becomes one. When a client was picked, any edit to their handles is written
      back — they are that person's details, not this shoot's, so leaving the
      form's values behind would silently discard them.
    */
    if (client) {
      const changed =
        (client.phone ?? '') !== phone.trim() ||
        (client.instagram ?? '') !== instagram.trim() ||
        (client.telegram ?? '') !== telegram.trim()
      if (changed) await updateClient(client.id, { phone, instagram, telegram })
    }
    /*
      The linked client is kept only while the name still matches it. Editing
      the name **moves the shoot to another client** and never renames one — a
      name is shared by every shoot that client is on, and rewriting it here
      would silently rewrite their history. That was the edit screen's rule
      before the merge and it is unchanged; what is new is that creating a shoot
      now takes this path every time, because nothing links by name any more.
    */
    const keepsClient = !!client && client.name.trim() === typedName.trim()
    const target = keepsClient
      ? client
      : await createClient({ name: typedName, phone, instagram, telegram })
    if (!target) {
      setSubmitting(false)
      setFormError(t.shootCreateFailed)
      return
    }

    /*
      The one branch that touches the database differently. Everything above —
      the client, the times, the location — is collected identically either way;
      only the verb changes.

      `US-030` AC-5 stores both ends, and the grid collects both, so there is no
      derivation between the form and the columns on either path.
    */
    const fields = {
      clientId: target.id,
      date: toIsoDate(date as Date),
      startTime: start as string,
      endTime: end as string,
      locationName: locationName.trim() || null,
      locationAddress: address.trim() || null,
      locationNote: locationDetails.trim() || null,
      notes: notes.trim() || null,
    }

    if (shootId) {
      /*
        `updateShoot` takes fields this form no longer collects — the location
        attachment and the two file links — so they are read back from the row
        and written unchanged. Passing empty strings would erase a video someone
        attached before this form stopped offering one, and the links are edited
        on the «Матеріали» tab now.
      */
      const current = await getShoot(shootId)
      const ok = await updateShoot(shootId, {
        ...fields,
        locationAttachment: current?.locationAttachment ?? null,
        rawFilesUrl: current?.rawFilesUrl ?? null,
        finishedPhotosUrl: current?.finishedPhotosUrl ?? null,
      })
      setSubmitting(false)
      if (!ok) return setFormError(t.shootUpdateFailed)

      succeeded()
      // The toast is handed to the next screen: this one is popped on the line
      // below, and a toast rendered by a screen goes with it.
      toastOnNextScreen(t.changesSaved)
      router.back()
      return
    }

    const result = await createShoot(fields)
    setSubmitting(false)

    if (!result.ok) {
      setFormError(t.shootCreateFailed)
      return
    }

    succeeded()
    // AC-1 — the new shoot appears in the shoot list. `back` returns to
    // whatever pushed this, and every list refetches on focus.
    router.back()
  }

  const valid = typedName.trim().length > 1 && !!date && !!start && !!end
  const clashes =
    date && start && end ? overlappingShoots(existing, isoOf(date), start, end) : []
  const chips = pastLocations(existing)

  if (failedToLoad) {
    return (
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        The screen's own header: «Скасувати» · «Нова зйомка» · «Зберегти», the
        save dimmed until the form would actually save. The same arrangement as
        the edit screen, and drawn for the same reason — a native `headerRight`
        cannot restyle itself per keystroke.
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
          <Text className="text-body text-muted-foreground" numberOfLines={1}>
            {t.cancel}
          </Text>
        </Pressable>
        <Text className="text-title-sm text-foreground flex-1 text-center font-semibold">
          {isEdit ? t.editTitle : t.newShootTitle}
        </Text>
        <Pressable
          className="w-24 active:opacity-60"
          hitSlop={10}
          disabled={submitting}
          onPress={() => {
            tapped()
            void submit()
          }}
          role="button"
        >
          <Text
            className={`text-body text-right font-semibold ${
              valid ? 'text-foreground' : 'text-muted-foreground/50'
            }`}
            numberOfLines={1}
          >
            {t.save}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="bg-background"
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-5 p-4">
          {/* ── Клієнт ── */}
          <View className="gap-3.5">
            <SectionLabel label={t.clientField} />

            {/*
              **A plain input** (owner, 2026-09-03). It was `ClientField` —
              `US-029`'s search over existing clients, with the suggestion list
              and the row that fills the form.

              What that costs is on `target` in `submit`: with no search, a name
              typed twice is two client rows. `ADR-018` made the client a row so
              that a client has an identity across shoots, and the only thing
              still joining them is the phone match below.
            */}
            <View className="gap-2">
              <Input
                id="client-name"
                value={typedName}
                onChangeText={(name) => {
                  setTypedName(name)
                  setErrors((current) => ({ ...current, client: false }))
                }}
                autoCapitalize="words"
                autoComplete="off"
                placeholder={t.clientNameSearchPlaceholder}
                className={errors.client ? 'border-destructive/60' : undefined}
              />
              <FieldError show={!!errors.client} message={t.clientRequiredShort} />
            </View>

            <View className="gap-2">
              <OptionalLabel label={t.phoneField} />
              <Input
                id="phone"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value)
                  void checkPhone(value)
                }}
                autoCapitalize="none"
                keyboardType="phone-pad"
                placeholder={t.phonePlaceholder}
              />
            </View>

            {/*
              The client's handles (owner, 2026-08-31). `clients.instagram` has
              existed since `ADR-018` and **no screen ever collected it**;
              `telegram` is new (migration 20260831160000).

              **Editing these updates the CLIENT, so it propagates to every shoot
              that person is on** — which is the point of them having an identity
              across shoots, and why a handle is safe to edit from here where the
              NAME is not. See `updateClient`.
            */}
            <View className="gap-2">
              <OptionalLabel label={t.instagramLabel} />
              <Input
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t.crewInstagramPlaceholder}
              />
            </View>

            <View className="gap-2">
              <OptionalLabel label={t.telegramLabel} />
              <Input
                value={telegram}
                onChangeText={setTelegram}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t.telegramPlaceholder}
              />
            </View>
          </View>

          {/* ── Дата й час ── Shared with the edit screen (owner, 2026-08-30). */}
          <ShootWhenFields
            /*
              The past is pickable only when editing. A shoot that has already
              happened is still editable, and with the past locked its own date
              would render dimmed and untappable — the field would look broken
              on exactly the records most likely to need a correction.
            */
            allowPastDates={isEdit}
            date={date}
            onDateChange={(picked) => {
              setDate(picked)
              setErrors((current) => ({ ...current, date: false }))
            }}
            dateInvalid={!!errors.date}
            start={start}
            end={end}
            onRangeChange={(nextStart, nextEnd) => {
              setStart(nextStart)
              setEnd(nextEnd)
              setErrors((current) => ({ ...current, time: false }))
            }}
            timeInvalid={!!errors.time}
            clashes={clashes}
          />

          {/* ── Локація ── «Назва» · «Адреса» · «Деталі», shared with edit. */}
          <ShootLocationFields
            name={locationName}
            onNameChange={setLocationName}
            address={address}
            onAddressChange={setAddress}
            details={locationDetails}
            onDetailsChange={setLocationDetails}
            chips={chips}
          />

          {/* ── Нотатки ── */}
          <View className="gap-2">
            <SectionLabel label={t.notesSection} />
            <Textarea
              value={notes}
              onChangeText={setNotes}
              placeholder={t.shootNotesPlaceholder}
              numberOfLines={4}
              className="min-h-[88px]"
            />
            {/*
              «Клієнт не бачить», in the same box the crew form gives its own
              note (owner, 2026-09-03) rather than the outline `Badge` that used
              to sit beside the heading — a tag shape for a sentence's job.

              **True by construction, not by the label**: the link gateway builds
              both payloads from explicit column lists, and `shoots.notes` is
              selected for `crewPayload` and never for `clientPayload`
              (`ADR-013`, CLAUDE.md rule 2).

              The wording is unchanged. The crew form's box says who DOES see
              the note as well as who does not; saying that here would need a
              sentence nobody has written, and the shoot's note has a different
              audience — crew receive it, where a crew member's own note reaches
              nobody.
            */}
            <VisibilityNote label={t.clientCannotSee} />
          </View>

          {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}
        </View>
      </ScrollView>

      {/* The sticky CTA, in the design's two states. */}
      <View
        className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          variant={valid ? 'cta' : 'secondary'}
          size="cta"
          disabled={submitting}
          onPress={() => void submit()}
        >
          <Text className={valid ? undefined : 'text-muted-foreground'}>
            {valid ? (isEdit ? t.saveChanges : t.createShootCta) : t.fillClientAndTime}
          </Text>
        </Button>
      </View>

      {/* `US-029` AC-4/AC-5 — the phone matched an existing client. Unchanged. */}
      <AlertDialog open={!!phoneMatch} onOpenChange={(open) => !open && setPhoneMatch(null)}>
        <AlertDialogContent>
          <AlertDialogDescription>
            {t.phoneBelongsToTemplate.replace('{name}', phoneMatch?.name ?? '')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setPhoneMatch(null)}>
              <Text>{t.noNewClient}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                if (phoneMatch) link(phoneMatch)
                setPhoneMatch(null)
              }}
            >
              <Text>{t.yesSamePerson}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/** A field label carrying the design's «— необовʼязково» in a lighter tone. */
function OptionalLabel({ label }: { label: string }) {
  const t = useStrings()
  return (
    <Text className="text-body-sm text-foreground font-medium">
      {label}
      <Text className="text-label text-muted-foreground font-normal">{` ${t.optionalSuffix}`}</Text>
    </Text>
  )
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return <Text className="text-body-sm text-destructive">{message}</Text>
}
