import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Camera from 'lucide-react-native/icons/camera'
import ChartColumn from 'lucide-react-native/icons/chart-column'
import Clock from 'lucide-react-native/icons/clock'
import CreditCard from 'lucide-react-native/icons/credit-card'
import DollarSign from 'lucide-react-native/icons/dollar-sign'
import type { LucideIcon } from 'lucide-react-native'
import { Card } from '../../../src/components/ui/card'
import { Icon } from '../../../src/components/ui/icon'
import { Tabs, type TabItem } from '../../../src/components/ui/tabs'
import { Text } from '../../../src/components/ui/text'
import { SectionLabel } from '../../../src/components/ShootFormFields'
import { Starfield } from '../../../src/components/Starfield'
import { TabHeader } from '../../../src/components/TabHeader'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import type { Strings } from '../../../src/i18n'
import { listShoots, type Shoot } from '../../../src/features/shoots/api'
import { plural } from '../../../src/features/shoots/home'
import {
  currencySymbol,
  formatAmount,
  formatMoney,
  symbolLeads,
} from '../../../src/features/shoots/money'
import { useCurrency } from '../../../src/features/account/currency'
import { statistics, type StatsPeriod, type Statistics } from '../../../src/features/shoots/stats'

type State = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; shoots: Shoot[] }

/**
 * «Статистика» — `Statistics.dc.html`, and the fourth tab (owner, 2026-09-07).
 *
 * **It took the profile's place in the bar**, which is what both artboards that
 * draw a bar now show: `Statistics.dc.html` and `Edit Profile.dc.html` both
 * carry Головна · Календар · Контакти · Статистика and neither has a profile
 * item. `/profile` is unchanged and still reached from the avatar chip in the
 * home screen's header — see `BottomNav`.
 *
 * **One read, three periods.** `listShoots` on focus, and the segmented control
 * then re-reduces what is already loaded — the same arrangement as the
 * calendar's date filter and «Мої контакти»'s search: switching period is
 * instant and works the same offline. There is no aggregate query and no view;
 * `stats.ts` carries the arithmetic, and it is pure so that it can be tested
 * without a database.
 *
 * The five figures are all derived from columns that already existed — see
 * `stats.ts` for the owner's three answers about what they mean, and
 * docs/open-questions.md for what nobody has decided yet (the zero state, and a
 * shoot whose end is before its start).
 */
