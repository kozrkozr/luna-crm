import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/ui/button'
import { FormScrollView } from '../../components/ui/form-scroll-view'
import { Input } from '../../components/ui/input'
import { Text } from '../../components/ui/text'
import { Textarea } from '../../components/ui/textarea'
import {
  AddSectionPills,
  OptionalSectionHeader,
  SectionLabel,
  ShootLocationFields,
  ShootWhenFields,
} from '../../components/ShootFormFields'
import { Toast } from '../../components/Toast'
import { useDiscardGuard } from '../../components/DiscardGuard'
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
import { RoleChip } from '../../components/RoleChip'
import {
  PREPAYMENT_STEPS,
  CURRENCY,
  formatAmount,
  parseAmount,
  payment,
  prepaymentChip,
} from './money'
import { Starfield } from '../../components/Starfield'
import type { ImagePickerAsset } from 'expo-image-picker'
import { ReferencesEditor } from '../../components/ReferencesEditor'
import {
  addImageReference,
  addLinkReference,
  imageAssetProblem,
  isValidReferenceLink,
  type AddReferenceResult,
  type Reference,
} from '../references/api'

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

/**
 * The three sections the form can do without, in the order the artboards' own
 * `defs` array lists them.
 *
 * That order is the order the dashed pills appear in — **not** the order they
 * were removed in, so the row does not reshuffle itself as sections come and
 * go. The labels are string KEYS rather than words: this array is module-level
 * and `useStrings` is not available here.
 */
const SECTIONS = [
  { key: 'pay', label: 'paymentSection', remove: 'removePaymentLabel' },
  { key: 'notes', label: 'teamNotesSection', remove: 'removeTeamNotesLabel' },
  { key: 'clientNotes', label: 'clientNotesSection', remove: 'removeClientNotesLabel' },
  /* `US-043` — the fourth, and the only one the edit form never offers (AC-8). */
  { key: 'refs', label: 'references', remove: 'removeReferencesLabel' },
] as const

/**
 * `US-043` — a reference added on the new-shoot form, held until the shoot
 * exists. `reference` is what the grid draws: an image's `urlOrPath` is the
 * picked file's own URI until it is uploaded. `asset` is what gets uploaded,
 * null for a link.
 */
type DraftReference = { reference: Reference; asset: ImagePickerAsset | null }

/** The grid's picture for a draft image: the local file, not a signed URL. */
const localImage = async (reference: Reference) => reference.urlOrPath

type SectionKey = (typeof SECTIONS)[number]['key']

/**
 * Whether each optional section is showing — the one rule that covers both
 * screens.
 *
 * The two artboards reach this by different routes. `New Shoot.dc.html` holds
 * three explicit booleans and starts them all false; `Shoot Detail v3.dc.html`'s
 * edit form derives them from whether the field is filled and ORs in an
 * `optAdded` override, so a shoot that already has a price opens with «Оплата»
 * showing. **The second rule subsumes the first**: on a blank create form
 * nothing is filled, so `filled || added` starts every section closed by
 * itself.
 *
 * It stays correct only because the × CLEARS the section as well as hiding it
 * (`clearSection`). Were a value left behind, `filled` would immediately reopen
 * the section the reader just closed — and a hide that did not clear would also
 * mean a form saving a field it does not show, which is the worse half.
 */
/**
 * Every value the form collects, as one comparable string.
 *
 * Used only to answer "has anything changed since this loaded" for
 * «Скасувати» — `submit` reads the fields themselves, so nothing depends on the
 * shape or the order here beyond both sides using this same function.
 *
 * The date is reduced to its ISO day: `Date` objects are never equal by value,
 * and only the day is ever stored.
 */
