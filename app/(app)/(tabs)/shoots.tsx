import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import { Button } from '../../../src/components/ui/button'
import { Icon } from '../../../src/components/ui/icon'
import { Tabs } from '../../../src/components/ui/tabs'
import { Text } from '../../../src/components/ui/text'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { roleWithEmoji } from '../../../src/i18n/uk'
import { formatDayMonth, toIsoDate } from '../../../src/features/shoots/date'
import { plural } from '../../../src/features/shoots/home'
import { deleteShoot, listShoots, type Shoot } from '../../../src/features/shoots/api'
import { listCrewShoots, type CrewShoot } from '../../../src/features/shoots/crewSchedule'
import { listCrewNamesForShoots } from '../../../src/features/crew/api'
import { Avatar } from '../../../src/components/Avatar'
import { failed, tapped } from '../../../src/lib/haptics'
import { useDestructiveConfirm } from '../../../src/components/DestructiveAction'
import { SwipeDismissBoundary, SwipeToDelete } from '../../../src/components/SwipeToDelete'
import { StatusPill } from '../../../src/components/StatusPill'
import { Card } from '../../../src/components/ui/card'
import {
  ShootCalendar,
  startOfWeek,
  type CalendarMode,
} from '../../../src/components/ShootCalendar'
import { Starfield } from '../../../src/components/Starfield'
import { TabHeader } from '../../../src/components/TabHeader'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded'
      shoots: Shoot[]
      crewShoots: CrewShoot[]
      /** Crew names per shoot id, for the rows' avatar stacks. */
      crewNames: Record<string, string[]>
    }

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
 * while AC-4's «Немає зйомок на цю дату» means only that this date is free.
 * Showing the first when a date is simply empty would tell the photographer
 * their shoots had vanished.
 *
 * Refetches on focus so returning from the creation form shows the new shoot
 * without a manual refresh.
 *
 * **This lives at `/(app)/shoots`, not at the index.** `US-035` put the home
 * screen there, and this is reached from its «Переглянути календар» action.
 */
