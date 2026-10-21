import { useRef, useState } from 'react'
import { View } from 'react-native'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { fromTimeValue, toIsoDate, toTimeValue } from '../features/shoots/date'

type Props = {
  id?: string
  value: Date | null
  onChange: (date: Date) => void
  placeholder?: string
  mode?: 'date' | 'time'
  onClear?: () => void
  minimumDate?: Date
  minuteInterval?: 5
}

/**
 * Web — `DateField.tsx`'s field, with the browser's own picker in place of the
 * iOS wheel (`US-040`). `@react-native-community/datetimepicker` has no web
 * build: it renders `null`, so the sheet opened empty and no date or time could
 * be chosen.
 *
 * The trigger is the same Button, so the field looks and reads the same —
 * placeholder, value, the clear button. Under it sits a native
 * `<input type="date|time">`, invisible, which the press opens with
 * `showPicker()`; `min` and `step` carry `minimumDate` and `minuteInterval`, so
 * the browser refuses what the wheel refused.
 *
 * Where a browser has no picker for the input (`showPicker()` throws — Firefox's
 * time input is typed, not picked), the input itself is shown in the field's
 * place and focused, so it can still be typed into.
 */
export function DateField({
  id,
  value,
  onChange,
  placeholder,
  onClear,
  minimumDate,
  minuteInterval,
  mode = 'date',
}: Props) {
  const t = useStrings()
  const input = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState(false)

  const format = mode === 'time' ? toTimeValue : toIsoDate
  const emptyLabel = placeholder ?? (mode === 'time' ? t.pickTime : t.pickDate)

  const open = () => {
    const el = input.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      setTyped(true)
      requestAnimationFrame(() => input.current?.focus())
    }
  }

  const changed = (raw: string) => {
    if (!raw) return
    if (mode === 'time') {
      // Chrome's and Safari's time pickers do not honour `step`, so round to it
      // here — the same reason `DateField.tsx` rounds the wheel's draft.
      const time = fromTimeValue(raw)
      if (minuteInterval) {
        time.setMinutes(Math.round(time.getMinutes() / minuteInterval) * minuteInterval, 0, 0)
      }
      return onChange(time)
    }
    const [year, month, day] = raw.split('-').map(Number)
    onChange(new Date(year, month - 1, day))
  }

  return (
    <View className="flex-row items-center gap-2">
      <View className="relative h-11 flex-1">
        {typed ? null : (
          <Button
            id={id}
            variant="outline"
            className="border-input bg-input/30 h-11 flex-1 justify-start rounded-md"
            onPress={open}
          >
            <Text className={value ? 'text-foreground' : 'text-muted-foreground'}>
              {value ? format(value) : emptyLabel}
            </Text>
          </Button>
        )}
        <input
          ref={input}
          type={mode}
          aria-label={emptyLabel}
          tabIndex={typed ? 0 : -1}
          value={value ? format(value) : ''}
          min={mode === 'date' && minimumDate ? toIsoDate(minimumDate) : undefined}
          step={mode === 'time' && minuteInterval ? minuteInterval * 60 : undefined}
          onChange={(event) => changed(event.target.value)}
          className={
            typed
              ? 'border-input bg-input/30 text-foreground h-11 w-full rounded-md border px-3'
              : undefined
          }
          style={
            typed
              ? { colorScheme: 'dark', fontSize: 16 }
              : {
                  // Present for showPicker() to anchor to, but neither seen nor hit.
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  pointerEvents: 'none',
                  colorScheme: 'dark',
                }
          }
        />
      </View>
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
  )
}
