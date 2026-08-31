import { Pressable, View } from 'react-native'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import { Icon } from './ui/icon'
import { Text, TextClassContext } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { toIsoDate } from '../features/shoots/date'
import { selected as tickSelection } from '../lib/haptics'

/**
 * `US-004`'s calendar, rebuilt as «Варіант 3» of
 * `calendar-ux-variants.html` (ADR-017).
 *
 * A card holding month navigation,
 * and then either a month grid or a single week strip. Cells are 44pt with a
 * 32pt number circle and a dot beneath for "has a shoot" — the design's §5.12,
 * and the one touch target in the whole mockup set that already cleared 44pt.
 *
 * Acceptance criteria carried over unchanged: AC-1 marks the dates that have a
 * shoot; AC-2 renders unmarked rather than disappearing when there are none;
 * AC-3 moves between months; AC-4 reports a tapped date upward for the list to
 * filter on. Every date is tappable, marked or not (AC-4, owner's decision) —
 * an empty day is a real result, not a dead tap.
 *
 * ── Two places this does NOT follow the mockup ───────────────────────────────
 *
 * **Weeks start on Monday.** All three variants draw `НД ПН ВТ …` and compute
 * with `d.getDay()`, and the design system's own §9 calls that a defect: in
 * Ukraine the week starts on Monday. Following the mockup here would ship a
 * calendar whose columns are wrong by one day.
 *
 * **The arrows move months in month mode.** In the mockup `v3prev()`/`v3next()`
 * return early unless the mode is `week`, so month navigation silently does
 * nothing. `US-004` AC-3 requires it. Both logged in docs/redesign-log.md.
 */
export type CalendarMode = 'month' | 'week'

type Props = {
  shootDates: string[]
  selected: string | null
  onSelect: (isoDate: string) => void
  /** Which grid to draw. Owned by the screen — see the note below. */
  mode: CalendarMode
  /** The month, or the week, currently on screen. Also owned by the screen. */
  focus: Date
  onFocusChange: (focus: Date) => void
}

/**
 * Controlled since 2026-08-30. `mode` and `focus` live on the screen, because
 * two things outside this card now read them: the header's meta line («Вересень
 * · 6 зйомок») and its «Сьогодні» button, which resets both. A calendar that
 * owned its own position could not be moved from outside without a ref.
 *
 * The segmented control moved out with them — `Calendar.dc.html` draws it ABOVE
 * the card, and it is the shared `Tabs` now rather than this file's own
 * `ModeTab`.
 */
export function ShootCalendar({
  shootDates,
  selected,
  onSelect,
  mode,
  focus,
  onFocusChange,
}: Props) {
  const t = useStrings()
  const marked = new Set(shootDates)

  const step = (delta: number) => {
    const moved = new Date(focus)
    // A week moves seven days; a month moves to the first of the neighbouring
    // one, which `Date` normalises across a year boundary for us.
    if (mode === 'week') moved.setDate(focus.getDate() + delta * 7)
    else moved.setMonth(focus.getMonth() + delta, 1)
    onFocusChange(moved)
  }

  return (
    <TextClassContext.Provider value="text-foreground">
      {/*
        `flat`: the page colour inside a `#27272a` border, radius 12 — the
        handoff's card, and no longer the lifted `--card` hero this was. The
        shadow went with the fill; a shadow under a card the same colour as the
        page reads as a smudge.
      */}
      <View className="bg-background border-border rounded-xl border px-3 pb-3.5 pt-3">
        <View className="mb-3 flex-row items-center justify-between">
          <NavButton direction="prev" onPress={() => step(-1)} />
          <Text className="text-subtitle text-foreground font-semibold">
            {mode === 'month'
              ? `${t.months[focus.getMonth()]} ${focus.getFullYear()}`
              : weekLabel(focus, t.monthsGenitive)}
          </Text>
          <NavButton direction="next" onPress={() => step(1)} />
        </View>

        {mode === 'month' ? (
          <MonthGrid
            year={focus.getFullYear()}
            month={focus.getMonth()}
            weekdays={t.weekdays}
            marked={marked}
            selected={selected}
            onSelect={onSelect}
          />
        ) : (
          <WeekStrip
            anchor={focus}
            weekdays={t.weekdays}
            marked={marked}
            selected={selected}
            onSelect={onSelect}
          />
        )}
      </View>
    </TextClassContext.Provider>
  )
}

function MonthGrid({
  year,
  month,
  weekdays,
  marked,
  selected,
  onSelect,
}: {
  year: number
  month: number
  weekdays: readonly string[]
  marked: Set<string>
  selected: string | null
  onSelect: (iso: string) => void
}) {
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
    <>
      <View className="mb-1.5 flex-row">
        {weekdays.map((day) => (
          <Text
            key={day}
            className="text-caption text-muted-foreground flex-1 text-center font-semibold"
          >
            {day}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((day, dayIndex) => {
            // An absent day is an empty cell of the SAME size, never nothing:
            // the design system's §5.12 warns that `display:none` here (a
            // missing View, in RN) collapses the grid.
            if (day === null) return <View key={dayIndex} className="h-11 flex-1" />
            // toIsoDate rather than a hand-built string: it is the one place
            // that turns a local calendar day into the YYYY-MM-DD the rows use.
            const iso = toIsoDate(new Date(year, month, day))
            return (
              <DayCell
                key={dayIndex}
                iso={iso}
                day={day}
                hasShoot={marked.has(iso)}
                isSelected={selected === iso}
                onSelect={onSelect}
              />
            )
          })}
        </View>
      ))}
    </>
  )
}

