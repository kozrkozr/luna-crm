import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { createShoot } from '../../src/features/shoots/api'
import { toIsoDate, toTimeValue } from '../../src/features/shoots/date'
import { DateField } from '../../src/components/DateField'

/**
 * US-002 — create a shoot with the client's contact info and date.
 *
 * Fields follow the gated prototype's screenNewShoot: client name, client
 * contact, date. Location is deliberately absent — it moved to US-018 so the
 * creation form stays minimal.
 *
 * The date is a DateField: an input-shaped field, consistent with the ones
 * above it, that opens the platform picker (UIDatePicker). A date is a
 * platform-shaped interaction, which is where S-1's F-3 says to use the native
 * component rather than an approximation — but the *field* should still look
 * like a field.
 *
 * The date starts unset rather than defaulting to today, so AC-2's "required
 * field left empty" is a state a user can actually reach. US-030's start and
 * end times work the same way, and for the same reason.
 */
export default function NewShootScreen() {
  const t = useStrings()
  const router = useRouter()

  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [date, setDate] = useState<Date | null>(null)
  // US-030 AC-1 — both required. Unset like the date, so AC-2's "required field
  // left empty" stays a reachable state rather than one a default hides.
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)

  const [errors, setErrors] = useState<{
    name?: boolean
    contact?: boolean
    date?: boolean
    startTime?: boolean
    endTime?: boolean
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    // AC-2 — save is blocked, the missing field is indicated, and nothing is
    // created. Validated before the request for exactly that reason.
    //
    // Note what is NOT checked: whether the end is before the start. US-030
    // AC-3 is unwritten — see 02-product/open-questions.md item 14 — so an
    // inverted range saves. That is the specified behaviour, not an oversight.
    const nextErrors = {
      name: !clientName.trim(),
      contact: !clientContact.trim(),
      date: !date,
      startTime: !startTime,
      endTime: !endTime,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      setFormError(null)
      return
    }

    setSubmitting(true)
    const result = await createShoot({
      clientName,
      clientContact,
      date: toIsoDate(date as Date),
      startTime: toTimeValue(startTime as Date),
      endTime: toTimeValue(endTime as Date),
    })
    setSubmitting(false)

    if (!result.ok) {
      setFormError(t.shootCreateFailed)
      return
    }

    // AC-1 — the new shoot appears in the shoot list. `back` returns to it and
    // the list refetches on focus.
    router.back()
  }

  return (
    <ScrollView
      className="bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-2 p-4">
        <Label htmlFor="client-name">{t.clientName}</Label>
        <Input
          id="client-name"
          value={clientName}
          onChangeText={setClientName}
          autoCapitalize="words"
          placeholder={t.clientNamePlaceholder}
        />
        <FieldError show={!!errors.name} message={t.clientNameRequired} />

        <Label htmlFor="client-contact">{t.clientContact}</Label>
        <Input
          id="client-contact"
          value={clientContact}
          onChangeText={setClientContact}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="+380…"
        />
        <FieldError show={!!errors.contact} message={t.clientContactRequired} />

        <Label htmlFor="date">{t.date}</Label>
        <DateField id="date" value={date} onChange={setDate} />
        <FieldError show={!!errors.date} message={t.dateRequired} />

        {/*
          Start and end side by side, each flex-1 — the pairing the design
          system's §5.9 specifies for a row of two fields.
        */}
        <View className="flex-row gap-2">
          <View className="flex-1 gap-2">
            <Label htmlFor="start-time">{t.timeStart}</Label>
            <DateField id="start-time" mode="time" value={startTime} onChange={setStartTime} />
          </View>
          <View className="flex-1 gap-2">
            <Label htmlFor="end-time">{t.timeEnd}</Label>
            <DateField id="end-time" mode="time" value={endTime} onChange={setEndTime} />
          </View>
        </View>
        <FieldError show={!!errors.startTime} message={t.startTimeRequired} />
        <FieldError show={!!errors.endTime} message={t.endTimeRequired} />

        {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

        <View className="mt-4 flex-row gap-2">
          <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
            <Text>{t.cancel}</Text>
          </Button>
          <Button className="flex-1" disabled={submitting} onPress={submit}>
            <Text>{t.save}</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return <Text className="text-destructive text-sm">{message}</Text>
}
