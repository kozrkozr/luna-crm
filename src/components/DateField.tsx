import { useState } from 'react'
import { Keyboard, Modal, Pressable, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { elevation } from '../theme/elevation'
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
            The point of this component is to look like the Input fields it sits
            among, so it carries their fill and border: `border-input
            bg-input/30`, as in Input, SelectTrigger and Checkbox.
            `variant="outline"` cannot give it that on its own — RNR puts the
            fill behind a `dark:` prefix, and nothing applies the `dark` class
            here, so the variant paints `bg-background` and the field came out
            flat against the screen. The variant's `shadow-sm shadow-black/5`
            does apply and is not repeated.

            `h-11` matches Input's height; the button's own size classes are
            built for a button, not a field.
          */
          className="border-input bg-input/30 h-11 flex-1 justify-start rounded-md"
          onPress={() => {
            /*
              Blur the focused field before the sheet appears. Tapping this
              button does not take focus away from a TextInput — a Button is not
              a text target — so a field like the phone number stayed first
              responder underneath the modal, and iOS handed focus back to it
              when the modal was dismissed: the keyboard reappeared over a form
              the user had moved on from.

              `Keyboard.dismiss()` blurs the currently focused input rather than
              only hiding the keyboard, which is what makes the focus not come
              back.
            */
            Keyboard.dismiss()
            setDraft(value ?? new Date())
            setOpen(true)
          }}
        >
          <Text className={value ? 'text-foreground' : 'text-muted-foreground'}>
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
            <Text className="text-card-foreground">✕</Text>
          </Button>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        {/*
          No dim — owner's decision. The page behind stays at full brightness and
          the sheet is separated from it by its own border and shadow alone,
          which is why those were added.

          `bg-transparent` rather than dropping the Pressable: it still fills the
          screen and still catches the tap that dismisses the sheet. RN hit
          testing does not depend on a background colour, so an invisible layer
          is as tappable as a dimmed one.
        */}
        <Pressable className="flex-1 justify-end bg-transparent" onPress={close}>
          {/*
            `DateTimePicker` is a native view that draws its own text, and it
            takes the colour from the enclosing appearance rather than from
            anything NativeWind can reach — so on a light-appearance container it
            draws BLACK numbers on this dark sheet.

            `themeVariant` is the only reliable lever: it forces the picker's own
            appearance and does not depend on the app being built dark.
            `app.config.ts` does set `userInterfaceStyle: 'dark'`, but that value
            only reaches the app through `ios/LunaCRM/Info.plist`, which this repo
            checks in — so it is a build away at best, and this prop keeps the
            picker readable regardless. iOS only; Android ignores it.
          */}
          {/*
            The border and the shadow are what make this read as a sheet at all:
            `--card` is the same near-black as `--background`, so the sheet and
            the page it covers are the same colour, and the dim behind it was the
            only thing distinguishing them — two flat dark rectangles instead of
            one surface over another. Same fix as SelectContent, and the same
            pattern AlertDialogContent and Toast already use: an edge plus
            `elevation.overlay`, which is the one shadow that survives to
            Android.
          */}
          <View
            className="bg-card border-border gap-3 rounded-t-2xl border p-4"
            style={elevation.overlay}
          >
            <View className="flex-row justify-center" style={{ height: PICKER_HEIGHT }}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                themeVariant="dark"
                style={{ flex: 1, height: PICKER_HEIGHT }}
                /*
                  `onValueChange`, not the deprecated `onChange` — 9.1.0 warns on
                  the old one, which multiplexed selection, dismissal and
                  Android's neutral button through one callback and `event.type`.
                  The replacement fires only on a selection and types `date` as
                  non-optional, so the `if (selected)` guard the old signature
                  needed is gone.

                  No `onDismiss`: the picker is the inline spinner inside this
                  file's own Modal, so Cancel and the tap outside are what
                  dismiss it, and nothing native does.
                */
                onValueChange={(_event, selected) => setDraft(selected)}
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
