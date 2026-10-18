import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import CalendarPlus from 'lucide-react-native/icons/calendar-plus'
import Camera from 'lucide-react-native/icons/camera'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Clock from 'lucide-react-native/icons/clock'
import CreditCard from 'lucide-react-native/icons/credit-card'
import Plus from 'lucide-react-native/icons/plus'
import Send from 'lucide-react-native/icons/send'
import SquareCheck from 'lucide-react-native/icons/square-check'
import { Icon } from '../../src/components/ui/icon'
import { Text } from '../../src/components/ui/text'
import { Starfield } from '../../src/components/Starfield'
import { AgendaRow } from '../../src/components/ShootAgendaRow'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { listShoots, type Shoot } from '../../src/features/shoots/api'
import { listCrewNamesForShoots } from '../../src/features/crew/api'
import { formatDayMonth, toIsoDate } from '../../src/features/shoots/date'
import { plural } from '../../src/features/shoots/home'
import { formatMoney } from '../../src/features/shoots/money'
import { useCurrency } from '../../src/features/account/currency'
import { periodLine } from '../../src/features/shoots/periodLine'
import {
  inPeriod,
  isDelivered,
  isEditing,
  isOverdue,
  inOrder,
  isUnpaid,
  statistics,
  type StatShootsKind,
  type StatsAnchor,
  type StatsPeriod,
} from '../../src/features/shoots/stats'
import { statusOf } from '../../src/features/shoots/status'
import { tapped } from '../../src/lib/haptics'
import { useGuard } from '../../src/features/subscription/access'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoots: Shoot[]; crewNames: Record<string, string[]> }

/**
 * The shoots behind a figure on «Статистика», for the period it was on:
 *
 * - `unpaid` — `US-062`, «Без оплати», from «{n} зйомок без оплати»
 * - `done`, `planned`, `editing`, `delivered`, `overdue` — `US-063`, from
 *   «Проведено», «Заплановано», «В обробці», «Передано» and «Прострочено»
 *
 * One screen with six selections (owner, 2026-10-17: «таку ж сторінку»).
 * Opened as `/stat-shoots?kind=unpaid&period=month&year=2026&month=10`; a
 * deadline reminder (`US-066` AC-7) opens it with `period=all&noPeriod=1`. The list is read again
 * every time the screen comes back into focus (AC-4), so a shoot marked paid
 * on its own screen (`US-060`) is gone on the way back.
 *
 * The cards are the calendar's own (`ShootAgendaRow`), grouped under the same
 * date headings, oldest first (owner, 2026-10-17). Two things the calendar
 * does are left out on purpose: swipe-to-delete (out of scope), and the
 * «less than an hour after the previous one» chip — on a filtered list the
 * previous card is not the previous shoot, so the chip would lie.
 *
 * Only the creator's own shoots: `listShoots` returns those, never the ones
 * they are crew on (AC-6), and RLS drops deleted rows (`ADR-014`).
 */
