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
 * `calendar-ux-variants.html` (ADR-017), then re-aligned to
 * `Calendar.dc.html`'s grid (owner, 2026-09-03).
 *
 * A card holding period navigation, a weekday header, and then either a month
 * grid or a single week strip.
 *
 * **The cells are square rounded rects, not circles** (2026-09-03). They were a
 * 44pt row holding a 32pt circle; the artboard draws `aspect-ratio:1` cells with
 * a radius of 8, separated by 4px gaps, and fills the WHOLE cell on selection.
 * A cell is ~46pt wide on a 402pt frame, so §6.3's 44pt minimum still holds
 * without a fixed height.
 *
 * Acceptance criteria carried over unchanged: AC-1 marks the dates that have a
 * shoot; AC-2 renders unmarked rather than disappearing when there are none;
 * AC-3 moves between months; AC-4 reports a tapped date upward for the list to
 * filter on. Every date is tappable, marked or not (AC-4, owner's decision) —
 * an empty day is a real result, not a dead tap.
 *
 * ── Three places this does NOT follow the mockup ─────────────────────────────
 *
 * **Weeks start on Monday.** Every mockup draws `НД ПН ВТ …` and computes with
 * `d.getDay()`, and the design system's own §9 calls that a defect: in Ukraine
 * the week starts on Monday. Following it would ship a calendar whose columns
 * are wrong by one day (logged as C-3).
 *
 * **The arrows move months in month mode.** In the prototype `v3prev()`/
 * `v3next()` return early unless the mode is `week`, so month navigation
 * silently does nothing. `US-004` AC-3 requires it.
 *
 * **The week label drops a repeated month.** `Calendar.dc.html` formats both
 * ends through the same helper and gets «13 вересня — 19 вересня»; its `fmt`
 * simply has no same-month case. Ours writes «13 — 19 вересня», which is the
 * same information without saying the month twice. An artifact of the
 * prototype's arithmetic rather than a drawn decision — same class as C-3.
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
  const today = toIsoDate(new Date())

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

        {/*
          The weekday header, shared by BOTH modes since 2026-09-03 — the
          artboard puts it outside its `isMonth` / `isWeek` branches. It used to
          live inside the month grid, which is why the week strip had grown a
          second copy of the letters inside each of its own cells.

          RN letterSpacing is absolute, never em: 0.04em at 10px is 0.4.

          **Not uppercased**, though the artboard's are. `t.weekdays` is «Пн Вт
          Ср», and it feeds `MonthPicker` as well as this card — so uppercasing
          means either two cases for one dictionary or a second component
          restyled on the way past. It also rewrites the weekday literal five
          acceptance assertions match on. Cheap to do deliberately; not worth
          doing as a side effect of a 10px label.
        */}
        <View className="mb-1.5 flex-row gap-1">
          {t.weekdays.map((day) => (
            <Text
              key={day}
              className="text-micro text-muted-foreground flex-1 text-center font-semibold"
              style={{ letterSpacing: 0.4 }}
            >
              {day}
            </Text>
          ))}
        </View>

        {mode === 'month' ? (
          <MonthGrid
            year={focus.getFullYear()}
            month={focus.getMonth()}
            marked={marked}
            selected={selected}
            today={today}
            onSelect={onSelect}
          />
        ) : (
          <WeekStrip
            anchor={focus}
            marked={marked}
            selected={selected}
            today={today}
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
  marked,
  selected,
  today,
  onSelect,
}: {
  year: number
  month: number
  marked: Set<string>
  selected: string | null
  today: string
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
    <View className="gap-1">
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row gap-1">
          {week.map((day, dayIndex) => {
            // An absent day is an empty cell of the SAME size, never nothing:
            // the design system's §5.12 warns that `display:none` here (a
            // missing View, in RN) collapses the grid.
            if (day === null) return <View key={dayIndex} className="aspect-square flex-1" />
            // toIsoDate rather than a hand-built string: it is the one place
            // that turns a local calendar day into the YYYY-MM-DD the rows use.
            const iso = toIsoDate(new Date(year, month, day))
            return (
              <DayCell
                key={dayIndex}
                iso={iso}
                day={day}
                shape="month"
                hasShoot={marked.has(iso)}
                isSelected={selected === iso}
                isToday={iso === today}
                onSelect={onSelect}
              />
            )
          })}
        </View>
      ))}
    </View>
  )
}

function WeekStrip({
  anchor,
  marked,
  selected,
  today,
  onSelect,
}: {
  anchor: Date
  marked: Set<string>
  selected: string | null
  today: string
  onSelect: (iso: string) => void
}) {
  const start = startOfWeek(anchor)
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        const iso = toIsoDate(date)
        return (
          <DayCell
            key={iso}
            iso={iso}
            day={date.getDate()}
            shape="week"
            hasShoot={marked.has(iso)}
            isSelected={selected === iso}
            isToday={iso === today}
            onSelect={onSelect}
          />
        )
      })}
    </View>
  )
}

/**
 * One day: a square cell in month mode, a taller one in the week strip.
 *
 * Three states have to stay distinguishable, which is why each uses a different
 * channel:
 *
 * - **selected** — the whole cell fills (`primary`), and the dot inverts so it
 *   stays visible on the fill.
 * - **today** — a `border-strong` edge and a heavier number. Nothing else in
 *   the grid is bordered, so it reads without competing with the fill. This was
 *   missing entirely before 2026-09-03.
 * - **has a shoot** — the number brightens to `foreground` where an empty day
 *   sits at `muted-foreground`, plus the dot. Two channels, because the dot
 *   alone is 4px.
 *
 * A filtered-to date with no shoots still has to read as selected, and a marked
 * date nobody has tapped must not read as filtered — hence a fill for one and a
 * dot for the other rather than two fills.
 */
function DayCell({
  iso,
  day,
  shape,
  hasShoot,
  isSelected,
  isToday,
  onSelect,
}: {
  iso: string
  day: number
  shape: 'month' | 'week'
  hasShoot: boolean
  isSelected: boolean
  isToday: boolean
  onSelect: (iso: string) => void
}) {
  return (
    <Pressable
      className={`flex-1 items-center justify-center rounded-lg border active:opacity-70 ${
        shape === 'month' ? 'aspect-square gap-1' : 'gap-[5px] py-[9px]'
      } ${
        isSelected
          ? 'bg-primary border-primary'
          : isToday
            ? 'border-border-strong'
            : 'border-transparent'
      }`}
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
      <Text
        className={`${shape === 'month' ? 'text-body-sm' : 'text-subtitle'} ${
          isSelected
            ? 'text-primary-foreground font-semibold'
            : `${hasShoot ? 'text-foreground' : 'text-muted-foreground'} ${
                isToday ? 'font-semibold' : ''
              }`
        }`}
      >
        {day}
      </Text>
      <Dot state={isSelected ? 'onFill' : hasShoot ? 'marked' : 'none'} />
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
 *
 * `onFill` is the selected cell — the dot has to invert there or it disappears
 * into the `primary` fill it sits on.
 */
function Dot({ state }: { state: 'onFill' | 'marked' | 'none' }) {
  return (
    <View
      className={`h-1 w-1 rounded-full ${
        state === 'onFill'
          ? 'bg-primary-foreground'
          : state === 'marked'
            ? 'bg-muted-foreground'
            : 'bg-transparent'
      }`}
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
