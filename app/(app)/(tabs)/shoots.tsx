import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, Stack, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { Badge } from '../../../src/components/ui/badge'
import { Button } from '../../../src/components/ui/button'
import { Icon } from '../../../src/components/ui/icon'
import { Tabs } from '../../../src/components/ui/tabs'
import { Text } from '../../../src/components/ui/text'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { formatDayMonth, toIsoDate } from '../../../src/features/shoots/date'
import { pluralUk } from '../../../src/features/shoots/home'
import { listShoots, type Shoot } from '../../../src/features/shoots/api'
import { listCrewShoots, type CrewShoot } from '../../../src/features/shoots/crewSchedule'
import { listCrewNamesForShoots } from '../../../src/features/crew/api'
import { Avatar } from '../../../src/components/Avatar'
import { tapped } from '../../../src/lib/haptics'
import { StatusPill } from '../../../src/components/StatusPill'
import { Card } from '../../../src/components/ui/card'
import {
  ShootCalendar,
  startOfWeek,
  type CalendarMode,
} from '../../../src/components/ShootCalendar'

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
    }, [])
  )

  /*
    The calendar's position and grid, lifted out of `ShootCalendar` on
    2026-08-30. The header's meta line and its «Сьогодні» button both read them,
    and neither could reach state the card owned privately.
  */
  const [mode, setMode] = useState<CalendarMode>('month')
  const [focus, setFocus] = useState<Date>(() => new Date())

  const all = state.status === 'loaded' ? rows(state.shoots, state.crewShoots) : []
  const inPeriod = all.filter((row) => withinPeriod(row.date, mode, focus))
  const shown = visible(all, selectedDate)

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        The screen's own header (2026-08-30). It carries a meta line under the
        title and a «Сьогодні» control on the right, neither of which a native
        header can hold — the same reason the shoot's screens draw theirs.
      */}
      <CalendarHeader
        meta={`${mode === 'month' ? t.months[focus.getMonth()] : t.calModeWeek} · ${
          inPeriod.length
        } ${pluralUk(inPeriod.length, t.shootCountForms)}`}
        onToday={() => {
          setFocus(new Date())
          setSelectedDate(null)
        }}
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
    </View>
  )
}

/**
 * The screen's own header: a back chevron, «Календар» with a meta line under
 * it, and «Сьогодні».
 *
 * «Сьогодні» is new. The calendar could always be walked back to the current
 * month with the arrows; nothing jumped to it, which on a screen whose whole
 * subject is dates was a gap the handoff noticed.
 *
 * **The chevron stays, now that this is a tab root** (owner, 2026-09-04).
 * `Calendar.dc.html` still draws it beside the bar that made it redundant — and
 * draws it with *no handler at all*, so where it goes was ours to decide: the
 * Головна tab, which is what the same artboard's Contacts sibling links its own
 * back control to. It is a second route to a tab that is already one tap away.
 */
