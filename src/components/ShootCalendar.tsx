import { View } from 'react-native'
import { Text } from './ui/text'
import { MONTHS_UK, WEEKDAYS_UK } from '../i18n/uk'
import { toIsoDate } from '../features/shoots/date'

/**
 * US-004 AC-1 — a calendar below the "new shoot" button, marking the dates that
 * have a shoot. AC-2 — with no shoots it still renders, simply with nothing
 * marked; an empty calendar is a state, not an error.
 *
 * Deliberately the current month only, with no month arrows and no tappable
 * days. US-004's Out of scope excludes "month navigation, multi-month view, or
 * any calendar behavior beyond marking shoot dates on the current view", and
 * separately leaves what tapping a date does unspecified. The prototype *does*
 * draw ‹ › arrows; that conflict is real and is recorded in
 * docs/open-questions.md rather than resolved by guessing which one wins.
 *
 * Weeks start on Monday, as in the prototype.
 */
export function ShootCalendar({ shootDates }: { shootDates: string[] }) {
  const marked = new Set(shootDates)
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

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
      <Text className="text-center text-sm font-semibold">{`${MONTHS_UK[month]} ${year}`}</Text>

      <View className="flex-row">
        {WEEKDAYS_UK.map((day) => (
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
            const hasShoot = marked.has(toIsoDate(new Date(year, month, day)))
            return (
              <View key={dayIndex} className="flex-1 items-center py-1.5">
                <View
                  className={
                    hasShoot
                      ? 'bg-status-new h-7 w-7 items-center justify-center rounded-lg'
                      : 'h-7 w-7 items-center justify-center'
                  }
                >
                  <Text
                    className={
                      hasShoot
                        ? 'text-status-new-foreground text-xs font-bold'
                        : 'text-xs'
                    }
                  >
                    {day}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}
