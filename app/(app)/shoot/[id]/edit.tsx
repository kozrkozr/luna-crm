import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '../../../../src/components/ui/button'
import { Input } from '../../../../src/components/ui/input'
import { Label } from '../../../../src/components/ui/label'
import { Text } from '../../../../src/components/ui/text'
import { Textarea } from '../../../../src/components/ui/textarea'
import { DateField } from '../../../../src/components/DateField'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { getShoot, updateShoot } from '../../../../src/features/shoots/api'
import { isValidReferenceLink } from '../../../../src/features/references/api'
import { toIsoDate } from '../../../../src/features/shoots/date'
import {
  attachmentKind,
  uploadLocationAttachment,
} from '../../../../src/features/shoots/locationMedia'

type Loaded = {
  date: Date | null
  address: string
  note: string
  attachment: string | null
  rawFilesUrl: string
  finishedPhotosUrl: string
}

/**
 * US-018 — edit a shoot's date and location.
 *
 * Fields follow the prototype's screenEditShoot: date, then a Локація section
 * with address, notes, and the two attach buttons.
 *
 * The Файли section below belongs to US-024 and US-025, not to this story. It is here
 * because the prototype and ux-notes.md both place it on this screen, and
 * because US-024 AC-2 — "the creator has pasted an external link" — is
 * unreachable without somewhere to paste it. docs/open-questions.md #6 records
 * that design covers this and no story's criteria do.
 *
 * Client name and contact are absent for the same reason — the story says
 * editing them "is a new ask, not assumed here".
 */
export default function EditShootScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const [dateError, setDateError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoot = await getShoot(id)
        if (!active) return
        if (!shoot) return setFailedToLoad(true)
        setLoaded({
          // The stored date is a plain YYYY-MM-DD. Split rather than
          // `new Date(string)`, which parses a bare date as UTC midnight and
          // can land on the previous day west of Greenwich.
          date: fromIsoDate(shoot.date),
          address: shoot.locationAddress ?? '',
          note: shoot.locationNote ?? '',
          attachment: shoot.locationAttachment,
          rawFilesUrl: shoot.rawFilesUrl ?? '',
          finishedPhotosUrl: shoot.finishedPhotosUrl ?? '',
        })
      })()
      return () => {
        active = false
      }
    }, [id])
  )

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
    setLoaded((current) => (current ? { ...current, attachment: path } : current))
  }

  const submit = async () => {
    if (!loaded) return

    // AC-3 — a shoot always needs a date, the same rule as creation. Checked
    // before the request, so a cleared date never reaches the row.
    if (!loaded.date) {
      setDateError(true)
      setFormError(null)
      return
    }
    setDateError(false)

    // US-024 AC-3 — a malformed link is refused with a message and nothing is
    // saved, exactly as US-003 AC-2 refuses a reference. Empty is not
    // malformed: clearing the field is how a link is removed.
    // US-024 AC-3 and US-025 AC-3 — the same rule for both fields, checked
    // together so neither can be saved while the other is malformed.
    const links = [loaded.rawFilesUrl, loaded.finishedPhotosUrl]
    if (links.some((link) => link.trim() && !isValidReferenceLink(link))) {
      setFormError(t.referenceLinkInvalid)
      return
    }

    setBusy(true)
    const ok = await updateShoot(id, {
      date: toIsoDate(loaded.date),
      locationAddress: loaded.address,
      locationNote: loaded.note,
      locationAttachment: loaded.attachment,
      rawFilesUrl: loaded.rawFilesUrl,
      finishedPhotosUrl: loaded.finishedPhotosUrl,
    })
    setBusy(false)

    if (!ok) return setFormError(t.shootUpdateFailed)

    // AC-1 — the shoot reflects the change where it is shown. `back` returns to
    // the detail screen, which refetches on focus.
    router.back()
  }

  if (failedToLoad) {
    return (
      <View className="bg-background flex-1 p-4">
        <Text className="text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  if (!loaded) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  const set = <K extends keyof Loaded>(key: K, value: Loaded[K]) =>
    setLoaded((current) => (current ? { ...current, [key]: value } : current))

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 p-4">
        <Label htmlFor="date">{t.date}</Label>
        {/*
          `onClear` is passed here and nowhere else. Without it the date could
          never be emptied, and AC-3 — "clears the date entirely and tries to
          save" — would be a state no user could reach.
        */}
        <DateField
          id="date"
          value={loaded.date}
          onChange={(date) => {
            set('date', date)
            setDateError(false)
          }}
          onClear={() => set('date', null)}
        />
        {dateError ? <Text className="text-destructive text-sm">{t.dateRequired}</Text> : null}

        <Text variant="h4" className="pt-4">
          {t.locationSection}
        </Text>

        <Label htmlFor="address">{t.address}</Label>
        <Input
          id="address"
          value={loaded.address}
          onChangeText={(value) => set('address', value)}
          placeholder={t.addressPlaceholder}
        />

        <Label htmlFor="location-note">{t.locationNotes}</Label>
        <Textarea
          id="location-note"
          value={loaded.note}
          onChangeText={(value) => set('note', value)}
          placeholder={t.locationNotesPlaceholder}
        />

        <View className="flex-row gap-2 pt-1">
          <Button variant="secondary" className="flex-1" disabled={busy} onPress={() => pick('image')}>
            <Text>{t.attachImage}</Text>
          </Button>
          <Button variant="secondary" className="flex-1" disabled={busy} onPress={() => pick('video')}>
            <Text>{t.attachVideo}</Text>
          </Button>
        </View>

        {loaded.attachment ? (
          <Text className="text-muted-foreground text-sm">
            {attachmentKind(loaded.attachment) === 'video' ? '🎞' : '🖼'}
          </Text>
        ) : null}

        <Text variant="h4" className="pt-4">
          {t.editFilesTitle}
        </Text>

        <Label htmlFor="raw-files">{t.rawFiles}</Label>
        <Input
          id="raw-files"
          value={loaded.rawFilesUrl}
          onChangeText={(value) => {
            set('rawFilesUrl', value)
            setFormError(null)
          }}
          placeholder={t.setLinkPlaceholder}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Label htmlFor="finished-photos">{t.finishedPhotos}</Label>
        <Input
          id="finished-photos"
          value={loaded.finishedPhotosUrl}
          onChangeText={(value) => {
            set('finishedPhotosUrl', value)
            setFormError(null)
          }}
          placeholder={t.setLinkPlaceholder}
          autoCapitalize="none"
          keyboardType="url"
        />

        {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

        <View className="mt-4 flex-row gap-2">
          <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
            <Text>{t.cancel}</Text>
          </Button>
          <Button className="flex-1" disabled={busy} onPress={submit}>
            <Text>{t.save}</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

/** YYYY-MM-DD to a local Date, avoiding `new Date(string)`'s UTC parsing. */
function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
