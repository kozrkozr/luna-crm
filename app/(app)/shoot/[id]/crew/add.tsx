import { useState } from 'react'
import { Image, Platform, ScrollView, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../../../../src/components/ui/button'
import { Input } from '../../../../../src/components/ui/input'
import { Label } from '../../../../../src/components/ui/label'
import { Text } from '../../../../../src/components/ui/text'
import { Textarea } from '../../../../../src/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../../src/components/ui/select'
import { ROLES_UK, type Role } from '../../../../../src/i18n/uk'
import { useStrings } from '../../../../../src/i18n/LanguageProvider'
import {
  addCrewMember,
  hasContact,
  uploadCrewNoteImage,
} from '../../../../../src/features/crew/api'

/**
 * US-005 — add a crew member to a shoot manually.
 *
 * This is the cold-start fallback that makes v1 usable with no existing users
 * (ADR-003): the person added here never registers, and US-006 generates their
 * link from this row.
 *
 * Fields follow the prototype's screenAddCrew: name, role, one «Телефон або
 * email» field, optional Instagram, and a note that may carry one image. The
 * prototype's rich-text toolbar is demo chrome — it labels itself so — and the
 * data model stores plain text, so the note is a plain textarea.
 */
export default function AddCrewScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [contact, setContact] = useState('')
  const [instagram, setInstagram] = useState('')
  const [note, setNote] = useState('')
  const [noteImage, setNoteImage] = useState<string | null>(null)
  const [noteImageUri, setNoteImageUri] = useState<string | null>(null)

  const [errors, setErrors] = useState<{ name?: boolean; contact?: boolean }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickNoteImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
    if (picked.canceled) return

    setBusy(true)
    const path = await uploadCrewNoteImage(id, picked.assets[0])
    setBusy(false)
    if (!path) return setFormError(t.attachmentTypeUnsupported)
    setNoteImage(path)
    // Shown from the local file rather than a signed URL: it is already on the
    // device, and there is no row yet to sign against.
    setNoteImageUri(picked.assets[0].uri)
  }

  const submit = async () => {
    // AC-2 — a phone number or email is required, and an Instagram handle alone
    // is not enough. Checked before the request; the CHECK constraint would
    // also refuse it, but a database error is not an actionable message.
    //
    // The name is required too. The schema says so (`name text not null`) and
    // AC-1 lists it, but no story supplies copy for its absence — the same gap
    // US-002 hit with the client's name.
    const nextErrors = { name: !name.trim(), contact: !hasContact(contact) }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.contact) {
      setFormError(null)
      return
    }

    setBusy(true)
    const added = await addCrewMember(id, {
      name,
      // The select starts empty where the prototype's starts on the first role.
      // Falling back keeps an empty role out of a column that forbids it.
      role: role || ROLES_UK[0],
      contact,
      instagram,
      note,
      noteImage,
    })
    setBusy(false)

    if (!added) return setFormError(t.crewAddFailed)

    // AC-1 — they appear in the shoot's crew list, which refetches on focus.
    router.back()
  }

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 p-4">
        <Label htmlFor="crew-name">{t.crewName}</Label>
        <Input
          id="crew-name"
          value={name}
          onChangeText={(value) => {
            setName(value)
            setErrors((e) => ({ ...e, name: false }))
          }}
          autoCapitalize="words"
          placeholder={t.crewNamePlaceholder}
        />
        {errors.name ? <Text className="text-destructive text-sm">{t.crewNameRequired}</Text> : null}

        <Label htmlFor="crew-role">{t.crewRole}</Label>
        <Select
          value={role ? { value: role, label: role } : undefined}
          onValueChange={(option) => option && setRole(option.value as Role)}
        >
          <SelectTrigger id="crew-role" className="w-full">
            <SelectValue placeholder={t.rolePlaceholder} />
          </SelectTrigger>
          <SelectContent
            insets={{
              top: insets.top,
              bottom: Platform.select({ ios: insets.bottom, android: insets.bottom + 24 }) ?? 0,
              left: 12,
              right: 12,
            }}
            className="w-full"
          >
            <SelectGroup>
              {ROLES_UK.map((roleName) => (
                <SelectItem key={roleName} label={roleName} value={roleName}>
                  {roleName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Label htmlFor="crew-contact">{t.crewContact}</Label>
        <Input
          id="crew-contact"
          value={contact}
          onChangeText={(value) => {
            setContact(value)
            setErrors((e) => ({ ...e, contact: false }))
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t.crewContactPlaceholder}
        />
        {errors.contact ? (
          <Text className="text-destructive text-sm">{t.contactRequired}</Text>
        ) : null}

        <Label htmlFor="crew-instagram">{t.crewInstagram}</Label>
        <Input
          id="crew-instagram"
          value={instagram}
          onChangeText={setInstagram}
          autoCapitalize="none"
          placeholder="@..."
        />

        <Label htmlFor="crew-note">{t.crewNotes}</Label>
        <Textarea
          id="crew-note"
          value={note}
          onChangeText={setNote}
          placeholder={t.crewNotesPlaceholder}
        />

        <View className="flex-row items-center gap-2 pt-1">
          <Button variant="secondary" disabled={busy} onPress={pickNoteImage}>
            <Text>{t.attachImage}</Text>
          </Button>
          {noteImageUri ? (
            <Image
              source={{ uri: noteImageUri }}
              className="border-border h-12 w-12 rounded-md border"
              resizeMode="cover"
            />
          ) : null}
        </View>

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
