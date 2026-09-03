import { useCallback, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badge } from '../../src/components/ui/badge'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Text } from '../../src/components/ui/text'
import { Textarea } from '../../src/components/ui/textarea'
import {
  SectionLabel,
  ShootLocationFields,
  ShootWhenFields,
} from '../../src/components/ShootFormFields'
import { ClientField } from '../../src/components/ClientField'
import { Toast } from '../../src/components/Toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
} from '../../src/components/ui/alert-dialog'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { createShoot, listShoots, type Shoot } from '../../src/features/shoots/api'
import { toIsoDate as isoOf } from '../../src/features/shoots/date'
import { overlappingShoots, pastLocations } from '../../src/features/shoots/home'
import {
  createClient,
  digitsOf,
  findClientByPhone,
  updateClient,
  type Client,
} from '../../src/features/clients/api'
import { toIsoDate, toTimeValue } from '../../src/features/shoots/date'
import { failed, selected as selectedTick, succeeded, tapped } from '../../src/lib/haptics'

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
export default function NewShootScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

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

  const [errors, setErrors] = useState<{
    client?: boolean
    date?: boolean
    time?: boolean
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const link = (found: Client) => {
    setClient(found)
    setTypedName('')
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
      client: !client && !typedName.trim(),
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
    const target =
      client ?? (await createClient({ name: typedName, phone, instagram, telegram }))
    if (!target) {
      setSubmitting(false)
      setFormError(t.shootCreateFailed)
      return
    }

    const result = await createShoot({
      clientId: target.id,
      date: toIsoDate(date as Date),
      // `US-030` AC-5 stores both ends, and the grid now collects both — no
      // derivation between the form and the column.
      startTime: start as string,
      endTime: end as string,
      locationName: locationName.trim() || null,
      locationAddress: address.trim() || null,
      locationNote: locationDetails.trim() || null,
      notes: notes.trim() || null,
    })
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

  const valid = !!(client || typedName.trim().length > 1) && !!date && !!start && !!end
  const clashes =
    date && start && end ? overlappingShoots(existing, isoOf(date), start, end) : []
  const chips = pastLocations(existing)

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
          {t.newShootTitle}
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

            <View className="gap-2">
              {/* `ClientField` already draws the design's suggestion list —
                  avatar, name, «клієнт · N зйомок», and a row that fills the
                  form. `US-029` built it; nothing here re-implements it. */}
              <ClientField
                value={client}
                invalid={!!errors.client}
                onLink={link}
                onUnlink={() => {
                  setClient(null)
                  setPhone('')
                }}
                typedName={typedName}
                onTypedNameChange={(name) => {
                  setTypedName(name)
                  setErrors((current) => ({ ...current, client: false }))
                }}
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
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <SectionLabel label={t.notesSection} />
              </View>
              {/*
                «Клієнт не бачить», and it is true by construction rather than by
                this label: the link gateway builds both payloads from explicit
                column lists and **neither selects `shoots.notes`**. See the
                migration. Today not even crew receive it.
              */}
              <Badge variant="outline" label={t.clientCannotSee} />
            </View>
            <Textarea
              value={notes}
              onChangeText={setNotes}
              placeholder={t.shootNotesPlaceholder}
              numberOfLines={4}
              className="min-h-24"
            />
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
            {valid ? t.createShootCta : t.fillClientAndTime}
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
