import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Separator } from '../../src/components/ui/separator'
import { Text } from '../../src/components/ui/text'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { listShoots, type Shoot } from '../../src/features/shoots/api'
import { listCrewShoots, type CrewShoot } from '../../src/features/shoots/crewSchedule'
import { StatusPill } from '../../src/components/StatusPill'
import { formatTimeRange } from '../../src/features/shoots/date'
import { ShootCalendar } from '../../src/components/ShootCalendar'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoots: Shoot[]; crewShoots: CrewShoot[] }

/**
 * One row, two provenances (`US-009`).
 *
 * A shoot you created and a shoot you were added to are different things —
 * different permissions, different destinations when tapped, different fields
 * available — so they are different variants rather than one type with nullable
 * halves. The list shows them together because a commitment is a commitment.
 */
type Row =
  | { kind: 'created'; date: string; shoot: Shoot }
  | { kind: 'crew'; date: string; entry: CrewShoot }

/**
 * The shoot creator's home view (US-004).
 *
 * AC-1 — every shoot, ordered by date, with a calendar below the "new shoot"
 * button marking the dates that have one. The ordering is the query's
 * (`listShoots` orders ascending), not this screen's.
 *
 * AC-2 — with no shoots, an empty state and an unmarked calendar. Both render;
 * neither is an error and neither is a blank screen. The calendar deliberately
 * stays visible when the list is empty, which is what AC-2 describes.
 *
 * AC-3/AC-4 — the calendar moves between months, and tapping a date filters the
 * list to it. The filter is screen state over the shoots already loaded: no
 * refetch, no query change. Selecting a date is therefore instant and works the
 * same offline as on, and moving months does not disturb the selection.
 *
 * There are now two different empty lists, and they must not share copy:
 * AC-2's «У вас ще немає зйомок.» means this account has no shoots at all,
 * while AC-4's «На цю дату зйомок немає.» means only that this date is free.
 * Showing the first when a date is simply empty would tell the photographer
 * their shoots had vanished.
 *
 * Refetches on focus so returning from the creation form shows the new shoot
 * without a manual refresh.
 */
