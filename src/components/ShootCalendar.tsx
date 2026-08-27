import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { toIsoDate } from '../features/shoots/date'

/**
 * US-004's calendar.
 *
 * AC-1 — marks the dates that have a shoot. AC-2 — renders unmarked when there
 * are none; an empty calendar is a state, not an error. AC-3 — moves between
 * months. AC-4 — tapping a date filters the list, which this component reports
 * upward rather than doing itself.
 *
 * Every date is tappable, including unmarked ones (AC-4, owner's decision):
 * tapping a day with no shoots is a real, empty result rather than a dead tap.
 *
 * Weeks start on Monday, as in the prototype.
 */
type Props = {
  shootDates: string[]
  selected: string | null
  onSelect: (isoDate: string) => void
}

export function ShootCalendar({ shootDates, selected, onSelect }: Props) {
  const t = useStrings()
  const marked = new Set(shootDates)
  const today = new Date()
  // AC-3 — which month is on screen. Opens on the current one.
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })

  const step = (delta: number) =>
    setCursor((c) => {
      // Date normalises an out-of-range month into the neighbouring year, so
      // December → January needs no special case.
      const moved = new Date(c.year, c.month + delta, 1)
      return { year: moved.getFullYear(), month: moved.getMonth() }
    })

  const { year, month } = cursor
  // `(getDay() + 6) % 7` shifts JavaScript's Sunday-first week to Monday-first.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7
  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to whole weeks so every row has seven cells and nothing stretches.
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <View className="border-border bg-card gap-2 rounded-xl border p-3">
      <View className="flex-row items-center justify-between">
        <MonthButton label="‹" onPress={() => step(-1)} />
        <Text className="text-sm font-semibold">{`${t.months[month]} ${year}`}</Text>
        <MonthButton label="›" onPress={() => step(1)} />
      </View>

      <View className="flex-row">
        {t.weekdays.map((day: string) => (
          <Text key={day} className="text-muted-foreground flex-1 text-center text-[10px]">
            {day}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} className="flex-1" />
            // toIsoDate rather than a hand-built string: it is the one place
            // that turns a local calendar day into the YYYY-MM-DD the rows use.
            const iso = toIsoDate(new Date(year, month, day))
            const hasShoot = marked.has(iso)
            const isSelected = selected === iso
            return (
              <Pressable
                key={dayIndex}
                className="flex-1 items-center py-1.5 active:opacity-70"
                onPress={() => onSelect(iso)}
                role="button"
                accessibilityLabel={iso}
                accessibilityState={{ selected: isSelected }}
              >
                {/*
                  Selection and "has a shoot" are different things and must not
                  look alike: a filtered-to date with no shoots still has to
                  read as selected, and a marked date the reader has not tapped
                  must not read as filtered.
                */}
                <View
                  className={cellClass(hasShoot, isSelected)}
                >
                  <Text className={textClass(hasShoot, isSelected)}>{day}</Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function cellClass(hasShoot: boolean, isSelected: boolean): string {
  const base = 'h-7 w-7 items-center justify-center rounded-lg'
  if (isSelected) return `${base} bg-primary`
  if (hasShoot) return `${base} bg-status-new`
  return base
}

function textClass(hasShoot: boolean, isSelected: boolean): string {
  if (isSelected) return 'text-primary-foreground text-xs font-bold'
  if (hasShoot) return 'text-status-new-foreground text-xs font-bold'
  return 'text-xs'
}

/** AC-3's month arrows. Glyphs, not words — the same ‹ › the prototype uses. */
function MonthButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      className="h-8 w-8 items-center justify-center rounded-lg active:opacity-60"
      onPress={onPress}
      role="button"
      accessibilityLabel={label}
    >
      <Text className="text-muted-foreground text-base">{label}</Text>
    </Pressable>
  )
}
