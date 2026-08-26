import { useState } from 'react'
import { Pressable } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button, Input, Sheet, View, XStack } from 'tamagui'
import { uk } from '../i18n/uk'
import { toIsoDate } from '../features/shoots/date'

type Props = {
  id?: string
  value: Date | null
  onChange: (date: Date) => void
  placeholder?: string
}

/**
 * A date *field*: it looks and sits like the Input fields around it, and opens
 * the platform picker on tap rather than embedding a control that reads as
 * foreign in a form.
 *
 * Two things this deliberately avoids:
 *
 * - Rendering `DateTimePicker` inline. Whether `inline` (a full month grid) or
 *   `compact` (a grey chip), it looks nothing like the Inputs above it, and a
 *   form with one alien field reads as unfinished.
 * - Letting the date be typed. A text field invites locale ambiguity — is
 *   05.09 September or May? — for no gain on a device with a native picker.
 *
 * Tamagui has no date component of its own (`@tamagui/date` is unpublished), so
 * the picker inside the sheet is `@react-native-community/datetimepicker`,
 * which wraps UIDatePicker. Tamagui supplies the field and the sheet.
 */
export function DateField({ id, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(value ?? new Date())

  const openSheet = () => {
    setDraft(value ?? new Date())
    setOpen(true)
  }

  return (
    <>
      {/* React Native's Pressable, not a Tamagui View: a plain View is not a
          touch target on native, so onPress on one silently does nothing.
          pointerEvents none on the Input keeps it from focusing and raising a
          keyboard for a value that cannot be typed. */}
      <Pressable onPress={openSheet} accessibilityRole="button">
        <View pointerEvents="none">
          <Input
            id={id}
            value={value ? toIsoDate(value) : ''}
            placeholder={placeholder ?? uk.pickDate}
          />
        </View>
      </Pressable>

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPointsMode="fit"
        dismissOnSnapToBottom
      >
        <Sheet.Overlay bg="$shadowColor" />
        <Sheet.Frame p="$4" gap="$3">
          <Sheet.Handle />
          <XStack justify="center">
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={(_event, selected) => {
                if (selected) setDraft(selected)
              }}
            />
          </XStack>
          <Button
            theme="accent"
            size="$4"
            onPress={() => {
              onChange(draft)
              setOpen(false)
            }}
          >
            {uk.done}
          </Button>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}