export default function ShootListScreen() {
  const t = useStrings()
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })
  // AC-4 — the date being filtered to, or null for the whole list.
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        // Both in parallel: one is not a fallback for the other, and a user can
        // have shoots of both kinds.
        const [shoots, crewShoots] = await Promise.all([listShoots(), listCrewShoots()])
        if (!active) return
        // `listCrewShoots` returning null is an error like any other. It is not
        // treated as "no commitments", which would quietly show a crew member
        // an empty schedule and tell them nothing was wrong.
        setState(
          shoots && crewShoots
            ? { status: 'loaded', shoots, crewShoots }
            : { status: 'error' }
        )
      })()
      return () => {
        active = false
      }
    }, [])
  )

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <Button onPress={() => router.push('/(app)/new-shoot')}>
          <Text>{t.newShoot}</Text>
        </Button>

        {/*
          AC-1 places the calendar below the "new shoot" button, as the
          prototype does. It is fed the loaded shoots' dates, so during loading
          and after an error it renders unmarked rather than disappearing —
          the chrome should not move under the reader.
        */}
        {/*
          US-009 — the calendar marks BOTH kinds. A crew member's commitments
          are the whole reason they would open this screen, and a calendar that
          ignored them would show an empty month to someone booked all week.
        */}
        <ShootCalendar
          shootDates={state.status === 'loaded' ? rows(state.shoots, state.crewShoots).map((r) => r.date) : []}
          selected={selectedDate}
          // Tapping the selected date again clears it. The visible control
          // below is the documented way back (AC-4); this is just the gesture
          // people try anyway, and it costs nothing to honour.
          onSelect={(iso) => setSelectedDate((current) => (current === iso ? null : iso))}
        />

        {selectedDate ? (
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-medium">{formatDayLabel(selectedDate, t.monthsGenitive)}</Text>
            <Button variant="secondary" size="sm" onPress={() => setSelectedDate(null)}>
              <Text>{t.allShoots}</Text>
            </Button>
          </View>
        ) : null}

        {state.status === 'loading' ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
          </View>
        ) : state.status === 'error' ? (
          <Text className="text-muted-foreground">{t.somethingWentWrong}</Text>
        ) : rows(state.shoots, state.crewShoots).length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text variant="h4">{t.emptyShoots}</Text>
            <Text className="text-muted-foreground">{t.emptyShootsSub}</Text>
            {/* The prototype's empty state offers the action directly. */}
            <Button className="mt-2" onPress={() => router.push('/(app)/new-shoot')}>
              <Text>{t.createFirst}</Text>
            </Button>
          </View>
        ) : visible(rows(state.shoots, state.crewShoots), selectedDate).length === 0 ? (
          // AC-4 — the account has shoots, this date has none. A result, not
          // the AC-2 empty state and not an error.
          <View className="items-center py-8">
            <Text className="text-muted-foreground">{t.noShootsOnDay}</Text>
          </View>
        ) : (
          /*
            The previous UI layer's grouped-list components have no RNR
            counterpart, so the list is composed here: a bordered, clipped
            container, a Separator between rows, and each row a
            title/subtitle/trailing layout. Same shape, same content — the kit
            is thinner, not the screen.
          */
          <View className="border-border overflow-hidden rounded-lg border">
            {visible(rows(state.shoots, state.crewShoots), selectedDate).map((row, index) => (
              <View key={row.kind === 'created' ? row.shoot.id : `crew-${row.entry.shootId}`}>
                {index > 0 ? <Separator /> : null}
                {row.kind === 'created' ? (
                  <Link href={`/(app)/shoot/${row.shoot.id}`} asChild>
                    <Pressable className="active:bg-secondary flex-row items-center gap-3 px-4 py-3">
                      <View className="flex-1 gap-0.5">
                        <Text className="font-medium">{row.shoot.clientName}</Text>
                        {/* US-030 AC-4 — same composition as the detail screen;
                            the calendar's day view is this list, filtered. */}
                        <Text className="text-muted-foreground text-sm">
                          {[
                            row.shoot.date,
                            formatTimeRange(row.shoot.startTime, row.shoot.endTime),
                            row.shoot.locationAddress,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      <StatusPill value={row.shoot.status} />
                    </Pressable>
                  </Link>
                ) : (
                  <CrewRow entry={row.entry} badge={t.crewShootBadge} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

/**
 * `US-009` — the two sources as one dated list.
 *
 * Sorted by date across both, so a shoot someone booked you for sits between
 * two of your own rather than after them. Ties keep created shoots first, which
 * is arbitrary but stable — the alternative is rows that reorder between
 * renders.
 */
function rows(shoots: Shoot[], crewShoots: CrewShoot[]): Row[] {
  const created: Row[] = shoots.map((shoot) => ({ kind: 'created', date: shoot.date, shoot }))
  const crewed: Row[] = crewShoots.map((entry) => ({ kind: 'crew', date: entry.date, entry }))
  return [...created, ...crewed].sort((a, b) =>
    a.date === b.date ? (a.kind === b.kind ? 0 : a.kind === 'created' ? -1 : 1) : a.date < b.date ? -1 : 1
  )
}

/** AC-4 — the list narrowed to one date, or all of it when nothing is selected. */
function visible(all: Row[], selectedDate: string | null): Row[] {
  return selectedDate ? all.filter((row) => row.date === selectedDate) : all
}

/**
 * A shoot someone else booked you for (`US-009`).
 *
 * Deliberately shaped unlike a created row. There is no client name to lead
 * with — a crew member is not given one (`US-007`) — so the location leads and
 * the date falls to the subtitle beside the role, which is the answer to "why
 * am I on this?".
 *
 * It opens the reader's own link view rather than the creator's shoot screen.
 * That is not a shortcut: a crew member cannot read the shoot row at all, and
 * the link is the access they already have (`US-007`). With no link created
 * yet, the row is inert rather than broken — nothing has been shared with them.
 */
function CrewRow({ entry, badge }: { entry: CrewShoot; badge: string }) {
  const body = (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="flex-1 gap-0.5">
        <Text className="font-medium">{entry.locationAddress ?? entry.date}</Text>
        <Text className="text-muted-foreground text-sm">
          {entry.locationAddress ? `${entry.date} · ${entry.role}` : entry.role}
        </Text>
      </View>
      <View className="border-border bg-secondary rounded-full border px-2.5 py-1">
        <Text className="text-muted-foreground text-xs font-bold">{badge}</Text>
      </View>
    </View>
  )

  if (!entry.token) return body
  return (
    <Link href={`/s/${entry.token}`} asChild>
      <Pressable className="active:bg-secondary">{body}</Pressable>
    </Link>
  )
}

/**
 * «7 серпня» — day then month in the genitive, which is how a date is named in
 * Ukrainian. Built from the ISO parts rather than a Date, so no timezone can
 * shift the day between the row and its label.
 */
function formatDayLabel(isoDate: string, monthsGenitive: readonly string[]): string {
  const [, month, day] = isoDate.split('-')
  return `${Number(day)} ${monthsGenitive[Number(month) - 1]}`
}