function fingerprint(values: {
  typedName: string
  phone: string
  instagram: string
  telegram: string
  date: Date | null
  start: string | null
  end: string | null
  locationName: string
  address: string
  locationDetails: string
  notes: string
  clientNotes: string
  price: string
  prepayment: string
  /** `US-043` AC-3 — the drafts' ids, so adding or removing one is a change. */
  references: string
}): string {
  return [
    values.typedName.trim(),
    values.phone.trim(),
    values.instagram.trim(),
    values.telegram.trim(),
    values.date ? isoOf(values.date) : '',
    values.start ?? '',
    values.end ?? '',
    values.locationName.trim(),
    values.address.trim(),
    values.locationDetails.trim(),
    values.notes.trim(),
    values.clientNotes.trim(),
    values.price.trim(),
    values.prepayment.trim(),
    values.references,
  ].join('\u0000')
}

/**
 * What `fingerprint` returns for a form nobody has touched.
 *
 * The snapshot started as `''`, and an empty form fingerprints to a row of
 * separators rather than to nothing — so a brand-new shoot counted as dirty
 * before a key was pressed, and «Скасувати» always asked (owner reported it,
 * 2026-09-06).
 *
 * Built by the same function rather than written out, so the two cannot
 * disagree about what empty looks like when a field is added to one of them.
 */
const EMPTY_FINGERPRINT = fingerprint({
  typedName: '',
  phone: '',
  instagram: '',
  telegram: '',
  date: null,
  start: null,
  end: null,
  locationName: '',
  address: '',
  locationDetails: '',
  notes: '',
  clientNotes: '',
  price: '',
  prepayment: '',
  references: '',
})

