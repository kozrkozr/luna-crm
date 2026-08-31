import { useState } from 'react'
import { Pressable, View } from 'react-native'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { toIsoDate } from '../features/shoots/date'
import { selected as tickSelection } from '../lib/haptics'

/**
 * An inline month grid for **picking one date**, on the new-shoot form.
 *
 * Separate from `ShootCalendar`, which browses. That one marks days that have
 * shoots, drives a filter, has a week mode, and lets any day be tapped —
 * including days long past, because looking back is the point. This one selects
 * a single day, refuses the past, and has no week mode. One component doing
 * both would be a pile of flags.
 *
 * **Monday-first**, like everything else in the app. `New Shoot.dc.html` lists
 * its weekdays Sunday-first and its `getDay()` arithmetic follows — that is a US
 * default leaking through the prototype's plain `Date` maths, and Ukrainian
 * weeks start on Monday.
 *
 * Past days are dimmed and unpickable **by default only**. Nothing in the
 * backlog forbids a shoot in the past; that is the create form following the
 * design, where a past date is far more likely a mis-tap than an intent.
 *
 * `allowPast` exists because the EDIT form must not inherit it. A shoot that has
 * already happened is still editable, and with the past locked its own date
 * would render dimmed and untappable — the field would look broken on exactly
 * the records most likely to need a correction.
 */
export function MonthPicker({
  value,
  onChange,
  invalid = false,
  allowPast = false,
}: {
  value: Date | null
  onChange: (date: Date) => void
  /** Draws the destructive border the design gives a failed required field. */
  invalid?: boolean
  /** Set on the edit form — see the note above. */
  allowPast?: boolean
}) {
  const t = useStrings()
  const today = new Date()
  const todayIso = toIsoDate(today)

  const [cursor, setCursor] = useState(() => ({
    year: (value ?? today).getFullYear(),
    month: (value ?? today).getMonth(),
  }))

  const step = (delta: number) => {
    // `Date` normalises an out-of-range month into the neighbouring year, so
    // December → January needs no special case.
    const moved = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: moved.getFullYear(), month: moved.getMonth() })
  }

  const first = new Date(cursor.year, cursor.month, 1)
  // `(getDay() + 6) % 7` shifts JavaScript's Sunday-first week onto the
  // Monday-first array — the same conversion the rest of the app makes.
  const lead = (first.getDay() + 6) % 7
  const days = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const selectedIso = value ? toIsoDate(value) : null

  return (
    <View
      className={`bg-background rounded-xl border p-3 ${
        invalid ? 'border-destructive/60' : 'border-border'
      }`}
    >
      <View className="mb-2.5 flex-row items-center justify-between">
        <Arrow direction="prev" onPress={() => step(-1)} />
        <Text className="text-body-sm text-foreground font-semibold">
          {`${t.months[cursor.month]} ${cursor.year}`}
        </Text>
        <Arrow direction="next" onPress={() => step(1)} />
      </View>

      <View className="mb-1 flex-row">
        {t.weekdays.map((day) => (
          <Text
            key={day}
            className="text-micro text-muted-foreground flex-1 text-center font-semibold uppercase"
          >
            {day}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {/* Leading blanks keep the first of the month under its weekday. Each is
            a spacer of the same width as a cell, not a rendered empty cell. */}
        {Array.from({ length: lead }, (_, i) => (
          <View key={`lead-${i}`} className="aspect-square w-[14.28%]" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1
          const iso = toIsoDate(new Date(cursor.year, cursor.month, day))
          const isSelected = iso === selectedIso
          const isToday = iso === todayIso
          const isPast = !allowPast && iso < todayIso

          return (
            <View key={iso} className="aspect-square w-[14.28%] p-[1.5px]">
              <Pressable
                className={`flex-1 items-center justify-center rounded-lg border ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : isToday
                      ? 'border-border-strong'
                      : 'border-transparent'
                } ${isPast ? '' : 'active:bg-secondary'}`}
                disabled={isPast}
                onPress={() => {
                  tickSelection()
                  onChange(new Date(cursor.year, cursor.month, day))
                }}
                role="button"
                accessibilityLabel={iso}
                accessibilityState={{ selected: isSelected, disabled: isPast }}
              >
                <Text
                  className={`text-body-sm ${
                    isSelected
                      ? 'text-primary-foreground font-semibold'
                      : isPast
                        ? 'text-muted-foreground/40'
                        : isToday
                          ? 'text-foreground font-semibold'
                          : 'text-foreground'
                  }`}
                >
                  {String(day)}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function Arrow({ direction, onPress }: { direction: 'prev' | 'next'; onPress: () => void }) {
  const t = useStrings()
  return (
    <Pressable
      className="active:bg-secondary h-8 w-8 items-center justify-center rounded-lg"
      onPress={() => {
        tickSelection()
        onPress()
      }}
      hitSlop={8}
      role="button"
      accessibilityLabel={direction === 'prev' ? t.calPrev : t.calNext}
    >
      <Icon
        as={direction === 'prev' ? ChevronLeft : ChevronRight}
        size={16}
        strokeWidth={2}
        className="text-foreground"
      />
    </Pressable>
  )
}
