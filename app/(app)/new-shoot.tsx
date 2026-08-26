import { useState } from 'react'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button, Form, Input, Label, ScrollView, SizableText, Theme, XStack, YStack } from 'tamagui'
import { uk } from '../../src/i18n/uk'
import { createShoot } from '../../src/features/shoots/api'
import { toIsoDate } from '../../src/features/shoots/date'

/**
 * US-002 — create a shoot with the client's contact info and date.
 *
 * Fields follow the gated prototype's screenNewShoot: client name, client
 * contact, date. Location is deliberately absent — it moved to US-018 so the
 * creation form stays minimal.
 *
 * The date uses the platform picker (UIDatePicker), not a Tamagui control. A
 * date is a platform-shaped interaction, which is where S-1's F-3 says to use a
 * native component rather than an approximation of one.
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
      bg="$background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Form onSubmit={submit} p="$4" gap="$2">
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
        {/*
          `compact` is the iOS form idiom: a small date chip that opens a
          calendar popover on tap. `inline` drops a full month grid into the
          middle of the form, which is what a date *screen* uses, not a field.

          The field starts as a button rather than a pre-filled picker so the
          date can genuinely be unset — AC-2's blocked save needs a reachable
          empty state. Tapping it seeds today and hands over to the picker.
        */}
        {date === null ? (
          <Button
            id="date"
            size="$4"
            justify="flex-start"
            onPress={() => setDate(new Date())}
          >
            {uk.pickDate}
          </Button>
        ) : (
          <XStack items="center">
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              onChange={(_event, selected) => {
                if (selected) setDate(selected)
              }}
            />
          </XStack>
        )}
        <FieldError show={!!errors.date} message={uk.dateRequired} />

        {formError ? (
          <Theme name="red">
            <SizableText size="$2" color="$color11">
              {formError}
            </SizableText>
          </Theme>
        ) : null}

        <XStack gap="$2" mt="$4">
          <Button flex={1} size="$4" chromeless onPress={() => router.back()}>
            {uk.cancel}
          </Button>
          <Form.Trigger asChild disabled={submitting}>
            <Button flex={1} theme="accent" size="$4">
              {uk.save}
            </Button>
          </Form.Trigger>
        </XStack>
      </Form>
    </ScrollView>
  )
}

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null
  return (
    <Theme name="red">
      <SizableText size="$2" color="$color11">
        {message}
      </SizableText>
    </Theme>
  )
}