export default function StatShootsScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // `US-071` AC-1 — the account's currency leads the sums, and stands in for «0».
  const currency = useCurrency()
  const guard = useGuard()
  const params = useLocalSearchParams<{
    kind?: string
    period?: string
    year?: string
    month?: string
    noPeriod?: string
  }>()
  const kind: StatShootsKind =
    params.kind === 'done' ||
    params.kind === 'planned' ||
    params.kind === 'editing' ||
    params.kind === 'delivered' ||
    params.kind === 'overdue'
      ? params.kind
      : 'unpaid'

  const period: StatsPeriod =
    params.period === 'year' || params.period === 'all' ? params.period : 'month'
  const today = new Date()
  const anchor: StatsAnchor = {
    year: Number(params.year) || today.getFullYear(),
    month: Number(params.month) || today.getMonth() + 1,
  }

  const [state, setState] = useState<State>({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoots = await listShoots()
        if (!active) return
        if (!shoots) return setState({ status: 'error' })
        const crewNames = (await listCrewNamesForShoots(shoots.map((s) => s.id))) ?? {}
        if (active) setState({ status: 'loaded', shoots, crewNames })
      })()
      return () => {
        active = false
      }
    }, [])
  )

  const loaded = state.status === 'loaded' ? state : null
  const stats = loaded ? statistics(loaded.shoots, period, anchor) : null
  // AC-3 — oldest first; on one day, by start time.
  const now = new Date()
  const selected = (shoot: Shoot): boolean => {
    switch (kind) {
      case 'unpaid':
        return isUnpaid(shoot)
      case 'done':
        return statusOf(shoot, now) === 'finished'
      case 'planned':
        return statusOf(shoot, now) !== 'finished'
      case 'editing':
        return isEditing(shoot, now)
      case 'delivered':
        return isDelivered(shoot)
      case 'overdue':
        return isOverdue(shoot, now)
    }
  }
  const list = loaded
    ? loaded.shoots
        .filter((shoot) => inPeriod(shoot.date, period, anchor) && selected(shoot))
        .sort((a, b) =>
          a.date === b.date
            ? (a.startTime ?? '').localeCompare(b.startTime ?? '')
            : a.date.localeCompare(b.date)
        )
    : []
  const groups = groupByDate(list)
  // `US-062` AC-3: the sum owed; `US-063` AC-2: how many shoots.
  const meta = stats
    ? [
        // `US-066` AC-7 — opened from a deadline reminder: every such shoot,
        // and only «{n} зйомки» under the title.
        params.noPeriod ? '' : periodLine(period, anchor, stats, t),
        kind === 'unpaid'
          ? // `US-071` AC-6 — the sum owed per currency, the account's first;
            // «0 ₴» in the account's when nothing is owed.
            inOrder(stats.unpaid, currency)
              .map((owed) => formatMoney(owed.sum, owed.currency))
              .join(' · ') || formatMoney(0, currency)
          : `${list.length} ${plural(list.length, t.shootCountForms)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''
  const title = {
    unpaid: t.unpaidTitle,
    done: t.statsShootsDone,
    planned: t.statsPlanned,
    editing: t.statsEditing,
    delivered: t.deadlineDelivered,
    overdue: t.deadlineOverdue,
  }[kind]
  // `US-063` AC-4 — the empty list, as `Statistics Empty States.dc.html` draws it.
  const empty = {
    done: { icon: Camera, title: t.emptyDoneTitle, body: t.emptyDoneBody, add: true },
    planned: {
      icon: CalendarPlus,
      title: t.emptyPlannedTitle,
      body: t.emptyPlannedBody,
      add: true,
    },
    unpaid: { icon: CreditCard, title: t.emptyUnpaidTitle, body: t.emptyUnpaidBody, add: false },
    editing: {
      icon: SquareCheck,
      title: t.emptyEditingTitle,
      body: t.emptyEditingBody,
      add: false,
    },
    delivered: {
      icon: Send,
      title: t.emptyDeliveredTitle,
      body: t.emptyDeliveredBody,
      add: false,
    },
    overdue: { icon: Clock, title: t.emptyOverdueTitle, body: t.emptyOverdueBody, add: false },
  }[kind]

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      {/* «‹ Статистика · Без оплати», the period and the sum or count under the
          title — the «Сповіщення» header, with a second line. */}
      <View className="bg-background border-border border-b" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-1.5 px-2 pb-2 pt-1">
          <Pressable
            className="active:bg-secondary min-h-11 w-[104px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
            onPress={() => {
              tapped()
              if (router.canGoBack()) router.back()
              else router.replace('/(app)/(tabs)/statistics')
            }}
            role="button"
            accessibilityLabel={t.statsTitle}
          >
            <Icon as={ChevronLeft} size={16} strokeWidth={1.9} className="text-muted-foreground" />
            <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
              {t.statsTitle}
            </Text>
          </Pressable>
          <View className="min-w-0 flex-1 items-center">
            <Text className="text-subtitle text-foreground font-semibold">{title}</Text>
            {meta ? (
              <Text className="text-caption text-muted-foreground mt-px" numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
          </View>
          <View className="w-[104px] shrink-0" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {state.status === 'loading' ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
          </View>
        ) : state.status === 'error' ? (
          <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
        ) : groups.length === 0 ? (
          <View className="bg-card border-border items-center rounded-[14px] border px-6 pb-[30px] pt-[34px]">
            <Icon as={empty.icon} size={44} strokeWidth={1.3} className="text-muted-foreground" />
            <Text className="text-subtitle text-foreground mt-4 text-center font-semibold">
              {empty.title}
            </Text>
            <Text className="text-body-sm text-muted-foreground mt-1.5 max-w-[270px] text-center">
              {empty.body}
            </Text>
            {empty.add ? (
              <Pressable
                onPress={guard(() => {
                  tapped()
                  router.push('/(app)/new-shoot')
                })}
                role="button"
                className="border-border-strong active:bg-secondary mt-[18px] min-h-11 flex-row items-center gap-1.5 rounded-full border px-5"
              >
                <Icon as={Plus} size={16} strokeWidth={2} className="text-foreground" />
                <Text className="text-body text-foreground font-semibold">{t.newShootTitle}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="gap-3">
            {groups.map((group) => (
              <View key={group.date}>
                {/* The calendar's date heading, as drawn there. */}
                <View className="mb-2 mt-1 flex-row items-baseline gap-2 px-0.5">
                  <Text
                    className="text-label text-muted-foreground font-semibold uppercase"
                    style={{ letterSpacing: 0.48 }}
                  >
                    {`${formatDayMonth(group.date, t.monthsGenitive)}${
                      group.date === toIsoDate(new Date()) ? ` · ${t.todayWord.toLowerCase()}` : ''
                    }`}
                  </Text>
                  {group.shoots.length > 1 ? (
                    <Text className="text-label text-muted-foreground/70">
                      {`· ${group.shoots.length} ${plural(group.shoots.length, t.shootCountForms)} ${t.perDay}`}
                    </Text>
                  ) : null}
                </View>
                <View className="gap-2">
                  {group.shoots.map((shoot) => (
                    <AgendaRow
                      key={shoot.id}
                      shoot={shoot}
                      crew={loaded?.crewNames[shoot.id] ?? []}
                      tooSoon={false}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function groupByDate(shoots: Shoot[]): { date: string; shoots: Shoot[] }[] {
  const groups: { date: string; shoots: Shoot[] }[] = []
  for (const shoot of shoots) {
    const last = groups[groups.length - 1]
    if (last && last.date === shoot.date) last.shoots.push(shoot)
    else groups.push({ date: shoot.date, shoots: [shoot] })
  }
  return groups
}
