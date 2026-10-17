import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
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
  isUnpaid,
  statistics,
  type StatsAnchor,
  type StatsPeriod,
} from '../../src/features/shoots/stats'
import { tapped } from '../../src/lib/haptics'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoots: Shoot[]; crewNames: Record<string, string[]> }

/**
 * `US-062` — «Без оплати»: the shoots behind «Статистика»'s «{n} зйомок без
 * оплати», for the period it was on.
 *
 * Opened as `/unpaid?period=month&year=2026&month=10`. The list is read again
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
export default function UnpaidScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const currency = useCurrency()
  const params = useLocalSearchParams<{ period?: string; year?: string; month?: string }>()

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
  const unpaid = loaded
    ? loaded.shoots
        .filter((shoot) => inPeriod(shoot.date, period, anchor) && isUnpaid(shoot))
        .sort((a, b) =>
          a.date === b.date
            ? (a.startTime ?? '').localeCompare(b.startTime ?? '')
            : a.date.localeCompare(b.date)
        )
    : []
  const groups = groupByDate(unpaid)
  const meta = stats
    ? [periodLine(period, anchor, stats, t), formatMoney(stats.unpaid, currency)]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      {/* «‹ Статистика · Без оплати», the period and the sum under the title
          (AC-3) — the «Сповіщення» header, with a second line. */}
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
            <Text className="text-subtitle text-foreground font-semibold">{t.unpaidTitle}</Text>
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
          // AC-5 — everything on the list has been paid.
          <View className="border-border items-center rounded-xl border px-4 py-7">
            <Text className="text-body text-success text-center">{t.statsAllPaid}</Text>
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