function CalendarHeader({ meta, onToday }: { meta: string; onToday: () => void }) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View
      className="bg-background border-border flex-row items-center gap-1.5 border-b px-2.5 pb-2"
      style={{ paddingTop: insets.top }}
    >
      <Pressable
        className="active:bg-secondary h-10 w-10 items-center justify-center rounded-lg"
        onPress={() => {
          tapped()
          /*
            The Головна tab, always — not `router.back()`. A tab router keeps a
            history of visited tabs, so `back()` from here would return to
            whichever tab was last focused, and a chevron that lands somewhere
            different each time is worse than one that always goes home.
          */
          router.navigate('/(app)/(tabs)')
        }}
        role="button"
        accessibilityLabel={t.cancel}
      >
        <Icon as={ChevronLeft} size={22} strokeWidth={1.9} className="text-foreground" />
      </Pressable>

      <View className="min-w-0 flex-1">
        <Text className="text-title-sm text-foreground font-semibold">{t.calendarTitle}</Text>
        <Text className="text-caption text-muted-foreground mt-px" numberOfLines={1}>
          {meta}
        </Text>
      </View>

      <Pressable
        className="border-border active:bg-secondary h-8 shrink-0 justify-center rounded-lg border px-2.5"
        onPress={() => {
          tapped()
          onToday()
        }}
        role="button"
      >
        <Text className="text-label text-foreground font-medium">{t.todayWord}</Text>
      </Pressable>
    </View>
  )
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
          {entry.locationAddress ? `${entry.date} · ${entry.role}` : entry.role}
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

  if (!entry.token) return body
  return (
    <Link href={`/s/${entry.token}`} asChild>
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
  t,
}: {
  groups: { date: string; rows: Row[] }[]
  crewNames: Record<string, string[]>
  monthsGenitive: readonly string[]
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
              /* `pluralUk`, not the old fixed «зйомки за день» — that read wrong
                 from five upward («5 зйомки за день»). */
              <Text className="text-label text-muted-foreground/70">
                {`· ${group.rows.length} ${pluralUk(group.rows.length, t.shootCountForms)} ${t.perDay}`}
              </Text>
            ) : null}
          </View>

          <View className="gap-2">
            {group.rows.map((row, index) =>
              row.kind === 'created' ? (
                <AgendaRow
                  key={row.shoot.id}
                  shoot={row.shoot}
                  crew={crewNames[row.shoot.id] ?? []}
                  tooSoon={followsTooSoon(group.rows, index)}
                  t={t}
                />
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
            The conflict ring is `warning-border` (#E2A63F), not `destructive`.
            `.agenda-row.warn` draws `inset 0 0 0 1.5px #e2a63f` — §3.1's
            `warning-ring` — and «менше години після попередньої» is a warning,
            not an error. A red ring on this row said something stronger than the
            tag inside it.
          */
          /*
            The handoff's row: the page colour inside a `#27272a` border, radius
            12, no lift. A clash lifts the whole card to `secondary` and takes
            the stronger border, where it used to take a 1.5px amber ring — that
            ring was the last thing on this screen using `warning` as a surface,
            and the scale now survives only on the tag inside.
          */
          className={`flex-row overflow-hidden rounded-xl border ${
            tooSoon ? 'bg-secondary border-border-strong' : 'bg-background border-border'
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
                `US-031`'s clash marker. An **outline** badge now, as
                `Calendar.dc.html` draws it — it was an amber fill, and the
                card's own lift plus its stronger border already say this row is
                the odd one. The text still states exactly what is wrong.

                This was the last use of `warning` anywhere in the app.
              */}
              {tooSoon ? (
                <View className="mb-1.5 self-start">
                  <Badge variant="outline" label={t.conflictLessThanHour} />
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

              {shoot.locationAddress ? (
                <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
                  {shoot.locationAddress}
                </Text>
              ) : null}

              {/*
                The ring colour is the colour of THIS row, which is not one
                colour: a clash row lifts to `secondary`. It was hardcoded to
                `border-card` — a leftover from when the row was `bg-card` — so
                every avatar carried a `#1F1F22` halo against the `#0A0A0A` row.
              */}
              {crew.length > 0 ? (
                <AvatarStack
                  names={crew}
                  ringClass={tooSoon ? 'border-secondary' : 'border-background'}
                />
              ) : null}
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
 * The ring colour is the colour of the surface BEHIND the stack, which is why
 * the caller supplies it — `Calendar.dc.html` writes `border:2px solid
 * {{ s.cardBg }}`, and that value differs per row: a clash row lifts to
 * `secondary`. Passing it in rather than assuming one colour is the same
 * warning the design system gives about assuming white.
 */
function AvatarStack({ names, ringClass }: { names: string[]; ringClass: string }) {
  return (
    <View className="mt-2.5 flex-row">
      {names.map((name, index) => (
        <Avatar
          key={`${name}-${index}`}
          name={name}
          size={26}
          className={`border-2 ${ringClass} ${index > 0 ? '-ml-[7px]' : ''}`}
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
 * `Calendar.dc.html`'s own tones for the two statuses we have: `planned` is
 * `#52525b` and `done` is `#27272a` — `border-strong` and `border`. Neither is
 * white; the design reserves that for its third status, `progress`, which this
 * product does not have (`US-020` AC-2 — two values, deliberately).
 *
 * So the stripe is a quiet marker here, not a signal. The word on the
 * `StatusPill` beside it is what actually reports the status.
 */
const STRIPE: Record<Shoot['status'], string> = {
  new: 'bg-border-strong',
  finished: 'bg-border',
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
