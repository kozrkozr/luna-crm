import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'
import { createShoot } from '../../src/features/shoots/api'
import { toIsoDate } from '../../src/features/shoots/date'
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
 * field left empty" is a state a user can actually reach.
 */
export default function NewShootScreen() {
  const router = useRouter()

  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [date, setDate] = useState<Date | null>(null)

  const [errors, setErrors] = useState<{ name?: boolean; contact?: boolean; date?: boolean }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    // AC-2 — save is blocked, the missing field is indicated, and nothing is
    // created. Validated before the request for exactly that reason.
    const nextErrors = {
      name: !clientName.trim(),
      contact: !clientContact.trim(),
      date: !date,
    }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.contact || nextErrors.date) {
      setFormError(null)
      return
    }

    setSubmitting(true)
    const result = await createShoot({
      clientName,
      clientContact,
      date: toIsoDate(date as Date),
    })
    setSubmitting(false)

    if (!result.ok) {
      setFormError(uk.shootCreateFailed)
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
        <Label htmlFor="client-name">{uk.clientName}</Label>
        <Input
          id="client-name"
          value={clientName}
          onChangeText={setClientName}
          autoCapitalize="words"
          placeholder={uk.clientNamePlaceholder}
        />
        <FieldError show={!!errors.name} message={uk.clientNameRequired} />

        <Label htmlFor="client-contact">{uk.clientContact}</Label>
        <Input
          id="client-contact"
          value={clientContact}
          onChangeText={setClientContact}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="+380…"
        />
        <FieldError show={!!errors.contact} message={uk.clientContactRequired} />

        <Label htmlFor="date">{uk.date}</Label>
        <DateField id="date" value={date} onChange={setDate} />
        <FieldError show={!!errors.date} message={uk.dateRequired} />

        {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

        <View className="mt-4 flex-row gap-2">
          <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
            <Text>{uk.cancel}</Text>
          </Button>
          <Button className="flex-1" disabled={submitting} onPress={submit}>
            <Text>{uk.save}</Text>
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
