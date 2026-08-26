import { useState } from 'react'
import { Modal } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button, SizableText, View, XStack, YStack } from 'tamagui'
import { uk } from '../i18n/uk'
import { toIsoDate } from '../features/shoots/date'

/** Standard height of the iOS date wheel. */
const PICKER_HEIGHT = 216

type Props = {
  id?: string
  value: Date | null
  onChange: (date: Date) => void
  placeholder?: string
}

/**
 * A date field: shaped like the Input fields around it, opening the platform
 * picker on tap.
 *
 * Uses React Native's Modal rather than Tamagui's Sheet. The Sheet did not
 * appear here — most likely `snapPointsMode="fit"` measuring the native picker
 * as zero height, since a native view reports no intrinsic size to the
 * measurer. Sheet had already cost two rounds of debugging on this screen, so
 * this takes the path with no measurement guesswork. Worth revisiting for
 * polish, not worth blocking a story on.
 *
 * The trigger is a Button because a plain View is not a touch target on native
 * and an Input swallows the tap. There is deliberately no TextInput: the date is
 * not typeable, since a text field invites locale ambiguity — is 05.09 September
 * or May? — for no gain on a device with a native picker.
 */
export function DateField({ id, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(value ?? new Date())

  const close = () => setOpen(false)

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

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        {/* Dim the page behind, and let a tap outside dismiss. */}
        <View flex={1} justify="flex-end" bg="rgba(0,0,0,0.4)" onPress={close}>
          <YStack bg="$background" p="$4" gap="$3" borderTopLeftRadius="$6" borderTopRightRadius="$6">
            <XStack justify="center" height={PICKER_HEIGHT}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                style={{ flex: 1, height: PICKER_HEIGHT }}
                onChange={(_event, selected) => {
                  if (selected) setDraft(selected)
                }}
              />
            </XStack>
            <XStack gap="$2">
              <Button flex={1} size="$4" chromeless onPress={close}>
                {uk.cancel}
              </Button>
              <Button
                flex={1}
                theme="accent"
                size="$4"
                onPress={() => {
                  onChange(draft)
                  close()
                }}
              >
                {uk.done}
              </Button>
            </XStack>
          </YStack>
        </View>
      </Modal>
    </>
  )
}
