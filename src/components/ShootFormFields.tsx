import { Pressable, View } from 'react-native'
import { MonthPicker } from './MonthPicker'
import { Input } from './ui/input'
import { Text } from './ui/text'
import { Textarea } from './ui/textarea'
import { useStrings } from '../i18n/LanguageProvider'
import { formatDayMonth, formatMinutes, toIsoDate } from '../features/shoots/date'
import { selected as tickSelection, tapped } from '../lib/haptics'
import type { Shoot } from '../features/shoots/api'

/**
 * The fields the create and edit shoot forms share.
 *
 * Extracted 2026-08-30, when the owner asked for «Дата й час» and «Локація» to
 * be the same on both. They are the same by construction now rather than by two
 * files being kept in step — which is the only version of "the same" that
 * survives the next change to either.
 *
 * `New Shoot.dc.html`, second pass (owner, 2026-09-03).
 */

/** The grid's step, and so the smallest range it can express. */
const STEP_MINUTES = 60
const MINUTES_IN_DAY = 24 * 60
/** 00:00 … 23:00, six to a row, as drawn. */
const SLOTS = Array.from({ length: MINUTES_IN_DAY / STEP_MINUTES }, (_, i) => i * STEP_MINUTES)
const COLUMNS = 6

function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60) % 24
  return `${String(hours).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * «Дата й час» — the month grid, the time range, the summary, and any clash
 * with another shoot that day.
 *
 * ── The time control was replaced on 2026-09-03 ──────────────────────────────
 *
 * It was variant **2b** of `Time Picker Options.dc.html` (owner, 2026-08-30): a
 * horizontal rail of half-hour slots, «Інший час» for the platform picker, and
 * a ± duration stepper with the end DERIVED. `New Shoot.dc.html` now embeds a
 * **range grid** instead — tap the start, tap the end — and the owner took it
 * as drawn, hourly, on 2026-09-03.
 *
 * Three things follow from that, and all three are deliberate:
 *
 * - **The end is entered, not derived.** `US-030` AC-5 always stored both; what
 *   changed is that a shoot can once again be missing one, so the callers
 *   validate for it. That reinstates a refusal 2b had removed.
 * - **Half-hour starts are no longer expressible.** The artboard's step is 60
 *   and it was taken as drawn. A shoot already stored at 09:30 keeps its value —
 *   nothing rounds it — and the summary line reports the truth, but the grid
 *   cannot highlight a cell that does not exist, so its highlight begins at the
 *   next full hour. Any tap replaces the pair with hours.
 * - **A range may end at midnight.** 23:00 + a step is 24:00, stored as
 *   `00:00`, which is an end before its start. `US-030` AC-3 is unwritten
 *   (02-product/open-questions.md item 14), so nothing forbids it; the highlight
 *   normalises it back to 1440 rather than collapsing (see `endMinutes`).
 */
export function ShootWhenFields({
  date,
  onDateChange,
  dateInvalid,
  allowPastDates = false,
  start,
  end,
  onRangeChange,
  timeInvalid,
  clashes,
}: {
  date: Date | null
  onDateChange: (date: Date) => void
  dateInvalid: boolean
  allowPastDates?: boolean
  /** Both nullable: `US-030` AC-6 allows a shoot created before that story. */
  start: string | null
  end: string | null
  /** Reported as a pair, because one tap can move both. */
  onRangeChange: (start: string | null, end: string | null) => void
  timeInvalid: boolean
  /** Other shoots on the same day whose range overlaps this one. */
  clashes: Shoot[]
}) {
  const t = useStrings()

  const from = start ? toMinutes(start) : null
  const rawEnd = end ? toMinutes(end) : null
  /*
    An end at or before the start means the range crosses midnight — the only
    way to reach that here is the last slot, whose end is 24:00 stored as
    `00:00`. Adding a day back makes the highlight and the duration read
    correctly instead of the range appearing empty.
  */
  const endMinutes =
    rawEnd !== null && from !== null && rawEnd <= from ? rawEnd + MINUTES_IN_DAY : rawEnd

  /*
    The artboard's own `rangePicker`, verbatim in behaviour: a complete range
    starts a new one, tapping the anchor makes a single step, and tapping before
    the anchor moves the start and ends where the anchor was.
  */
  const pick = (slot: number) => {
    if (from === null || endMinutes !== null) return onRangeChange(minutesToTime(slot), null)
    if (slot === from) return onRangeChange(start, minutesToTime(slot + STEP_MINUTES))
    if (slot < from) return onRangeChange(minutesToTime(slot), minutesToTime(from + STEP_MINUTES))
    return onRangeChange(start, minutesToTime(slot + STEP_MINUTES))
  }

  const hint =
    from === null
      ? t.timeHintPickStart
      : endMinutes === null
        ? t.timeHintPickEnd
        : formatMinutes(endMinutes - from, { hours: t.hoursShort, minutes: t.minutesShort })

  const range =
    start && end ? `${start} – ${end}` : start ? `${start} – …` : '—'

  const rows: number[][] = []
  for (let i = 0; i < SLOTS.length; i += COLUMNS) rows.push(SLOTS.slice(i, i + COLUMNS))

  return (
    <View className="gap-3">
      <SectionLabel label={t.dateAndTime} />

      <MonthPicker
        value={date}
        invalid={dateInvalid}
        allowPast={allowPastDates}
        onChange={onDateChange}
      />
      {dateInvalid ? <Text className="text-destructive text-sm">{t.pickDateError}</Text> : null}

      <View>
        <View className="mb-[7px] flex-row items-baseline justify-between">
          <FieldLabel label={t.timeSection} />
          {/* «Скинути» — new with the range grid: a half-made range needs a way
              out that is not "tap something else and start again". */}
          <Pressable
            hitSlop={8}
            onPress={() => {
              tapped()
              onRangeChange(null, null)
            }}
            role="button"
          >
            <Text className="text-label text-foreground font-medium">{t.resetTime}</Text>
          </Pressable>
        </View>

        {/* «Торкніться початку» → «Тепер — кінця» → «3 год». The control has
            three states and says which one it is in. */}
        <Text className="text-label text-muted-foreground mb-2">{hint}</Text>

        <View className="gap-[5px]">
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row gap-[5px]">
              {row.map((slot) => (
                <TimeCell
                  key={slot}
                  label={minutesToTime(slot)}
                  active={isInRange(slot, from, endMinutes)}
                  onPress={() => pick(slot)}
                />
              ))}
            </View>
          ))}
        </View>

        {timeInvalid ? (
          <Text className="text-destructive mt-2 text-sm">{t.pickTimeError}</Text>
        ) : null}
      </View>

      {/* The summary bar: what was chosen, in one line. */}
      <View className="bg-secondary border-border flex-row items-center gap-2.5 rounded-lg border px-3.5 py-3">
        <Text className="text-body-sm text-muted-foreground flex-1" numberOfLines={1}>
          {whenSummary(date, t)}
        </Text>
        <Text className="text-body-sm text-foreground font-semibold">{range}</Text>
      </View>

      {/*
        The clash warning (owner, 2026-08-30). **A warning, never a block** — two
        shoots can genuinely overlap, and nothing in the backlog says otherwise.
        `US-031`'s marker on the calendar catches a tight turnaround after the
        fact; this catches a real double-booking before it is saved.
      */}
      {clashes.map((clash) => (
        <Text key={clash.id} className="text-label text-destructive">
          {t.overlapTemplate
            .replace('{name}', clash.clientName)
            .replace('{range}', `${clash.startTime} – ${clash.endTime}`)}
        </Text>
      ))}
    </View>
  )
}

/**
 * Whether a slot falls inside the chosen range, or IS the anchor of a range
 * that has no end yet — which is what makes a half-made selection visible.
 */
function isInRange(slot: number, from: number | null, to: number | null): boolean {
  if (from === null) return false
  if (to === null) return slot === from
  return slot >= from && slot < to
}

/**
 * «Сьогодні, 19 вересня» — the left half of the summary bar.
 *
 * The artboard names today and tomorrow rather than repeating a date the reader
 * just tapped. `todayWord` / `tomorrowWord` already existed for the home screen.
 */
function whenSummary(date: Date | null, t: ReturnType<typeof useStrings>): string {
  if (!date) return t.noDatePicked

  const iso = toIsoDate(date)
  const label = formatDayMonth(iso, t.monthsGenitive)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (iso === toIsoDate(today)) return `${t.todayWord}, ${label}`
  if (iso === toIsoDate(tomorrow)) return `${t.tomorrowWord}, ${label}`
  return label
}

/**
 * «Локація» — «Назва», «Адреса», «Деталі».
 *
 * **It was one field until 2026-09-03**, whose placeholder was «Назва або
 * адреса» — the conflation the artboard's second pass splits. `location_name`
 * is new (migration 20260903120000); `location_note` is not, and only its label
 * moved: it was «Нотатки (як доїхати тощо)» on the edit screen and is «Деталі»
 * on both now.
 *
 * Shared, like `ShootWhenFields`, so the two forms cannot drift. The edit screen
 * renders its `US-018` attachment controls after this block, which is the one
 * part of «Локація» that is not common to both.
 */
export function ShootLocationFields({
  name,
  onNameChange,
  address,
  onAddressChange,
  details,
  onDetailsChange,
  chips,
}: {
  name: string
  onNameChange: (value: string) => void
  address: string
  onAddressChange: (value: string) => void
  details: string
  onDetailsChange: (value: string) => void
  /** Venue names already used, from `pastLocations`. */
  chips: string[]
}) {
  const t = useStrings()

  return (
    <View className="gap-3.5">
      <SectionLabel label={t.locationSection} />

      <View className="gap-2">
        <FieldLabel label={t.locationNameLabel} />
        <Input
          id="location-name"
          value={name}
          onChangeText={onNameChange}
          placeholder={t.locationNamePlaceholder}
        />
        {/* The chips fill the NAME now, which is the value they always held. */}
        <LocationChips places={chips} value={name} onPick={onNameChange} />
      </View>

      <View className="gap-2">
        <FieldLabel label={t.address} />
        {/* `id` kept from the edit screen's own field: `us018-check.mjs` drives
            `#address` and `#location-note`, and the ids cost nothing. */}
        <Input
          id="address"
          value={address}
          onChangeText={onAddressChange}
          placeholder={t.locationAddressPlaceholder}
        />
      </View>

      <View className="gap-2">
        <FieldLabel label={t.locationDetails} />
        <Textarea
          id="location-note"
          value={details}
          onChangeText={onDetailsChange}
          placeholder={t.locationDetailsPlaceholder}
          numberOfLines={3}
          className="min-h-20"
        />
      </View>
    </View>
  )
}

