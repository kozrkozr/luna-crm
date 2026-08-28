import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { toIsoDate, toTimeValue } from '../features/shoots/date'

/** Standard height of the iOS date wheel. */
const PICKER_HEIGHT = 216

type Props = {
  id?: string
  value: Date | null
  onChange: (date: Date) => void
  placeholder?: string
  /**
   * `date` renders YYYY-MM-DD and opens the calendar wheel; `time` renders
   * HH:MM and opens the clock wheel (US-030). One component rather than two
   * because the modal below is the whole substance of this file, and the note
   * on it is a warning worth having in exactly one place.
   */
  mode?: 'date' | 'time'
  /**
   * Offers a way to clear the date. US-018 AC-3 requires that clearing it and
   * saving be blocked, which means the cleared state has to be reachable at
   * all — a picker with no way out can only ever produce a valid date. Omitted
   * on creation (US-002), where the field simply starts empty.
   */
  onClear?: () => void
}

/**
 * A date or time field: shaped like the Input fields around it, opening the
 * platform picker on tap. `mode` chooses which (US-030 added the time case).
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
export function DateField({ id, value, onChange, placeholder, onClear, mode = 'date' }: Props) {
  const t = useStrings()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(value ?? new Date())

  const close = () => setOpen(false)
  const format = mode === 'time' ? toTimeValue : toIsoDate
  const emptyLabel = placeholder ?? (mode === 'time' ? t.pickTime : t.pickDate)

  return (
    <>
      {/*
        `variant="outline"` is the field-shaped button: a bordered box on the
        page background, which is what Input renders as. Justified to the start
        so the value sits where a field's text would.
      */}
      <View className="flex-row items-center gap-2">
        <Button
          id={id}
          variant="outline"
          /*
            ADR-017 — `variant="outline"` is `bg-background`, which after the
            inversion is the near-black frame: this field was rendering
            dark-on-dark like Input was. Overridden to the white field of §5.9
            so it matches the Inputs it sits among, which is the whole point of
            the component.
          */
          className="border-input bg-card h-11 flex-1 justify-start rounded-md"
          onPress={() => {
            setDraft(value ?? new Date())
            setOpen(true)
          }}
        >
          <Text className={value ? 'text-card-foreground' : 'text-muted-foreground'}>
            {value ? format(value) : emptyLabel}
          </Text>
        </Button>
        {onClear && value ? (
          <Button
            variant="secondary"
            size="circle"
            onPress={onClear}
            accessibilityLabel={t.clearDate}
            hitSlop={6}
          >
            <Text className="text-ink">✕</Text>
          </Button>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        {/* Dim the page behind, and let a tap outside dismiss. */}
        <Pressable className="flex-1 justify-end bg-black/40" onPress={close}>
          {/* The picker sheet is a modal card: white, radius 16 (§5.13). It
              was `bg-background` — the frame — behind a native picker that
              renders its own dark text. */}
          <View className="bg-card gap-3 rounded-t-2xl p-4">
            <View className="flex-row justify-center" style={{ height: PICKER_HEIGHT }}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                style={{ flex: 1, height: PICKER_HEIGHT }}
                onChange={(_event, selected) => {
                  if (selected) setDraft(selected)
                }}
              />
            </View>
            <View className="flex-row gap-2">
              <Button variant="ghost" className="flex-1" onPress={close}>
                <Text>{t.cancel}</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={() => {
                  onChange(draft)
                  close()
                }}
              >
                <Text>{t.done}</Text>
              </Button>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}
