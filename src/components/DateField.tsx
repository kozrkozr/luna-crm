import { useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button, Sheet, SizableText, XStack } from 'tamagui'
import { uk } from '../i18n/uk'
import { toIsoDate } from '../features/shoots/date'

type Props = {
  id?: string
  value: Date | null
  onChange: (date: Date) => void
  placeholder?: string
}

/**
 * A date field: shaped like the Input fields around it, opening the platform
 * picker in a sheet on tap.
 *
 * Built on Button, not on Input wrapped in a press handler. Two earlier attempts
 * failed silently on device and neither could fail at compile time:
 *
 *   1. onPress on a Tamagui View — a plain View is not a touch target on
 *      native, so the handler is accepted and never fires.
 *   2. Pressable wrapping an Input — the Input is a TextInput, itself a touch
 *      target, so it swallowed the tap.
 *
 * A Button is unambiguously tappable. There is no TextInput here at all, which
 * is correct anyway: the date is not typeable. A text field would invite locale
 * ambiguity — is 05.09 September or May? — for no gain on a device with a
 * native picker.
 *
 * Tamagui has no date component (`@tamagui/date` is unpublished), so the wheel
 * is @react-native-community/datetimepicker over UIDatePicker. Tamagui supplies
 * the field and the sheet.
 */
export function DateField({ id, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(value ?? new Date())

  return (
    <>
      <Button
        id={id}
        size="$4"
        justify="flex-start"
        bg="$color3"
        borderWidth={0}
        onPress={() => {
          setDraft(value ?? new Date())
          setOpen(true)
        }}
      >
        <SizableText size="$4" color={value ? '$color' : '$placeholderColor'}>
          {value ? toIsoDate(value) : (placeholder ?? uk.pickDate)}
        </SizableText>
      </Button>

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