export default function ShootListScreen() {
  const t = useStrings()
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })
  // AC-4 — the date being filtered to, or null for the whole list.
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  /*
    Bumped after a swipe-delete. This screen is focused when the row goes, so
    `useFocusEffect` would not refetch on its own — and the calendar's dots are
    derived from the same list, so a deleted shoot would otherwise keep its mark
    on the grid above the row that has already disappeared.
  */
  const [reloadKey, setReloadKey] = useState(0)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        // Both in parallel: one is not a fallback for the other, and a user can
        // have shoots of both kinds.
        const [shoots, crewShoots] = await Promise.all([listShoots(), listCrewShoots()])
        if (!active) return
        // ADR-017's rows show a stack of crew initials. One query for every
        // shoot on screen rather than one per row — and a failure here is not
        // fatal: the avatars are decoration, so an empty map draws rows without
        // them rather than failing a screen that is otherwise fine.
        const crewNames = shoots ? ((await listCrewNamesForShoots(shoots.map((x) => x.id))) ?? {}) : {}
        if (!active) return
        // `listCrewShoots` returning null is an error like any other. It is not
        // treated as "no commitments", which would quietly show a crew member
        // an empty schedule and tell them nothing was wrong.
        setState(
          shoots && crewShoots
            ? { status: 'loaded', shoots, crewShoots, crewNames }
            : { status: 'error' }
        )
      })()
      return () => {
        active = false
      }
    }, [reloadKey])
  )

  /*
    `US-019`, reached by swiping a row (`SwipeToDelete`). The same hook the home
    screen and the shoot detail use — AC-2's confirmation is required, and
    having one implementation of it is why `useDestructiveConfirm` was extracted
    in the first place.

    **Created rows only.** `US-009`'s crew rows are somebody else's shoot; they
    are not wrapped, so there is nothing to swipe on them.
  */
  const { ask: askDelete, dialog: deleteDialog } = useDestructiveConfirm<Shoot>({
    label: t.deleteShoot,
    question: t.confirmDeleteShoot,
    onConfirm: (shoot) => {
      void (async () => {
        // No message on failure, for the reasons the home screen's copy of this
        // handler records: nothing supplies one, and the boolean does not say
        // why. The row stays where it is, which keeps the screen true.
        if (!(await deleteShoot(shoot.id))) {
          failed()
          return
        }
        setState((current) =>
          current.status === 'loaded'
            ? { ...current, shoots: current.shoots.filter((row) => row.id !== shoot.id) }
            : current
        )
        setReloadKey((key) => key + 1)
      })()
    },
  })

  /*
    The calendar's position and grid, lifted out of `ShootCalendar` on
    2026-08-30. The header's meta line and its «Сьогодні» button both read them,
    and neither could reach state the card owned privately.
  */
  const [mode, setMode] = useState<CalendarMode>('month')
  const [focus, setFocus] = useState<Date>(() => new Date())

  /*
    US-041 AC-11 — the evening digest opens this screen with tomorrow selected,
    as `?date=YYYY-MM-DD`. Applied once and then cleared, so tapping the next
    digest for the same day applies it again instead of matching a stale value.
    The month follows the date, or a digest on the 31st would select a day on a
    grid that is not showing it.
  */
  const params = useLocalSearchParams<{ date?: string }>()
  useEffect(() => {
    const date = params.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const [year, month, day] = date.split('-').map(Number)
    setSelectedDate(date)
    setFocus(new Date(year, month - 1, day))
    router.setParams({ date: undefined })
  }, [params.date, router])

  const all = state.status === 'loaded' ? rows(state.shoots, state.crewShoots) : []
  const inPeriod = all.filter((row) => withinPeriod(row.date, mode, focus))
  const shown = visible(all, selectedDate, toIsoDate(new Date()))

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      {/* An open row closes on a tap anywhere but its «Видалити» — see
          `SwipeDismissBoundary`. The pinned CTA is inside it, so the first tap
          there dismisses rather than opening the new-shoot screen. */}
      <SwipeDismissBoundary>
        {/*
          The screen's own header (2026-08-30). It carries a meta line under the
          title and a «Сьогодні» control on the right, neither of which a native
          header can hold — the same reason the shoot's screens draw theirs.
        */}
        <CalendarHeader
          meta={`${mode === 'month' ? t.months[focus.getMonth()] : t.calModeWeek} · ${
            inPeriod.length
          } ${plural(inPeriod.length, t.shootCountForms)}`}
        />

        {/*
          91, from `Calendar.dc.html`'s `padding:0 0 166px` less the 75px bottom
          bar the navigator now reserves. It clears the pinned CTA below (68px)
          with the artboard's own breathing room left over.
        */}
        <ScrollView contentContainerStyle={{ paddingBottom: 91 }}>
          <View className="gap-3 px-4 pt-3">
            {/*
              The mode switch, now ABOVE the card and drawn by the shared `Tabs`
              rather than this screen's own segmented control — one control, one
              implementation, as on the shoot detail and the add-crew screens.
            */}
            <Tabs
              items={[
                { value: 'month', label: t.calModeMonth },
                { value: 'week', label: t.calModeWeek },
              ]}
              value={mode}
              onChange={setMode}
            />

            {/*
              AC-1 places the calendar first. It is fed the loaded shoots' dates,
              so during loading and after an error it renders unmarked rather than
              disappearing — the chrome should not move under the reader.

              US-009 — the calendar marks BOTH kinds. A crew member's commitments
              are the whole reason they would open this screen, and a calendar that
              ignored them would show an empty month to someone booked all week.
            */}
            <ShootCalendar
              shootDates={all.map((r) => r.date)}
              selected={selectedDate}
              mode={mode}
              focus={focus}
              onFocusChange={setFocus}
              // Tapping the selected date again clears it. The visible control
              // below is the documented way back (AC-4); this is just the gesture
              // people try anyway, and it costs nothing to honour.
              onSelect={(iso) => setSelectedDate((current) => (current === iso ? null : iso))}
            />

            {/*
              AC-4's way back to the full list. A full-width bar on `secondary`
              now, as drawn — it was a small pill floating at the left, which read
              as a tag rather than as something to dismiss.
            */}
            {selectedDate ? (
              <View className="bg-secondary border-border flex-row items-center gap-2.5 rounded-lg border px-3 py-2.5">
                <Text className="text-body-sm text-foreground flex-1 font-medium">
                  {`${t.shootsWord} · ${formatDayMonth(selectedDate, t.monthsGenitive)}`}
                </Text>
                {/*
                  A bare ✕ (2026-09-03). The artboard draws the glyph alone and
                  puts «Показати всі» in `aria-label` — so the words are still
                  there for a screen reader, which is the only reader that needed
                  them beside a row already headed «Зйомки · 19 вересня».
                */}
                <Pressable
                  onPress={() => {
                    tapped()
                    setSelectedDate(null)
                  }}
                  hitSlop={12}
                  role="button"
                  accessibilityLabel={t.showAllShoots}
                >
                  <Text className="text-label text-muted-foreground px-1 font-medium">✕</Text>
                </Pressable>
              </View>
            ) : null}

            {state.status === 'loading' ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" />
              </View>
            ) : state.status === 'error' ? (
              <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
            ) : shown.length === 0 ? (
              /*
                One empty card, three sentences — the handoff collapses what were
                two separate states here (an account with no shoots at all, and a
                period or date with none) into one box whose text names the case.

                `US-004` AC-2's «У вас ще немає зйомок» survives as the first of
                them, so the story's own empty state is still what an empty account
                sees.
              */
              /*
                Text only since 2026-09-03. It carried an outline «+ Нова зйомка»
                button, which the artboard's empty card does not — and the pinned
                CTA sits a few pixels below it, so the card was offering the same
                action twice.
              */
              <Card variant="flat" className="items-center px-4 py-7">
                <Text className="text-body-sm text-muted-foreground text-center">
                  {/*
                    The last two read «На цьому тижні…» / «У цьому місяці…», and
                    the list has never been scoped to the calendar's period —
                    `inPeriod` feeds the header's meta line and nothing else. So
                    they were already approximate, and since the list starts at
                    today they are wrong in a new way: an account whose every
                    shoot is in the past now falls to «У цьому місяці ще немає
                    зйомок» when what is true is that nothing is ahead.

                    Left as they are rather than invented over: «Попереду зйомок
                    немає» is the sentence this wants and it is not the owner's.
                    Recorded in docs/redesign-log.md.
                  */}
                  {all.length === 0
                    ? t.emptyShoots
                    : selectedDate
                      ? t.noShootsOnDay
                      : mode === 'week'
                        ? t.emptyWeek
                        : t.emptyMonth}
                </Text>
              </Card>
            ) : (
              /*
                The agenda: shoots grouped under a date heading, each row led by a
                stripe, then a time column, a hairline, and the body.

                Time-forward rather than name-forward, which is the whole point of
                this variant — the question a photographer opens this screen with
                is "what is today", not "who is Марія".
              */
              <Agenda
                groups={groupByDate(shown)}
                crewNames={state.status === 'loaded' ? state.crewNames : {}}
                monthsGenitive={t.monthsGenitive}
                onRequestDelete={askDelete}
                t={t}
              />
            )}
          </View>
        </ScrollView>

        {/*
          «+ Нова зйомка», pinned. It sat inline under the calendar card, which
          put the screen's one action halfway up a scrolling list; the handoff
          pins it, so it is reachable wherever the reader has scrolled to.

          **No bottom inset any more** (2026-09-04). The artboard puts this block
          at `bottom:74px` — directly on top of the bar — and the bar owns the safe
          area now, so the screen's own bottom edge is already clear of the home
          indicator. Adding `insets.bottom` here would push the CTA 34pt up into
          the list. `py-2.5` is the artboard's own `padding:10px`.
        */}
        <View className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 py-2.5">
          <Button variant="cta" size="cta" onPress={() => router.push('/(app)/new-shoot')}>
            <Text className="text-subtitle font-semibold">{`+ ${t.newShootTitle}`}</Text>
          </Button>
        </View>
      </SwipeDismissBoundary>

      {deleteDialog}
    </View>
  )
}

