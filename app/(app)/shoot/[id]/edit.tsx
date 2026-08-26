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
import { uk } from '../../../../src/i18n/uk'
import { getShoot, updateShoot } from '../../../../src/features/shoots/api'
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
}

/**
 * US-018 — edit a shoot's date and location.
 *
 * Fields follow the prototype's screenEditShoot: date, then a Локація section
 * with address, notes, and the two attach buttons.
 *
 * The prototype's edit form also carries a Файли section for the raw-files and
 * finished-photos links. That is deliberately absent here: those belong to
 * US-024/US-025, and US-018's Out of scope limits this story to date and
 * location. docs/open-questions.md #6 records that no story's criteria cover
 * the creator entering those links at all.
 *
 * Client name and contact are absent for the same reason — the story says
 * editing them "is a new ask, not assumed here".
 */
export default function EditShootScreen() {
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

    if (!path) return setFormError(uk.attachmentTypeUnsupported)
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

    setBusy(true)
    const ok = await updateShoot(id, {
      date: toIsoDate(loaded.date),
      locationAddress: loaded.address,
      locationNote: loaded.note,
      locationAttachment: loaded.attachment,
    })
    setBusy(false)

    if (!ok) return setFormError(uk.shootUpdateFailed)

    // AC-1 — the shoot reflects the change where it is shown. `back` returns to
    // the detail screen, which refetches on focus.
    router.back()
  }

  if (failedToLoad) {
    return (
      <View className="bg-background flex-1 p-4">
        <Text className="text-muted-foreground">{uk.somethingWentWrong}</Text>
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
        <Label htmlFor="date">{uk.date}</Label>
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
        {dateError ? <Text className="text-destructive text-sm">{uk.dateRequired}</Text> : null}

        <Text variant="h4" className="pt-4">
          {uk.locationSection}
        </Text>

        <Label htmlFor="address">{uk.address}</Label>
        <Input
          id="address"
          value={loaded.address}
          onChangeText={(value) => set('address', value)}
          placeholder={uk.addressPlaceholder}
        />

        <Label htmlFor="location-note">{uk.locationNotes}</Label>
        <Textarea
          id="location-note"
          value={loaded.note}
          onChangeText={(value) => set('note', value)}
          placeholder={uk.locationNotesPlaceholder}
        />

        <View className="flex-row gap-2 pt-1">
          <Button variant="secondary" className="flex-1" disabled={busy} onPress={() => pick('image')}>
            <Text>{uk.attachImage}</Text>
          </Button>
          <Button variant="secondary" className="flex-1" disabled={busy} onPress={() => pick('video')}>
            <Text>{uk.attachVideo}</Text>
          </Button>
        </View>

        {loaded.attachment ? (
          <Text className="text-muted-foreground text-sm">
            {attachmentKind(loaded.attachment) === 'video' ? '🎞' : '🖼'}
          </Text>
        ) : null}

        {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

        <View className="mt-4 flex-row gap-2">
          <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
            <Text>{uk.cancel}</Text>
          </Button>
          <Button className="flex-1" disabled={busy} onPress={submit}>
            <Text>{uk.save}</Text>
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