export default function StatisticsScreen() {
  const t = useStrings()
  // `US-047` — every figure here is in the account's currency.
  const currency = useCurrency()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [period, setPeriod] = useState<StatsPeriod>('month')

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoots = await listShoots()
        if (!active) return
        setState(shoots ? { status: 'loaded', shoots } : { status: 'error' })
      })()
      return () => {
        active = false
      }
    }, [])
  )

  /*
    `now` is read at render rather than held in state: a screen kept open past
    midnight would otherwise keep counting yesterday's month, and the figures
    are cheap enough to derive on every pass.
  */
  const now = new Date()
  const stats = state.status === 'loaded' ? statistics(state.shoots, period, now) : null
  const line = stats ? periodLine(period, stats, now, t) : ''

  const periods: TabItem<StatsPeriod>[] = [
    { value: 'month', label: t.statsPeriodMonth },
    { value: 'year', label: t.statsPeriodYear },
    { value: 'all', label: t.statsPeriodAll },
  ]

  return (
    <View className="bg-background flex-1">
      <Starfield />
      {/* The shared tab header (2026-09-07). This screen's own was the block
          the other three were measured against, so it moved wholesale. */}
      <TabHeader title={t.statsTitle} meta={line} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="gap-2.5 px-4 pt-3">
          <Tabs items={periods} value={period} onChange={setPeriod} />

          {state.status === 'loading' ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" />
            </View>
          ) : state.status === 'error' || !stats ? (
            <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
          ) : (
            <>
              {/*
                «Дохід». The one card the artboard gives `--border-strong`
                instead of `--border` — it is the screen's headline, and the
                stronger edge is how the drawing says so.
              */}
              <HeroCard
                label={t.statsIncome}
                icon={CreditCard}
                tint="bg-chart-3"
                stripe="bg-success"
                figure={formatAmount(stats.income, currency)}
                unit={currencySymbol(currency)}
                unitFirst={symbolLeads(currency)}
                unitClassName="text-title-lg text-success font-medium"
                figureClassName="text-success"
                line={line}
                strong
              />

              {/* «Проведено зйомок» — the count, with its plural noun beside
                  it («зйомка / зйомки / зйомок») rather than inside the label. */}
              <HeroCard
                label={t.statsShootsDone}
                icon={Camera}
                tint="bg-chart-5"
                stripe="bg-info-border"
                figure={String(stats.shoots)}
                unit={plural(stats.shoots, t.shootCountForms)}
                unitClassName="text-body text-muted-foreground"
                figureClassName="text-info"
                line={line}
              />

              <View className="pt-1">
                <Card variant="flat" className="gap-0 overflow-hidden p-0">
                  <SecondaryRow
                    label={t.statsAverage}
                    icon={DollarSign}
                    tint="bg-chart-4"
                    value={formatMoney(stats.average, currency)}
                  />
                  <SecondaryRow
                    label={t.statsUnpaid}
                    icon={Clock}
                    tint="bg-chart-1"
                    value={formatMoney(stats.unpaid, currency)}
                    valueClassName="text-warn"
                    divided
                  />
                  <SecondaryRow
                    label={t.statsHours}
                    icon={ChartColumn}
                    tint="bg-chart-2"
                    value={String(stats.hours)}
                    divided
                  />
                </Card>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

/**
 * «Вересень 2026» · «2026 рік» · «З березня 2023» — what period is on screen.
 *
 * Composed here rather than in `stats.ts`, which returns the month and stays
 * i18n-free (the `money.ts` split). The all-time line dates itself from the
 * earliest shoot that counted, so an account with none shows no line at all
 * rather than a period it cannot name.
 *
 * `trim()` is for English, where `statsYearWord` is empty: «2026 рік» has a
 * word after the year and "2026" does not, and that is a language difference
 * rather than a missing string.
 */
function periodLine(
  period: StatsPeriod,
  stats: Statistics,
  now: Date,
  t: Strings
): string {
  if (period === 'month') return `${t.months[now.getMonth()]} ${now.getFullYear()}`
  if (period === 'year') return `${now.getFullYear()} ${t.statsYearWord}`.trim()
  if (!stats.firstMonth) return ''
  const { year, month } = stats.firstMonth
  return `${t.statsSincePrefix} ${t.monthsGenitive[month - 1]} ${year}`
}

/**
 * One of the two big cards: a 3px coloured stripe, a tinted icon chip, the
 * uppercase label, a 38px figure with its unit, and the period line again.
 *
 * **38px has no slot in the type scale**, which tops out at `display` (24px) —
 * so it is written as an arbitrary size here, the way `LinkShootHeader` and
 * `ClientField` write theirs. Adding a scale step for two figures on one screen
 * is what `--border-strong` cost in tokens; say if it is worth one.
 *
 * The stripe is a `View` rather than a left border because the artboard draws it
 * at 3px inside a 1px-bordered, radius-12 card: a border of two widths cannot
 * be one rounded rectangle, and a fill clipped by `overflow-hidden` can.
 */
function HeroCard({
  label,
  icon,
  tint,
  stripe,
  figure,
  unit,
  unitFirst = false,
  unitClassName,
  figureClassName,
  line,
  strong = false,
}: {
  label: string
  icon: LucideIcon
  tint: string
  stripe: string
  figure: string
  unit: string
  /** `US-047` AC-6 — «$12,000»: the dollar sign leads. */
  unitFirst?: boolean
  unitClassName: string
  figureClassName: string
  line: string
  strong?: boolean
}) {
  return (
    <Card
      variant="flat"
      className={`flex-row gap-0 overflow-hidden p-0 ${strong ? 'border-border-strong' : ''}`}
    >
      <View className={`w-[3px] shrink-0 ${stripe}`} />
      <View className="min-w-0 flex-1 px-[18px] py-4">
        <View className="flex-row items-center gap-2.5">
          <View className={`h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${tint}`}>
            <Icon as={icon} size={16} strokeWidth={1.9} className="text-tint-foreground" />
          </View>
          <SectionLabel label={label} />
        </View>
        <View className="mt-3 flex-row items-baseline gap-1.5">
          {unitFirst ? <Text className={unitClassName}>{unit}</Text> : null}
          <Text
            className={`text-[38px] font-semibold ${figureClassName}`}
            // Absolute, like every line height in the scale: the figure is one
            // line and must not inherit a body leading at three times the size.
            style={{ lineHeight: 40, letterSpacing: -0.76 }}
          >
            {figure}
          </Text>
          {/* The unit carries its own colour: `₴` is the figure's green, while
              «зйомок» is dim — the artboard tints one and not the other. */}
          {unitFirst ? null : <Text className={unitClassName}>{unit}</Text>}
        </View>
        {line ? <Text className="text-body-sm text-muted-foreground mt-2">{line}</Text> : null}
      </View>
    </Card>
  )
}

/**
 * One row of the second card: «Середній чек», «Очікує оплати», «Годин на
 * зйомках» — a 26px tinted chip, the label, and the value hard right.
 *
 * 54px as drawn, and `divided` puts the hairline on every row but the first,
 * the way `PersonRow` does in «Мої контакти».
 */
function SecondaryRow({
  label,
  icon,
  tint,
  value,
  valueClassName = 'text-foreground',
  divided = false,
}: {
  label: string
  icon: LucideIcon
  tint: string
  value: string
  valueClassName?: string
  divided?: boolean
}) {
  return (
    <View
      className={`min-h-[54px] flex-row items-center gap-3 px-4 py-3 ${
        divided ? 'border-border border-t' : ''
      }`}
    >
      <View className={`h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg ${tint}`}>
        <Icon as={icon} size={14} strokeWidth={2} className="text-tint-foreground" />
      </View>
      <Text className="text-body-sm text-muted-foreground min-w-0 flex-1">{label}</Text>
      <Text className={`text-subtitle shrink-0 font-semibold ${valueClassName}`}>{value}</Text>
    </View>
  )
}