function WeekStrip({
  anchor,
  weekdays,
  marked,
  selected,
  onSelect,
}: {
  anchor: Date
  weekdays: readonly string[]
  marked: Set<string>
  selected: string | null
  onSelect: (iso: string) => void
}) {
  const start = startOfWeek(anchor)
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        const iso = toIsoDate(date)
        const isSelected = selected === iso
        const hasShoot = marked.has(iso)
        return (
          <Pressable
            key={iso}
            className="flex-1 items-center gap-1 rounded-lg py-2 active:opacity-70"
            onPress={() => {
              tickSelection()
              onSelect(iso)
            }}
            role="button"
            accessibilityLabel={iso}
            accessibilityState={{ selected: isSelected }}
          >
            <Text className="text-micro text-muted-foreground font-semibold">{weekdays[i]}</Text>
            <View
              className={`h-[30px] w-[30px] items-center justify-center rounded-full ${
                isSelected ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`text-body ${isSelected ? 'text-primary-foreground font-semibold' : 'text-card-foreground'}`}
              >
                {date.getDate()}
              </Text>
            </View>
            <Dot visible={hasShoot} />
          </Pressable>
        )
      })}
    </View>
  )
}

/**
 * One day: a 44pt target, a 32pt circle, a dot beneath.
 *
 * Selection and "has a shoot" are different things and must not look alike — a
 * filtered-to date with no shoots still has to read as selected, and a marked
 * date nobody has tapped must not read as filtered. So selection is the dark
 * circle and a shoot is the dot, rather than both being fills.
 */
function DayCell({
  iso,
  day,
  hasShoot,
  isSelected,
  onSelect,
}: {
  iso: string
  day: number
  hasShoot: boolean
  isSelected: boolean
  onSelect: (iso: string) => void
}) {
  return (
    <Pressable
      className="h-11 flex-1 items-center justify-center active:opacity-70"
      onPress={() => {
        // A selection tick, not an impact: picking a day changes a value
        // inside a control, which is the drier feedback iOS uses for that.
        tickSelection()
        onSelect(iso)
      }}
      role="button"
      accessibilityLabel={iso}
      accessibilityState={{ selected: isSelected }}
    >
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          isSelected ? 'bg-primary' : ''
        }`}
      >
        <Text
          className={`text-body ${isSelected ? 'text-primary-foreground font-semibold' : 'text-card-foreground'}`}
        >
          {day}
        </Text>
      </View>
      <Dot visible={hasShoot} />
    </Pressable>
  )
}


/**
 * The 4px dot under a day that has something on it.
 *
 * Rendered at all times and made transparent when there is nothing, rather than
 * conditionally: a cell that grew a dot would shift its number by two pixels,
 * and a month grid of numbers that jump as you scan it is worse than a dot that
 * is sometimes invisible.
 */
function Dot({ visible }: { visible: boolean }) {
  return (
    <View
      className={`mt-1 h-1 w-1 rounded-full ${visible ? 'bg-muted-foreground' : 'bg-transparent'}`}
    />
  )
}

/**
 * AC-3's arrows, as the handoff's 36pt chevron buttons.
 *
 * `hitSlop` because 36pt is still under §6.3's 44pt minimum. The visual size
 * stays; the touch area does not.
 */
function NavButton({ direction, onPress }: { direction: 'prev' | 'next'; onPress: () => void }) {
  const t = useStrings()
  return (
    <Pressable
      className="active:bg-secondary h-9 w-9 items-center justify-center rounded-lg"
      onPress={() => {
        tickSelection()
        onPress()
      }}
      hitSlop={6}
      role="button"
      accessibilityLabel={direction === 'prev' ? t.calPrev : t.calNext}
    >
      {/* A lucide chevron, not a «‹» text glyph: the glyph's weight and its
          vertical centring differ per platform font, and it could not take a
          stroke width. */}
      <Icon
        as={direction === 'prev' ? ChevronLeft : ChevronRight}
        size={18}
        strokeWidth={2}
        className="text-foreground"
      />
    </Pressable>
  )
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date)
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return start
}

/** «13 — 19 вересня» for the week strip's label. */
function weekLabel(anchor: Date, monthsGenitive: readonly string[]): string {
  const start = startOfWeek(anchor)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const left = sameMonth
    ? String(start.getDate())
    : `${start.getDate()} ${monthsGenitive[start.getMonth()]}`
  return `${left} — ${end.getDate()} ${monthsGenitive[end.getMonth()]}`
}
