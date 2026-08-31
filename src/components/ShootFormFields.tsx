import { Pressable, ScrollView, View } from 'react-native'
import { MonthPicker } from './MonthPicker'
import { DateField } from './DateField'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { formatDayMonth, formatDuration, fromTimeValue, toIsoDate, toTimeValue } from '../features/shoots/date'
import { selected as tickSelection, tapped } from '../lib/haptics'
import type { Shoot } from '../features/shoots/api'

/**
 * The fields the create and edit shoot forms share.
 *
 * Extracted 2026-08-30, when the owner asked for «Дата й час», «Початок»,
 * «Тривалість» and «Локація» to be the same on both. They are the same by
 * construction now rather than by two files being kept in step — which is the
 * only version of "the same" that survives the next change to either.
 *
 * `New Shoot.dc.html`, variant **2b** of `Time Picker Options.dc.html`.
 */

/** Half-hour slots from 08:00 to 20:00 — the design's own range and step. */
export const HALF_HOURS = Array.from({ length: 25 }, (_, i) => minutesToTime(8 * 60 + i * 30))

export function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60) % 24
  return `${String(hours).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** The end of a shoot that starts at `start` and runs `minutes`. */
export function endOf(start: string, minutes: number): string {
  return minutesToTime(toMinutes(start) + minutes)
}

/**
 * The duration between two stored times, for opening the edit form on a shoot
 * that already has both.
 *
 * Falls back to the default when the pair is missing or inverted. An inverted
 * pair is reachable: `US-030` AC-3 is unwritten, so nothing has ever stopped an
 * end being saved before its start (02-product/open-questions.md item 14).
 */
export function durationBetween(
  start: string | null,
  end: string | null,
  fallback: number
): number {
  if (!start || !end) return fallback
  const span = toMinutes(end) - toMinutes(start)
  return span > 0 ? span : fallback
}

/**
 * One hour.
 *
 * The owner's default (2026-08-30), where `New Shoot.dc.html` opens on three —
 * which is what its fixture shoots happen to run. An hour is the smaller
 * assumption to make on the reader's behalf: a duration that is too short is
 * easier to notice than one that quietly saved as three hours.
 */
export const DEFAULT_DURATION_MINUTES = 60

/**
 * «Дата й час» — the month grid, the start, the duration, the summary, and any
 * clash with another shoot that day.
 *
 * `start` is nullable because `US-030` AC-6 allows a shoot created before that
 * story to have neither time. The rail then shows nothing selected and the
 * caller blocks its save, which is what "the next edit collects them" means —
 * rather than a default quietly filling a field nobody chose.
 */
export function ShootWhenFields({
  date,
  onDateChange,
  dateInvalid,
  allowPastDates = false,
  start,
  onStartChange,
  startInvalid,
  exactOpen,
  onToggleExact,
  durationMinutes,
  onDurationChange,
  clashes,
}: {
  date: Date | null
  onDateChange: (date: Date) => void
  dateInvalid: boolean
  allowPastDates?: boolean
  start: string | null
  onStartChange: (start: string) => void
  startInvalid: boolean
  exactOpen: boolean
  onToggleExact: () => void
  durationMinutes: number
  onDurationChange: (minutes: number) => void
  /** Other shoots on the same day whose range overlaps this one. */
  clashes: Shoot[]
}) {
  const t = useStrings()

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

      <View className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-body-sm text-foreground font-medium">{t.timeStart}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              tapped()
              onToggleExact()
            }}
            role="button"
          >
            {/* The label names where the tap LEADS, not where you are. */}
            <Text className="text-label text-foreground font-medium">
              {exactOpen ? t.fromRail : t.otherTime}
            </Text>
          </Pressable>
        </View>

        {exactOpen ? (
          /*
            The platform picker, through the app's own `DateField`.
            `New Shoot.dc.html` uses `<input type="time">`, which does not exist
            in React Native — this is its equivalent, and what every other time
            in the app already uses.
          */
          <DateField
            mode="time"
            value={start ? fromTimeValue(start) : null}
            onChange={(value) => value && onStartChange(toTimeValue(value))}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {HALF_HOURS.map((slot) => (
              <TimeSlot
                key={slot}
                time={slot}
                active={slot === start}
                onPress={() => onStartChange(slot)}
              />
            ))}
          </ScrollView>
        )}
        {startInvalid ? (
          <Text className="text-destructive text-sm">{t.startTimeRequired}</Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="text-body-sm text-foreground font-medium">{t.duration}</Text>
        <View className="flex-row items-center gap-2.5">
          <StepperButton
            label="−"
            onPress={() => onDurationChange(Math.max(30, durationMinutes - 30))}
          />
          <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
            {formatDuration('00:00', minutesToTime(durationMinutes), {
              hours: t.hoursShort,
              minutes: t.minutesShort,
            }) ?? '—'}
          </Text>
          <StepperButton
            label="+"
            onPress={() => onDurationChange(Math.min(720, durationMinutes + 30))}
          />
        </View>
      </View>

      {/* The summary bar: what was chosen, in one line. */}
      <View className="bg-secondary border-border flex-row items-center gap-2.5 rounded-lg border px-3.5 py-3">
        <Text className="text-body-sm text-muted-foreground flex-1" numberOfLines={1}>
          {date ? formatDayMonth(toIsoDate(date), t.monthsGenitive) : t.noDatePicked}
        </Text>
        <Text className="text-body-sm text-foreground font-semibold">
          {date && start ? `${start} – ${endOf(start, durationMinutes)}` : '—'}
        </Text>
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
 * Places the creator has shot at before, as one-tap chips under the location
 * field.
 *
 * There is no locations entity and this does not imply one: a chip fills the
 * text field, which still writes a plain `location_address`.
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

function TimeSlot({
  time,
  active,
  onPress,
}: {
  time: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`h-11 min-w-[60px] items-center justify-center rounded-lg border px-2 ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tickSelection()
        onPress()
      }}
      role="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-body-sm font-semibold ${
          active ? 'text-primary-foreground' : 'text-foreground'
        }`}
      >
        {time}
      </Text>
    </Pressable>
  )
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      className="border-border-strong active:bg-secondary h-11 w-11 items-center justify-center rounded-lg border"
      onPress={() => {
        tickSelection()
        onPress()
      }}
      role="button"
      accessibilityLabel={label}
    >
      <Text className="text-title-sm text-foreground font-semibold">{label}</Text>
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
