import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button } from './ui/button'
import { Text } from './ui/text'
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
 * Uses React Native's Modal rather than a library sheet. The previous UI
 * layer's sheet did not appear here — most likely its fit-to-content mode
 * measuring the native picker as zero height, since a native view reports no
 * intrinsic size to the measurer. That cost four commits to settle, so this
 * deliberately keeps the path with no measurement guesswork. ADR-016 changed
 * the library, not this reasoning: RNR's overlays measure their content too, so
 * the same trap is available and is not worth re-entering for a story that
 * already works.
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
      {/*
        `variant="outline"` is the field-shaped button: a bordered box on the
        page background, which is what Input renders as. Justified to the start
        so the value sits where a field's text would.
      */}
      <Button
        id={id}
        variant="outline"
        className="w-full justify-start"
        onPress={() => {
          setDraft(value ?? new Date())
          setOpen(true)
        }}
      >
        <Text className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value ? toIsoDate(value) : (placeholder ?? uk.pickDate)}
        </Text>
      </Button>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        {/* Dim the page behind, and let a tap outside dismiss. */}
        <Pressable className="flex-1 justify-end bg-black/40" onPress={close}>
          <View className="bg-background gap-3 rounded-t-2xl p-4">
            <View className="flex-row justify-center" style={{ height: PICKER_HEIGHT }}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                style={{ flex: 1, height: PICKER_HEIGHT }}
                onChange={(_event, selected) => {
                  if (selected) setDraft(selected)
                }}
              />
            </View>
            <View className="flex-row gap-2">
              <Button variant="ghost" className="flex-1" onPress={close}>
                <Text>{uk.cancel}</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={() => {
                  onChange(draft)
                  close()
                }}
              >
                <Text>{uk.done}</Text>
              </Button>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}