function openSections(
  filled: Record<SectionKey, boolean>,
  added: Record<SectionKey, boolean>
): Record<SectionKey, boolean> {
  return {
    pay: filled.pay || added.pay,
    notes: filled.notes || added.notes,
    clientNotes: filled.clientNotes || added.clientNotes,
    refs: filled.refs || added.refs,
  }
}

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
  /** `20260905160000` — the note the client reads. See `SECTIONS`. */
  const [clientNotes, setClientNotes] = useState('')
  /*
    «Оплата» as TEXT, not numbers. The fields group as they are typed —
    «12 000» — so the string is what the user sees and `parseAmount` is the only
    thing that reads it. Keeping a number here instead would mean formatting on
    every render and losing the caret.
  */
  const [price, setPrice] = useState('')
  const [prepayment, setPrepayment] = useState('')
  /** `US-043` — references added here, saved after the shoot is created. */
  const [drafts, setDrafts] = useState<DraftReference[]>([])
  const draftSeq = useRef(0)
  /** `US-043` AC-6 — the shoot exists and its references are uploading. */
  const [savingReferences, setSavingReferences] = useState(false)
  /** Every shoot, for the location chips and the overlap warning. */
  const [existing, setExisting] = useState<Shoot[]>([])

  /**
   * Which optional sections the reader has opened by hand this session.
   *
   * Only half of the answer — `open` below ORs this with whether the section
   * holds anything. See `openSections`.
   */
  const [added, setAdded] = useState<Record<SectionKey, boolean>>({
    pay: false,
    notes: false,
    clientNotes: false,
    refs: false,
  })
  /** The section a × is asking about, or null. See `removeSection`. */
  const [removing, setRemoving] = useState<SectionKey | null>(null)

  /**
   * What the form held when it was last in agreement with the database — every
   * field, joined into one string.
   *
   * Empty on a new shoot, so anything typed makes it dirty; replaced with the
   * loaded shoot when editing, so «Скасувати» only asks about real edits. A
   * string rather than an object because the comparison is the only thing ever
   * done with it, and a dozen `useState`s have no natural object to snapshot.
   *
   * `EMPTY_FINGERPRINT`, not `''` — see the constant.
   */
  const [snapshot, setSnapshot] = useState(EMPTY_FINGERPRINT)

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
        setClientNotes(shoot.clientNotes ?? '')
        // Null renders as an EMPTY field, not «0» — the form must not look like
        // somebody priced this shoot at nothing when nobody priced it at all.
        setPrice(shoot.price === null ? '' : formatAmount(shoot.price))
        setPrepayment(shoot.prepayment === null ? '' : formatAmount(shoot.prepayment))
        /*
          The baseline «Скасувати» compares against. Built from the same values
          just set, not read back out of state — these setters have not applied
          yet at this point in the effect.
        */
        setSnapshot(
          fingerprint({
            typedName: owner?.name ?? shoot.clientName,
            phone: shoot.clientContact ?? '',
            instagram: shoot.clientInstagram ?? '',
            telegram: shoot.clientTelegram ?? '',
            date: new Date(year, month - 1, day),
            start: shoot.startTime,
            end: shoot.endTime,
            locationName: shoot.locationName ?? '',
            address: shoot.locationAddress ?? '',
            locationDetails: shoot.locationNote ?? '',
            notes: shoot.notes ?? '',
            clientNotes: shoot.clientNotes ?? '',
            price: shoot.price === null ? '' : formatAmount(shoot.price),
            prepayment: shoot.prepayment === null ? '' : formatAmount(shoot.prepayment),
            references: '',
          })
        )
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
      clientNotes: clientNotes.trim() || null,
      price: priceValue,
      prepayment: prepaymentValue,
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

    if (!result.ok) {
      setSubmitting(false)
      setFormError(t.shootCreateFailed)
      return
    }

    /*
      `US-043` AC-6 — the references, now that there is a shoot to hang them on.
      One at a time and in the order they were added, for the reasons the
      «Матеріали» gallery gives (`ReferencesEditor`): the list is ordered by
      `created_at`, and a dozen parallel uploads on a phone is how one fails.

      AC-7 — a failure is ignored (owner, 2026-10-06). The shoot opens with
      whatever was saved; the rest can be added on «Матеріали».
    */
    if (drafts.length > 0) {
      setSavingReferences(true)
      for (const { reference, asset } of drafts) {
        if (asset) await addImageReference(result.id, asset, reference.category)
        else await addLinkReference(result.id, reference.urlOrPath, reference.category)
      }
    }
    setSubmitting(false)

    succeeded()
    /*
      Straight onto the shoot that was just made (owner, 2026-09-05).

      This was `router.back()`, which returned the reader to whichever list
      pushed the form — usually the calendar, since that is where «+» lives.
      `US-002` AC-1 asks that "the new shoot appears in the shoot list", and
      that reading is unharmed: the shoot is in every list, and the reader is
      one tap from seeing it. What the old behaviour actually did was hand back
      a list to scan for the thing just created. The story wants amending;
      logged in docs/redesign-log.md.

      **`replace`, never `push`.** The form must not stay on the stack: `push`
      would leave «Назад» from the new shoot landing on a filled-in create form
      for a shoot that already exists, and saving it again would make a second
      one. Replacing swaps the form for the shoot, so «Назад» reaches the list
      that opened the form — which is where `back` used to go, and still is.
    */
    router.replace(`/(app)/shoot/${result.id}`)
  }

  /*
    The money, derived once per render. `pay.invalid` is the artboard's `over`:
    a prepayment above a price it actually has. It blocks the save, which is why
    it joins `valid` rather than only colouring a border.
  */
  const priceValue = parseAmount(price)
  const prepaymentValue = parseAmount(prepayment)
  const pay = payment({ price: priceValue, prepayment: prepaymentValue })
  const valid =
    typedName.trim().length > 1 && !!date && !!start && !!end && !pay.invalid
  const clashes =
    date && start && end ? overlappingShoots(existing, isoOf(date), start, end) : []
  const chips = pastLocations(existing)

  /*
    «Скасувати» asks before discarding (owner, 2026-09-06). It left on the first
    tap, so a half-filled shoot went with it silently — on the edit screen that
    is somebody's corrections, and on the create screen it is everything they
    have typed.

    Both modes are guarded, though only the edit one was named: the create form
    is where the most can be lost, and `snapshot` starts empty so an untouched
    form still leaves at once.
  */
  const current = fingerprint({
    typedName,
    phone,
    instagram,
    telegram,
    date,
    start,
    end,
    locationName,
    address,
    locationDetails,
    notes,
    clientNotes,
    price,
    prepayment,
    references: drafts.map((draft) => draft.reference.id).join(','),
  })
  const { ask: askLeave, dialog: discardDialog } = useDiscardGuard({
    dirty: current !== snapshot,
    onLeave: () => router.back(),
  })

  /*
    ── The three optional sections (owner, 2026-09-05) ────────────────────────

    Derived per render rather than held in state, so there is no second copy of
    "is this section showing" to fall out of step with the fields themselves.
  */
  const filled: Record<SectionKey, boolean> = {
    pay: price.trim() !== '' || prepayment.trim() !== '',
    notes: notes.trim() !== '',
    clientNotes: clientNotes.trim() !== '',
    refs: drafts.length > 0,
  }
  const open = openSections(filled, added)
  // `US-043` AC-8 — the edit form keeps references on «Матеріали» alone.
  const offered = SECTIONS.filter((section) => !isEdit || section.key !== 'refs')
  const closed = offered.filter((section) => !open[section.key])

  /** Empty the section and close it. Both halves, always — see `openSections`. */
  const clearSection = (key: SectionKey) => {
    if (key === 'pay') {
      setPrice('')
      setPrepayment('')
    } else if (key === 'notes') {
      setNotes('')
    } else if (key === 'refs') {
      setDrafts([])
    } else {
      setClientNotes('')
    }
    setAdded((current) => ({ ...current, [key]: false }))
  }

  /**
   * `US-043` — hold a reference on the form. Checked the way «Матеріали» checks
   * one (`US-003` AC-2), so a rejection reads the same, but nothing is written:
   * the result is the draft, and `submit` saves it once the shoot exists.
   */
  const hold = (reference: Omit<Reference, 'id'>, asset: ImagePickerAsset | null) => {
    draftSeq.current += 1
    const draft = { reference: { ...reference, id: `draft-${draftSeq.current}` }, asset }
    setDrafts((current) => [...current, draft])
    return { ok: true as const, reference: draft.reference }
  }
  const holdImage = (asset: ImagePickerAsset, category: string | null): AddReferenceResult => {
    const problem = imageAssetProblem(asset)
    if (problem) return { ok: false, reason: problem }
    return hold({ kind: 'image', urlOrPath: asset.uri, category }, asset)
  }
  const holdLink = (link: string, category: string | null): AddReferenceResult => {
    if (!isValidReferenceLink(link)) return { ok: false, reason: 'invalidLink' }
    return hold({ kind: 'link', urlOrPath: link.trim(), category }, null)
  }

  /**
   * The ×.
   *
   * An empty section goes at once — there is nothing to lose and a dialog for
   * it would be noise. A section holding something asks first (owner,
   * 2026-09-05), which is **the one departure from the artboards on this pass**:
   * both of them clear without asking. It matters most when editing, where the
   * thing being cleared is a price or a note that was already saved.
   */
  const removeSection = (key: SectionKey) => {
    if (filled[key]) return setRemoving(key)
    clearSection(key)
  }

  if (failedToLoad) {
    return (
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
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
            askLeave()
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

      <FormScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 108 }}
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

          {/*
            ── Оплата ── between the location and the notes, as both artboards
            place it. Two fields side by side and the percentage chips.

            **Optional since 2026-09-05** — closed on a new shoot, open on one
            that already has a figure, added back from the pills at the foot of
            the form. See `openSections`.

            **No «Залишок після зйомки» row** (owner, 2026-09-05). The artboard
            draws one under the chips whenever a price is set; it is removed
            because the same number is already on the shoot's own screen, where
            it is the point of the card rather than a footnote to a form. The
            arithmetic is still live — `pay.invalid` is what blocks the save.

            Nothing about the validation changed with the section: a closed
            «Оплата» has two empty fields, `parseAmount` reads them as null, and
            `pay.invalid` is false. A form cannot be blocked by a section it is
            not showing.
          */}
          {open.pay ? (
            <View className="gap-3.5">
              <OptionalSectionHeader
                label={t.paymentSection}
                removeLabel={t.removePaymentLabel}
                onRemove={() => removeSection('pay')}
              />

              <View className="flex-row gap-2.5">
                <AmountField
                  label={t.priceLabel}
                  value={price}
                  onChangeText={(text) => {
                    const next = parseAmount(text)
                    setPrice(next === null ? '' : formatAmount(next))
                    /*
                      Typing the price DOWN drags the prepayment with it, which is
                      the artboard's own `onPrice`. Without it the form would sit
                      in the error state the moment somebody corrected a price
                      downwards, blaming the field they did not touch.
                    */
                    if (next !== null && prepaymentValue !== null && prepaymentValue > next) {
                      setPrepayment(formatAmount(next))
                    }
                  }}
                />
                <AmountField
                  label={t.prepaymentLabel}
                  value={prepayment}
                  invalid={pay.invalid}
                  onChangeText={(text) => {
                    const next = parseAmount(text)
                    setPrepayment(next === null ? '' : formatAmount(next))
                  }}
                />
              </View>

              <View className="-mt-1 flex-row flex-wrap gap-1.5">
                {PREPAYMENT_STEPS.map((step) => {
                  const chip = prepaymentChip(step, priceValue, prepaymentValue)
                  return (
                    <RoleChip
                      key={step}
                      label={step === 0 ? t.prepaymentNone : `${step}${t.percentSuffix}`}
                      active={chip.active}
                      onPress={() =>
                        setPrepayment(chip.value === null ? '' : formatAmount(chip.value))
                      }
                    />
                  )
                })}
              </View>

              {pay.invalid ? (
                <Text role="alert" className="text-caption text-destructive -mt-1 px-0.5">
                  {t.prepaymentOverPrice}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/*
            ── Нотатки для команди ──

            Renamed from «Нотатки» on 2026-09-05, when the form grew a second
            note. The name is the whole point of the rename: two textareas a
            line apart, one of which the client reads and one of which they must
            not, cannot both be called «Нотатки».

            **No «Клієнт не бачить» marker at all**, since 2026-09-06 (owner).
            It was a `VisibilityNote` box from 2026-09-03, then a badge beside
            the heading when the new artboard drew one, and now neither. The
            section is called «Нотатки для команди» and sits a field above
            «Нотатки для клієнта»; between the two names, a third element saying
            which audience this one has was restating the heading.

            **The guarantee never lived in the label anyway**: the link gateway
            builds each payload from an explicit column list, and `shoots.notes`
            is selected for `crewPayload` and never for `clientPayload`
            (`ADR-013`, CLAUDE.md rule 2). Removing the badge removes a claim
            about that rule, not the rule.
          */}
          {open.notes ? (
            <View className="gap-2">
              <OptionalSectionHeader
                label={t.teamNotesSection}
                removeLabel={t.removeTeamNotesLabel}
                onRemove={() => removeSection('notes')}
              />
              <Textarea
                value={notes}
                onChangeText={setNotes}
                placeholder={t.shootNotesPlaceholder}
                numberOfLines={4}
                className="min-h-[88px]"
              />
            </View>
          ) : null}

          {/*
            ── Нотатки для клієнта ──

            New on 2026-09-05, and the first field on this form written to be
            read by somebody outside the app: it is selected for the gateway's
            `clientPayload` and for no other query (migration `20260905160000`).

            **No badge.** The crew note earns «Клієнт не бачить» because its
            audience is surprising — a note on a shoot sounds like something
            everyone on the shoot can see. This one's audience is in its name,
            and a «Клієнт бачить» badge would be a label restating its own
            heading.
          */}
          {open.clientNotes ? (
            <View className="gap-2">
              <OptionalSectionHeader
                label={t.clientNotesSection}
                removeLabel={t.removeClientNotesLabel}
                onRemove={() => removeSection('clientNotes')}
              />
              <Textarea
                value={clientNotes}
                onChangeText={setClientNotes}
                placeholder={t.clientNotesPlaceholder}
                numberOfLines={4}
                className="min-h-[88px]"
              />
            </View>
          ) : null}

          {/*
            ── Референси ── `US-043`: the «Матеріали» tab's block, one to one —
            the same component — holding what is added until «Створити зйомку».
            Last on the form, and never on the edit form (AC-8).
          */}
          {open.refs && !isEdit ? (
            <View className="gap-2.5">
              <OptionalSectionHeader
                label={t.references}
                removeLabel={t.removeReferencesLabel}
                onRemove={() => removeSection('refs')}
              />
              <ReferencesEditor
                references={drafts.map((draft) => draft.reference)}
                addImage={async (asset, category) => holdImage(asset, category)}
                addLink={async (link, category) => holdLink(link, category)}
                onAdded={() => {}}
                // AC-4 — nothing is saved yet, so it goes at once and cannot fail.
                remove={async (reference) => {
                  setDrafts((current) => current.filter((d) => d.reference.id !== reference.id))
                  return true
                }}
                onRemoved={() => {}}
                confirmRemove={false}
                resolveImage={localImage}
              />
            </View>
          ) : null}

          {/* Whatever is closed, offered back. Renders nothing when all four
              are open. */}
          <AddSectionPills
            sections={closed.map((section) => ({
              key: section.key,
              label: t[section.label],
              add: () => setAdded((current) => ({ ...current, [section.key]: true })),
            }))}
          />

          {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}
        </View>
      </FormScrollView>

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
            {savingReferences
              ? t.savingReferences
              : valid
                ? isEdit
                  ? t.saveChanges
                  : t.createShootCta
                : t.fillClientAndTime}
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

      {/*
        The × asking before it clears a section that holds something (owner,
        2026-09-05). The artboards clear outright; this is the departure, and it
        exists because on the edit screen the thing being cleared is a price or
        a note that has already been saved.

        Its copy is **not** from any artboard — see `confirmRemoveSection` in
        uk.ts and the entry in docs/redesign-log.md. It names the section it is
        about, because three ×s on one screen would otherwise raise the same
        anonymous question.
      */}
      <AlertDialog open={!!removing} onOpenChange={(shown) => !shown && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogDescription>
            {t.confirmRemoveSection.replace(
              '{section}',
              removing ? t[SECTIONS.find((section) => section.key === removing)!.label] : ''
            )}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setRemoving(null)}>
              <Text>{t.cancel}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                if (removing) clearSection(removing)
                setRemoving(null)
              }}
            >
              <Text>{t.removeAction}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {discardDialog}

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/** A field label carrying the design's «— необовʼязково» in a lighter tone. */
/**
 * One money field: a label, a numeric input, and a ₴ pinned inside its right edge.
 *
 * `New Shoot.dc.html` draws the symbol as an absolutely positioned child with
 * `pointer-events:none` over an input padded 30px on the right. Same here — it
 * has to sit INSIDE the field rather than beside it, or the two fields stop
 * being equal halves of the row.
 *
 * `keyboardType="number-pad"` rather than `inputMode="numeric"`: the artboard
 * writes the web attribute, and this is its iOS equivalent — digits only, no
 * decimal key, which matches a column that holds whole hryvnia.
 */
function AmountField({
  label,
  value,
  onChangeText,
  invalid = false,
}: {
  label: string
  value: string
  onChangeText: (text: string) => void
  invalid?: boolean
}) {
  const t = useStrings()
  return (
    <View className="min-w-0 flex-1 gap-[7px]">
      <Text className="text-body-sm text-foreground font-medium">{label}</Text>
      <View className="justify-center">
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={t.amountPlaceholder}
          keyboardType="number-pad"
          className={`pr-[30px] ${invalid ? 'border-destructive' : ''}`}
        />
        <Text className="text-body text-muted-foreground absolute right-3" pointerEvents="none">
          {CURRENCY}
        </Text>
      </View>
    </View>
  )
}

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