/**
 * The calendar's header — now the shared `TabHeader` (owner, 2026-09-07).
 *
 * Kept as a named wrapper rather than inlined, because the screen renders it in
 * two branches and the meta line is the only thing that differs.
 *
 * ── Two controls this header has shed, and the reasoning for each ───────────
 *
 * **«Сьогодні» went on 2026-09-05** (owner) and stays gone (owner, 2026-09-07,
 * asked again). It was added on 2026-08-30 so that a screen whose whole subject
 * is dates could jump back to the current one rather than only walk there with
 * the arrows — and that still describes what was lost: a reader who has paged
 * to next March walks home. The meta line beside the title names where they
 * are, which is what keeps that navigable rather than disorienting.
 *
 * **The back chevron went on 2026-09-07**, with «Мої контакти»'s «Головна» and
 * for the same reason: `Calendar.dc.html` no longer draws one. It was kept on
 * 2026-09-04 because the artboard then drew it — with no handler, so where it
 * went was ours — and a sideways route to a tab already one tap away was the
 * weakest reading of a drawing that has since changed its mind.
 */
function CalendarHeader({ meta }: { meta: string }) {
  const t = useStrings()

  return <TabHeader title={t.calendarTitle} meta={meta} />
}

/** Whether a date falls in the month, or the week, currently on screen. */
function withinPeriod(isoDate: string, mode: CalendarMode, focus: Date): boolean {
  if (mode === 'month') {
    const [year, month] = isoDate.split('-').map(Number)
    return year === focus.getFullYear() && month === focus.getMonth() + 1
  }
  const start = startOfWeek(focus)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return isoDate >= toIsoDate(start) && isoDate <= toIsoDate(end)
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

/**
 * `US-004` AC-4 — the list narrowed to one date, or **today onwards** when
 * nothing is selected.
 *
 * ── It was everything, oldest first, until 2026-09-06 ───────────────────────
 *
 * With no date selected this returned `all`, so the screen opened on the
 * earliest shoot on record and the reader scrolled through their whole history
 * to reach anything upcoming. Fine at ten shoots and unusable at two hundred,
 * with the useful end at the far end.
 *
 * **From today 00:00, not from now** (owner, 2026-09-06). A shoot that happened
 * this morning stays in the list: it is still today's, the reader was probably
 * at it, and a day that empties itself as it passes is a worse surprise than one
 * that keeps what has been. That is deliberately NOT the rule the home screen's
 * «Найближча зйомка» uses — that card names one shoot and answers "what is
 * next", where this is a day's agenda and answers "what is on".
 *
 * **Selecting a date still reaches the past.** Tapping a day in the calendar
 * filters to it whatever its date, so history stays one tap away rather than
 * gone — which is also what makes the red dots on past days worth drawing.
 */
function visible(all: Row[], selectedDate: string | null, todayIso: string): Row[] {
  return selectedDate
    ? all.filter((row) => row.date === selectedDate)
    : all.filter((row) => row.date >= todayIso)
}

/**
 * A shoot someone else booked you for (`US-009`).
 *
 * Deliberately shaped unlike a created row. There is no client name to lead
 * with — a crew member is not given one (`US-007`) — so the location leads and
 * the date falls to the subtitle beside the role, which is the answer to "why
 * am I on this?".
 *
 * It opens `/(app)/crew/{shootId}` — the crew view of the shoot, not the
 * creator's screen. That is not a shortcut: a crew member cannot read the shoot
 * row at all (`shoots_select_own`), so what they get is the payload the link
 * gateway builds for their audience, which is the same one `US-007` gives them
 * through a link.
 *
 * ── It was inert without a shared link, until 2026-09-21 ────────────────────
 *
 * The row used to open `/s/{token}` and carried no link at all when the
 * photographer had never tapped «копіювати посилання» for that person — a
 * commitment on your calendar that did nothing when tapped, and no way to
 * answer `US-008` either. The photographer's tap is no longer a precondition:
 * the reader's own session resolves the shoot, so every row on this list opens.
 */
function CrewRow({ entry, badge }: { entry: CrewShoot; badge: string }) {
  const body = (
    /*
      The same card as AgendaRow, which it interleaves with in one list — a
      different surface between the shoot rows would read as a rendering fault
      rather than as a distinction. No mockup covers this row at all: `US-009`'s
      commitments are the app's own addition.

      The `row` variant supplies the fill, the border and — since 2026-09-03 —
      the radius: the 14px override is gone, because `AgendaRow` beside it is 12
      and the artboard draws one radius for every row in this list. Text takes
      Card's `card-foreground` context, so it needs nothing.
    */
    <Card variant="row" className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-title-sm text-card-foreground font-semibold">
          {entry.locationAddress ?? entry.date}
        </Text>
        <Text className="text-label text-muted-foreground">
          {entry.locationAddress
            ? `${entry.date} · ${roleWithEmoji(entry.role)}`
            : roleWithEmoji(entry.role)}
        </Text>
      </View>
      {/* The badge stays borderless, like every other chip in the system
          (§5.3) — it is a label, not a control. */}
      <View className="bg-muted shrink-0 rounded-full px-2.5 py-1">
        <Text numberOfLines={1} className="text-caption text-muted-foreground font-bold">
          {badge}
        </Text>
      </View>
    </Card>
  )

  return (
    <Link href={`/(app)/crew/${entry.shootId}`} asChild>
      <Pressable onPress={tapped} className="active:opacity-70">
        {body}
      </Pressable>
    </Link>
  )
}

/**
 * Shoots grouped by date, newest group first in the order the query gave.
 *
 * `US-031`'s conflict warning is computed here rather than in the row: whether a
 * shoot follows too soon is a fact about its *neighbour*, so only the group
 * knows it.
 */
function Agenda({
  groups,
  crewNames,
  monthsGenitive,
  onRequestDelete,
  t,
}: {
  groups: { date: string; rows: Row[] }[]
  crewNames: Record<string, string[]>
  monthsGenitive: readonly string[]
  /** Raised by a row's swipe action — the screen's confirmation follows. */
  onRequestDelete: (shoot: Shoot) => void
  t: ReturnType<typeof useStrings>
}) {
  return (
    /*
      Spacing by `gap` since 2026-09-03, not by trailing margins on the rows.
      The artboard separates groups by 12px, puts 4px above a heading and 8px
      below it, and 8px between rows; the margin version added a row's bottom
      margin to the next group's top one, so the space between groups was 24px
      where it should be 16.
    */
    <View className="gap-3">
      {groups.map((group) => (
        <View key={group.date}>
          {/*
            §3.2's `overline`: uppercase, 700, with the letter-spacing given as
            an absolute value — RN's letterSpacing is not relative, so `.03em`
            at 13px has to be written as the 0.39px it works out to.
          */}
          <View className="mb-2 mt-1 flex-row items-baseline gap-2 px-0.5">
            {/* 12/600 uppercase at 0.04em — the handoff's section label, which
                every other screen now uses at the same values. «· сьогодні» is
                appended for the current day, as drawn. */}
            <Text
              className="text-label text-muted-foreground font-semibold uppercase"
              style={{ letterSpacing: 0.48 }}
            >
              {`${formatDayMonth(group.date, monthsGenitive)}${
                group.date === toIsoDate(new Date()) ? ` · ${t.todayWord.toLowerCase()}` : ''
              }`}
            </Text>
            {group.rows.length > 1 ? (
              /* `plural`, not the old fixed «зйомки за день» — that read wrong
                 from five upward («5 зйомки за день»). */
              <Text className="text-label text-muted-foreground/70">
                {`· ${group.rows.length} ${plural(group.rows.length, t.shootCountForms)} ${t.perDay}`}
              </Text>
            ) : null}
          </View>

          <View className="gap-2">
            {group.rows.map((row, index) =>
              row.kind === 'created' ? (
                /* Only these swipe. A crew row below is a shoot someone else
                   created and this user cannot delete — see the screen's
                   confirmation hook. */
                <SwipeToDelete
                  key={row.shoot.id}
                  onRequestDelete={() => onRequestDelete(row.shoot)}
                >
                  <AgendaRow
                    shoot={row.shoot}
                    crew={crewNames[row.shoot.id] ?? []}
                    tooSoon={followsTooSoon(group.rows, index)}
                    t={t}
                  />
                </SwipeToDelete>
              ) : (
                <CrewRow
                  key={`crew-${row.entry.shootId}`}
                  entry={row.entry}
                  badge={t.crewShootBadge}
                />
              )
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * One shoot: stripe, time, hairline, body.
 *
 * `overflow-hidden` on the outer View is what lets the stripe reach the card's
 * rounded corners. The design system's §5.2 warns that on Android
 * `overflow:'hidden'` with a borderRadius can clip the shadow, so the elevation
 * stays on this View and the clipping happens on it too — worth watching when
 * Android builds start.
 *
 * **The Figma card** (owner, 2026-08-30): `bg-card` — `#1F1F22` since that file's
 * value replaced RNR's — with the `#27272A` 1px border and the 14px radius it
 * draws, matching the crew card on the shoot-detail frame (node `1:79`).
 *
 * This row has been white, then dark, then white again over two days. What
 * settles it is that the earlier dark round failed for a reason that no longer
 * holds: `--card` then equalled `--background`, so a dark row had no edge and a
 * border was the only thing making it a row. The card token now lifts off the
 * page on its own, and the border is the file's rather than a workaround.
 *
 * `calendar-ux-variants.html` draws `.agenda-row` white, so this is a departure
 * from that prototype in favour of the Figma file, which is newer.
 *
 * Text is the dark-surface pair, and both halves happen to be what Figma uses:
 * `card-foreground` is `#FAFAFA` exactly, `muted-foreground` `#A3A3A3` against
 * its `#A1A1AA`.
 */
function AgendaRow({
  shoot,
  crew,
  tooSoon,
  t,
}: {
  shoot: Shoot
  crew: string[]
  tooSoon: boolean
  t: ReturnType<typeof useStrings>
}) {
  return (
    <Link href={`/(app)/shoot/${shoot.id}`} asChild>
      {/* Rows dim on touch and tick. A list row with no press feedback is the
          most web-like thing an app can do — iOS highlights every one. */}
      <Pressable onPress={tapped} className="active:opacity-70">
        <View
          /*
            `Calendar.dc.html`'s row: `background:var(--surface)` inside a 1px
            border, radius 12 — `bg-card`, not the page colour it used to be.

            **A clash changes only the border.** The artboard reads
            `cardBg: 'var(--surface)'` for every row and
            `cardLine: warn ? 'var(--warn-border)' : 'var(--border)'` — so the
            surface never moves and the edge goes amber. This had been lifting
            the whole card to `secondary` with a grey `border-strong`, which
            under the 2026-09-04 theme is doubly wrong: `--secondary` now equals
            `--card`, so the lift did nothing at all, and the amber the design
            uses to mark this row exists again.
          */
          className={`flex-row overflow-hidden rounded-xl border bg-card ${
            tooSoon ? 'border-warn-border' : 'border-border'
          }`}
        >
          {/* 3px, down from 4. `self-stretch` works here only because the
              parent does not centre its children. */}
          <View className={`w-[3px] self-stretch ${STRIPE[shoot.status]}`} />

          <View className="flex-1 flex-row gap-3 px-3.5 py-3">
            {/* The time column: a fixed 48pt, as drawn. It was `minWidth: 52`,
                which let the column grow and shift the hairline beside it from
                row to row — the artboard's is one width for every row. */}
            <View className="w-12 shrink-0 pt-px">
              <Text className="text-title-sm text-card-foreground font-semibold">
                {shoot.startTime ?? '—'}
              </Text>
              {shoot.endTime ? (
                <Text className="text-caption text-muted-foreground mt-[3px]">
                  {`${t.untilShort} ${shoot.endTime}`}
                </Text>
              ) : null}
            </View>

            {/* `.agenda-sep`, as the theme's own hairline — the same value the
                row's border uses. */}
            <View className="bg-border w-px self-stretch" />

            <View className="min-w-0 flex-1">
              {/*
                `US-031`'s clash marker, **amber again** — this is what
                `Calendar.dc.html` draws:

                  font-size:10.5px; font-weight:500; padding:3px 7px;
                  border-radius:999px; background:var(--warn-bg);
                  border:1px solid var(--warn-border); color:var(--warn)

                Written inline rather than as a `Badge` variant: its geometry is
                its own (10.5/500 at `3px 7px`, where `Badge` is 11/500 at
                `4px 8px`), and a `warn` variant on the primitive would let any
                caller reach for "something is wrong with the schedule" styling.
                `text-micro` is 10px — the scale has no half step, and earlier
                passes rounded down.
              */}
              {tooSoon ? (
                <View className="bg-warn-bg border-warn-border mb-[7px] self-start rounded-full border px-[7px] py-[3px]">
                  <Text className="text-micro text-warn font-medium">
                    {t.conflictLessThanHour}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-start justify-between gap-2">
                <Text className="text-subtitle text-card-foreground flex-1 font-semibold" numberOfLines={1}>
                  {shoot.clientName}
                </Text>
                {/* The row is a dark card, so the pill takes its
                    dark-surface pair — deep fill, pale text. */}
                <StatusPill value={shoot.status} />
              </View>

              {/*
                **Grey, not the artboard's blue** (owner, 2026-09-04).
                `Calendar.dc.html` writes `color:var(--link)` here, and it was
                `text-link` for a few hours today. Overruled: the address is not
                a link — nothing on this row opens a map — and the blue promised
                an action the row does not have.

                `text-muted-foreground` also puts this row back in step with the
                home screen's «Наступні зйомки», whose own artboard already
                draws the same line in `--text-dim`.
              */}
              {shoot.locationAddress ? (
                <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
                  {shoot.locationAddress}
                </Text>
              ) : null}

              {/*
                The ring is `border:2px solid {{ s.cardBg }}` — the surface
                behind the stack. That is one colour again now that a clash row
                keeps `--surface` and moves only its border, so the caller no
                longer has two cases to pass.
              */}
              {crew.length > 0 ? <AvatarStack names={crew} /> : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  )
}

/**
 * Overlapping crew avatars (§5.8).
 *
 * The ring is the colour of the surface BEHIND the stack —
 * `Calendar.dc.html` writes `border:2px solid {{ s.cardBg }}`, and `cardBg` is
 * `var(--surface)` for every row including a clash. It had been a prop because
 * a clash row used to lift to `secondary`; it no longer does, so `border-card`
 * is simply correct and there is no case to pass.
 */
function AvatarStack({ names }: { names: string[] }) {
  return (
    <View className="mt-2.5 flex-row">
      {names.map((name, index) => (
        <Avatar
          key={`${name}-${index}`}
          name={name}
          size={26}
          className={`border-card border-2 ${index > 0 ? '-ml-[7px]' : ''}`}
        />
      ))}
    </View>
  )
}

/**
 * The 4px stripe.
 *
 * Was `solid` in the design's status triples — a blue bar for a new shoot, a
 * pink one for a finished shoot. Both scales went with the app-wide monochrome
 * pass (owner, 2026-08-30; src/theme/global.css), so the stripe distinguishes by
 * BRIGHTNESS instead: a live shoot is `foreground`, a finished one recedes to
 * `border-strong`.
 *
 * That is weaker than the colour was and it is the honest replacement — the row
 * still carries a `StatusPill` with the word on it.
 */
/**
 * The 3px stripe.
 *
 * `Calendar.dc.html`'s `STATUS` table, which is coloured again:
 *
 *   planned → bar `var(--info-border)`    (#4972C0)
 *   done    → bar `var(--danger)`         (#EF7276, our `--destructive`)
 *
 * It was `border-strong` / `border` — two greys — which is what the artboard
 * drew while the design was monochrome. The stripe agrees with the
 * `StatusPill` beside it again: blue for a scheduled shoot, red for a finished
 * one, so the row reports its status twice rather than once.
 *
 * `--danger` and `--destructive` are the same oklch here
 * (`0.700 0.155 20`), so the finished stripe uses the token the app already
 * has rather than adding a `--danger` DEFAULT that nothing else would read.
 */
const STRIPE: Record<Shoot['status'], string> = {
  new: 'bg-info-border',
  finished: 'bg-destructive',
}

/** Rows grouped by date, preserving the order they arrived in. */
function groupByDate(rows: Row[]): { date: string; rows: Row[] }[] {
  const groups: { date: string; rows: Row[] }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.date === row.date) last.rows.push(row)
    else groups.push({ date: row.date, rows: [row] })
  }
  return groups
}

/**
 * `US-031` — does this shoot start less than an hour after the previous one ends?
 *
 * **The one-hour threshold is the mockup's, not Ilona's.** No story, PRD
 * requirement or review names it; logged in docs/redesign-log.md.
 *
 * Returns false whenever either side lacks times (AC-4): a shoot created before
 * `US-030` takes part in no comparison rather than being compared against
 * midnight. Crew rows are skipped too — a commitment someone else created
 * carries no times here.
 */
function followsTooSoon(rows: Row[], index: number): boolean {
  const current = rows[index]
  const previous = rows[index - 1]
  if (!previous || current.kind !== 'created' || previous.kind !== 'created') return false
  const start = minutesOf(current.shoot.startTime)
  const end = minutesOf(previous.shoot.endTime)
  if (start === null || end === null) return false
  const gap = start - end
  return gap >= 0 && gap < 60
}

function minutesOf(time: string | null): number | null {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}