/**
 * Venue names the creator has used before, as one-tap chips under «Назва».
 *
 * There is no locations entity and this does not imply one: a chip fills the
 * text field, which writes a plain `location_name`.
 */
export function LocationChips({
  places,
  value,
  onPick,
}: {
  places: string[]
  value: string
  onPick: (place: string) => void
}) {
  if (places.length === 0) return null
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {places.map((place) => (
        <PickChip
          key={place}
          label={place}
          active={value.trim() === place}
          onPress={() => onPick(value.trim() === place ? '' : place)}
        />
      ))}
    </View>
  )
}

/** The design's 12/600 uppercase group label, letter-spacing 0.04em. */
export function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      className="text-label text-muted-foreground font-semibold uppercase"
      // RN letterSpacing is absolute, never em — 0.04em at 12px is 0.48.
      style={{ letterSpacing: 0.48 }}
    >
      {label}
    </Text>
  )
}

/** The design's 13/500 field label, above an input rather than beside it. */
export function FieldLabel({ label }: { label: string }) {
  return <Text className="text-body-sm text-foreground font-medium">{label}</Text>
}

/** One slot in the time grid: 44pt tall, so the row is a legal touch target. */
function TimeCell({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`h-11 flex-1 items-center justify-center rounded-lg border ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tickSelection()
        onPress()
      }}
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-label font-semibold ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function PickChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`min-h-[34px] justify-center rounded-lg border px-3 ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-body-sm font-medium ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}
