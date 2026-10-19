import { useCallback, useRef, useState, type RefObject } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import CalendarIcon from 'lucide-react-native/icons/calendar'
import Camera from 'lucide-react-native/icons/camera'
import ChartColumn from 'lucide-react-native/icons/chart-column'
import Clock from 'lucide-react-native/icons/clock'
import ChevronDown from 'lucide-react-native/icons/chevron-down'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import CreditCard from 'lucide-react-native/icons/credit-card'
import FileCheck from 'lucide-react-native/icons/file-check'
import FileClock from 'lucide-react-native/icons/file-clock'
import TriangleAlert from 'lucide-react-native/icons/triangle-alert'
import type { LucideIcon } from 'lucide-react-native'
import { Card } from '../../../src/components/ui/card'
import { Sheet } from '../../../src/components/ui/sheet'
import { Icon } from '../../../src/components/ui/icon'
import { Tabs, type TabItem } from '../../../src/components/ui/tabs'
import { Text } from '../../../src/components/ui/text'
import { SectionLabel } from '../../../src/components/ShootFormFields'
import { Starfield } from '../../../src/components/Starfield'
import { TabHeader } from '../../../src/components/TabHeader'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { listShoots, type Shoot } from '../../../src/features/shoots/api'
import { plural } from '../../../src/features/shoots/home'
import { formatDayMonth } from '../../../src/features/shoots/date'
import { tapped } from '../../../src/lib/haptics'
import {
  currencySymbol,
  formatAmountStats,
  type Currency,
} from '../../../src/features/shoots/money'
import { useCurrency } from '../../../src/features/account/currency'
import { periodLine } from '../../../src/features/shoots/periodLine'
import {
  inOrder,
  statistics,
  type MoneyTally,
  type StatShootsKind,
  type StatsAnchor,
  type StatsPeriod,
  type Statistics,
} from '../../../src/features/shoots/stats'
import { useDesktop } from '../../../src/lib/desktop'

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
  // `US-071` AC-1 — the account's currency leads every money figure, and is
  // the one «Дохід» shows its zero in.
  const currency = useCurrency()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [period, setPeriod] = useState<StatsPeriod>('month')
  const router = useRouter()
  /*
    `US-061` AC-1 — the month or year on screen. Starts on today's; the arrows
    step it with no limit either way (owner, 2026-10-17).
  */
  const [anchor, setAnchor] = useState<StatsAnchor>(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() + 1 }
  })
  const [picking, setPicking] = useState(false)
  /*
    `US-057` — on a desktop browser, the draft canvas's «Статистика»: the
    period switch in the header, the figures in an 880 px column, the stepper
    as wide as its label, and the month or year picked from a popover under
    it. Always false on iOS.
  */
  const desktop = useDesktop()
  const periodButton = useRef<View>(null)

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
  const stats = state.status === 'loaded' ? statistics(state.shoots, period, anchor, now) : null
  const line = stats ? periodLine(period, anchor, stats, t) : ''

  const step = (by: number) =>
    setAnchor((current) => {
      if (period === 'year') return { ...current, year: current.year + by }
      const index = current.year * 12 + (current.month - 1) + by
      return { year: Math.floor(index / 12), month: (index % 12) + 1 }
    })

  /*
    `US-062` / `US-063` — a figure opens the shoots behind it, for the period
    on screen. A zero opens it too, and the list says it is empty (`US-063`
    AC-2, owner 2026-10-17).
  */
  const openList = (kind: StatShootsKind) =>
    router.push({
      pathname: '/(app)/stat-shoots',
      params: { kind, period, year: String(anchor.year), month: String(anchor.month) },
    })

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
      <TabHeader
        title={t.statsTitle}
        meta={line}
        right={
          desktop ? (
            <Tabs items={periods} value={period} onChange={setPeriod} className="w-[360px]" />
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: desktop ? 48 : 24 }}>
        <View className={desktop ? 'w-full max-w-[880px] gap-2.5 px-10 pt-7' : 'gap-2.5 px-4 pt-3'}>
          {desktop ? null : <Tabs items={periods} value={period} onChange={setPeriod} />}

          {period === 'all' ? null : (
            <PeriodStepper
              compact={desktop}
              labelRef={periodButton}
              label={line}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onOpen={() => setPicking(true)}
            />
          )}

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
              <IncomeCard
                income={inOrder(stats.income, currency)}
                currency={currency}
                line={line}
              />

              {/* `US-071` AC-3 — its own card, between «Дохід» and the counts. */}
              <UnpaidCard
                unpaid={inOrder(stats.unpaid, currency)}
                count={stats.unpaidShoots}
                allPaid={stats.pricedShoots > 0}
                onPress={() => openList('unpaid')}
              />

              {/* AC-4 — «Проведено» and «Заплановано», side by side. */}
              <View className="flex-row gap-2.5">
                <CountCard
                  label={t.statsShootsDone}
                  icon={Camera}
                  tint="bg-chart-5"
                  stripe="bg-info-border"
                  figure={stats.done}
                  figureClassName="text-info"
                  unit={plural(stats.done, t.shootCountForms)}
                  line={`${stats.hours} ${plural(stats.hours, t.hourForms)}`}
                  onPress={() => openList('done')}
                />
                <CountCard
                  label={t.statsPlanned}
                  icon={CalendarIcon}
                  tint="bg-chart-4"
                  stripe="bg-chart-4"
                  figure={stats.planned}
                  figureClassName="text-foreground"
                  unit={plural(stats.planned, t.shootCountForms)}
                  line={
                    stats.nextPlanned
                      ? t.statsNextTemplate.replace(
                          '{date}',
                          formatDayMonth(stats.nextPlanned, t.monthsGenitive)
                        )
                      : t.statsNothingPlanned
                  }
                  // `US-063` AC-3 — its list, no longer «Календар».
                  onPress={() => openList('planned')}
                />
              </View>

              {/*
                `US-063` AC-2b — two cards: the three rows that open a list, then
                the two plain figures under them (owner, 2026-10-17).
              */}
              <View className="pt-1">
                <Card variant="flat" className="gap-0 overflow-hidden p-0">
                  {/* `US-063` AC-1 — first, now «Очікує оплати» has a card of its own. */}
                  <SecondaryRow
                    label={t.statsEditing}
                    icon={FileClock}
                    tint="bg-chart-5"
                    value={String(stats.editing)}
                    onPress={() => openList('editing')}
                  />
                  {/* `US-063` AC-1c — under «В обробці». */}
                  <SecondaryRow
                    label={t.deadlineDelivered}
                    icon={FileCheck}
                    tint="bg-chart-3"
                    value={String(stats.delivered)}
                    onPress={() => openList('delivered')}
                    divided
                  />
                  {/* `US-063` AC-1a — under «Передано»; red while above zero, as
                      the card's «Прострочено» chip. */}
                  <SecondaryRow
                    label={t.deadlineOverdue}
                    icon={TriangleAlert}
                    tint="bg-chart-2"
                    value={String(stats.overdue)}
                    valueClassName={stats.overdue > 0 ? 'text-danger-soft' : 'text-foreground'}
                    onPress={() => openList('overdue')}
                    divided
                  />
                </Card>
              </View>
              {/* `US-071` AC-4 — «Середній чек» is gone; the hours stand alone. */}
              <Card variant="flat" className="gap-0 overflow-hidden p-0">
                  <SecondaryRow
                    label={t.statsHours}
                    icon={ChartColumn}
                    tint="bg-chart-2"
                    value={String(stats.hours)}
                  />
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      <PeriodSheet
        popoverAnchor={periodButton}
        open={picking && period !== 'all'}
        mode={period === 'year' ? 'year' : 'month'}
        anchor={anchor}
        onPick={(picked) => {
          setAnchor(picked)
          setPicking(false)
        }}
        onClose={() => setPicking(false)}
      />
    </View>
  )
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
          <Text className={unitClassName}>{unit}</Text>
        </View>
        {line ? <Text className="text-body-sm text-muted-foreground mt-2">{line}</Text> : null}
      </View>
    </Card>
  )
}

/** One currency's sum for the screen, its share of a figure (`US-071`). */
type CurrencyTally = { currency: Currency } & MoneyTally

/**
 * An amount and its symbol after it — the dollar's too (`US-071` AC-7a) — the
 * symbol a step smaller than the figure, in the same colour, as the mockup
 * draws them.
 */
function Amount({
  value,
  currency,
  figureClassName,
  unitClassName,
  figureStyle,
}: {
  value: number
  currency: Currency
  figureClassName: string
  unitClassName: string
  figureStyle?: { lineHeight: number; letterSpacing: number }
}) {
  return (
    <View className="min-w-0 flex-1 flex-row items-baseline gap-[5px]">
      <Text className={figureClassName} style={figureStyle} numberOfLines={1}>
        {formatAmountStats(value)}
      </Text>
      <Text className={unitClassName}>{currencySymbol(currency)}</Text>
    </View>
  )
}

/**
 * One currency's row under a money card's label: the sum on the left, «{n}
 * зйомок» on the right, a hairline under every row but the last
 * (`Statistics Currency Variants.dc.html`).
 */
function CurrencyRows({ rows, tone }: { rows: CurrencyTally[]; tone: 'success' | 'warn' }) {
  const t = useStrings()
  const colour = tone === 'success' ? 'text-success' : 'text-warn'
  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.currency}
          className={`min-h-[46px] flex-row items-center gap-2 ${
            index < rows.length - 1 ? 'border-border border-b' : ''
          }`}
        >
          <Amount
            value={row.sum}
            currency={row.currency}
            figureClassName={`text-[21px] font-semibold ${colour}`}
            figureStyle={{ lineHeight: 26, letterSpacing: -0.21 }}
            unitClassName={`text-body font-medium ${colour}`}
          />
          <Text className="text-label text-muted-foreground shrink-0">
            {`${row.shoots} ${plural(row.shoots, t.shootCountForms)}`}
          </Text>
        </View>
      ))}
    </View>
  )
}

/**
 * «Дохід» — `US-061` AC-3 as amended by `US-071` AC-2. One currency, or none:
 * the 38px figure as before, «0» in the account's currency. Two or more: a row
 * per currency, each with the shoots whose prepayment is in it.
 */
function IncomeCard({
  income,
  currency,
  line,
}: {
  income: CurrencyTally[]
  currency: Currency
  line: string
}) {
  const t = useStrings()
  if (income.length < 2) {
    const only = income[0]
    return (
      <HeroCard
        label={t.statsIncome}
        icon={CreditCard}
        tint="bg-chart-3"
        stripe="bg-success"
        // `US-071` AC-7a — «12 000 $», as everywhere on this screen.
        figure={formatAmountStats(only?.sum ?? 0)}
        unit={currencySymbol(only?.currency ?? currency)}
        unitClassName="text-title-lg text-success font-medium"
        figureClassName="text-success"
        line={line}
        strong
      />
    )
  }
  return (
    <Card variant="flat" className="border-border-strong flex-row gap-0 overflow-hidden p-0">
      <View className="bg-success w-[3px] shrink-0" />
      <View className="min-w-0 flex-1 px-[18px] pb-1 pt-4">
        <View className="flex-row items-center gap-2.5">
          <View className="bg-chart-3 h-7 w-7 shrink-0 items-center justify-center rounded-[9px]">
            <Icon as={CreditCard} size={16} strokeWidth={1.9} className="text-tint-foreground" />
          </View>
          <SectionLabel label={t.statsIncome} />
        </View>
        <View className="mt-1.5">
          <CurrencyRows rows={income} tone="success" />
        </View>
      </View>
    </Card>
  )
}

/**
 * «Очікує оплати» — `US-061` AC-6, `US-063` AC-1b as amended by `US-071` AC-3:
 * a card of its own with the unpaid shoots over every currency on the right,
 * and under the label the sum — or a row per currency with its own count.
 * Amber while something is owed; «Усі зйомки оплачені» in green once every
 * priced shoot is paid; nothing under the label when no shoot has a price.
 */
function UnpaidCard({
  unpaid,
  count,
  allPaid,
  onPress,
}: {
  unpaid: CurrencyTally[]
  count: number
  allPaid: boolean
  onPress: () => void
}) {
  const t = useStrings()
  const owed = count > 0
  return (
    <Pressable
      className="active:opacity-80"
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
    >
      <Card variant="flat" className="flex-row gap-0 overflow-hidden p-0">
        <View className={`w-[3px] shrink-0 ${owed ? 'bg-warn' : 'bg-success'}`} />
        <View className="min-w-0 flex-1 pb-1 pl-3.5 pr-3 pt-3.5">
          <View className="flex-row items-center gap-2">
            <View className="bg-chart-1 h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg">
              <Icon as={Clock} size={15} strokeWidth={1.9} className="text-tint-foreground" />
            </View>
            <View className="min-w-0 flex-1">
              <SectionLabel label={t.statsUnpaid} />
            </View>
            <Text
              className={`text-body-sm shrink-0 font-semibold ${
                owed ? 'text-warn' : 'text-muted-foreground'
              }`}
            >
              {owed ? `${count} ${plural(count, t.shootCountForms)}` : '0'}
            </Text>
            <Icon
              as={ChevronRight}
              size={16}
              strokeWidth={2}
              className="text-muted-foreground shrink-0"
            />
          </View>
          {owed && unpaid.length === 1 ? (
            <View className="mb-2.5 mt-3">
              <Amount
                value={unpaid[0].sum}
                currency={unpaid[0].currency}
                figureClassName="text-warn text-[20px] font-semibold"
                figureStyle={{ lineHeight: 23, letterSpacing: -0.2 }}
                unitClassName="text-body-sm text-warn font-medium"
              />
            </View>
          ) : owed ? (
            <View className="mb-1 mr-1 mt-1.5">
              <CurrencyRows rows={unpaid} tone="warn" />
            </View>
          ) : allPaid ? (
            <Text className="text-body-sm text-success my-2.5">{t.statsAllPaid}</Text>
          ) : (
            <View className="h-2.5" />
          )}
        </View>
      </Card>
    </Pressable>
  )
}

/**
 * One row of the lower cards: «В обробці», «Передано», «Прострочено», «Годин на
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
  sub = null,
  subClassName = 'text-muted-foreground',
  onPress,
  divided = false,
}: {
  label: string
  icon: LucideIcon
  tint: string
  value: string
  valueClassName?: string
  /** `US-061` AC-6 — the line under «Очікує оплати». */
  sub?: string | null
  subClassName?: string
  /** `US-062` AC-1 — makes the row a button; without it the row is inert. */
  onPress?: () => void
  divided?: boolean
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        tapped()
        onPress?.()
      }}
      role={onPress ? 'button' : undefined}
      className={`min-h-[54px] flex-row items-center gap-3 px-4 py-3 ${
        onPress ? 'active:bg-secondary' : ''
      } ${divided ? 'border-border border-t' : ''}`}
    >
      <View className={`h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg ${tint}`}>
        <Icon as={icon} size={14} strokeWidth={2} className="text-tint-foreground" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-body-sm text-muted-foreground">{label}</Text>
        {sub ? <Text className={`text-caption mt-[3px] ${subClassName}`}>{sub}</Text> : null}
      </View>
      <Text className={`text-subtitle shrink-0 font-semibold ${valueClassName}`}>{value}</Text>
      {/* `US-063` AC-2a — the profile rows' chevron, so the row reads as one. */}
      {onPress ? (
        <Icon
          as={ChevronRight}
          size={15}
          strokeWidth={2}
          className="text-muted-foreground -ml-1 shrink-0"
        />
      ) : null}
    </Pressable>
  )
}

/**
 * `US-061` AC-4 — one of the two half-width cards under «Дохід»: «Проведено»
 * and «Заплановано». The `HeroCard` shape at a smaller size — 26px chip, 32px
 * figure, the noun beside it and a line under it, as `Statistics.dc.html`
 * draws them. `onPress` makes it a button; without one it is inert.
 */
function CountCard({
  label,
  icon,
  tint,
  stripe,
  figure,
  figureClassName,
  unit,
  line,
  onPress,
}: {
  label: string
  icon: LucideIcon
  tint: string
  stripe: string
  figure: number
  figureClassName: string
  unit: string
  line: string
  onPress?: () => void
}) {
  const body = (
    // No `flex-1` here: the wrapper splits the width, and the card's height
    // comes from its content. A flexing card in a column whose height came from
    // the card collapsed to nothing on «Весь час» (owner's device, 2026-10-17).
    <Card variant="flat" className="flex-row gap-0 overflow-hidden p-0">
      <View className={`w-[3px] shrink-0 ${stripe}`} />
      <View className="min-w-0 flex-1 px-3.5 pb-[15px] pt-3.5">
        <View className="flex-row items-center gap-2">
          <View className={`h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg ${tint}`}>
            <Icon as={icon} size={15} strokeWidth={1.9} className="text-tint-foreground" />
          </View>
          <View className="min-w-0 flex-1">
            <SectionLabel label={label} />
          </View>
          {/* `US-063` AC-2a — top right, level with the label. */}
          {onPress ? (
            <Icon
              as={ChevronRight}
              size={15}
              strokeWidth={2}
              className="text-muted-foreground shrink-0"
            />
          ) : null}
        </View>
        <View className="mt-3 flex-row items-baseline gap-1.5">
          <Text
            className={`text-[32px] font-semibold ${figureClassName}`}
            style={{ lineHeight: 34, letterSpacing: -0.64 }}
          >
            {figure}
          </Text>
          <Text className="text-body-sm text-muted-foreground">{unit}</Text>
        </View>
        <Text className="text-caption text-muted-foreground mt-2" numberOfLines={1}>
          {line}
        </Text>
      </View>
    </Card>
  )
  if (!onPress) return <View className="flex-1">{body}</View>
  return (
    <Pressable
      className="flex-1 active:opacity-80"
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
    >
      {body}
    </Pressable>
  )
}

/** `US-061` AC-1 — ‹ «Жовтень 2026 ▾» ›, under the period tabs. */
function PeriodStepper({
  label,
  onPrev,
  onNext,
  onOpen,
  compact,
  labelRef,
}: {
  /** `US-057` — on the desktop, as wide as the label rather than the row. */
  compact?: boolean
  /** Where the desktop's period popover opens. */
  labelRef?: RefObject<View | null>
  label: string
  onPrev: () => void
  onNext: () => void
  onOpen: () => void
}) {
  const t = useStrings()
  const arrow = (icon: LucideIcon, onPress: () => void, name: string) => (
    <Pressable
      className="bg-card border-border h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border active:opacity-70"
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
      accessibilityLabel={name}
    >
      <Icon as={icon} size={18} strokeWidth={2} className="text-foreground" />
    </Pressable>
  )
  return (
    <View className="flex-row items-center gap-1.5">
      {arrow(ChevronLeft, onPrev, t.statsPrevPeriod)}
      <Pressable
        ref={labelRef}
        className={`bg-card border-border h-11 min-w-0 ${
          compact ? 'px-4' : 'flex-1'
        } flex-row items-center justify-center gap-1.5 rounded-[10px] border active:opacity-70`}
        onPress={onOpen}
        role="button"
        accessibilityLabel={t.statsChoosePeriod}
      >
        <Text className="text-body text-foreground font-semibold">{label}</Text>
        <Icon as={ChevronDown} size={15} strokeWidth={2} className="text-muted-foreground" />
      </Pressable>
      {arrow(ChevronRight, onNext, t.statsNextPeriod)}
    </View>
  )
}

/**
 * `US-061` AC-2 — pick a month (a year with ‹ › over twelve months) or a year
 * (twelve at a time, ‹ › to the next twelve). The chosen cell is filled, the
 * current one outlined; «Поточний місяць / рік» jumps back to today.
 */
function PeriodSheet({
  open,
  mode,
  anchor,
  onPick,
  onClose,
  popoverAnchor,
}: {
  /** `US-057` — the period button, which the desktop's popover opens under. */
  popoverAnchor?: RefObject<View | null>
  open: boolean
  mode: 'month' | 'year'
  anchor: StatsAnchor
  onPick: (anchor: StatsAnchor) => void
  onClose: () => void
}) {
  const t = useStrings()
  const today = new Date()
  const current = { year: today.getFullYear(), month: today.getMonth() + 1 }
  // The month sheet's year, or the first of the twelve years on show.
  const [page, setPage] = useState(anchor.year)
  const [shown, setShown] = useState(false)
  if (open && !shown) {
    setShown(true)
    setPage(mode === 'month' ? anchor.year : anchor.year - 5)
  } else if (!open && shown) {
    setShown(false)
  }

  const cells =
    mode === 'month'
      ? t.months.map((name, index) => ({
          key: String(index),
          label: name.slice(0, 3),
          chosen: anchor.year === page && anchor.month === index + 1,
          isCurrent: current.year === page && current.month === index + 1,
          pick: () => onPick({ year: page, month: index + 1 }),
        }))
      : Array.from({ length: 12 }, (_, index) => {
          const year = page + index
          return {
            key: String(year),
            label: String(year),
            chosen: anchor.year === year,
            isCurrent: current.year === year,
            pick: () => onPick({ year, month: anchor.month }),
          }
        })
  const pageBy = mode === 'month' ? 1 : 12
  const pageLabel = mode === 'month' ? String(page) : `${page} – ${page + 11}`

  return (
    <Sheet open={open} onClose={onClose} anchor={popoverAnchor}>
      <View className="min-h-9 flex-row items-center justify-between">
        <Text className="text-subtitle text-foreground font-semibold">
          {mode === 'month' ? t.statsChooseMonth : t.statsChooseYear}
        </Text>
        <Pressable onPress={onClose} role="button" className="min-h-11 justify-center px-0.5">
          <Text className="text-body text-link font-medium">{t.closeWord}</Text>
        </Pressable>
      </View>

      <View className="my-1.5 flex-row items-center justify-between">
        <Pressable
          onPress={() => setPage((value) => value - pageBy)}
          role="button"
          accessibilityLabel={t.statsPrevPeriod}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon as={ChevronLeft} size={18} strokeWidth={2} className="text-foreground" />
        </Pressable>
        <Text className="text-body text-foreground font-semibold">{pageLabel}</Text>
        <Pressable
          onPress={() => setPage((value) => value + pageBy)}
          role="button"
          accessibilityLabel={t.statsNextPeriod}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon as={ChevronRight} size={18} strokeWidth={2} className="text-foreground" />
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {cells.map((cell) => (
          <Pressable
            key={cell.key}
            onPress={() => {
              tapped()
              cell.pick()
            }}
            role="button"
            className={`h-12 basis-[31%] grow items-center justify-center rounded-[10px] border ${
              cell.chosen
                ? 'bg-primary border-primary'
                : cell.isCurrent
                  ? 'bg-background border-muted-foreground'
                  : 'bg-background border-border'
            }`}
          >
            <Text
              className={`text-body ${
                cell.chosen
                  ? 'text-primary-foreground font-semibold'
                  : cell.isCurrent
                    ? 'text-foreground font-semibold'
                    : 'text-foreground font-medium'
              }`}
            >
              {cell.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => onPick(current)}
        role="button"
        className="border-border mt-3.5 h-11 items-center justify-center rounded-[10px] border active:opacity-70"
      >
        <Text className="text-body text-foreground font-medium">
          {mode === 'month' ? t.statsThisMonth : t.statsThisYear}
        </Text>
      </Pressable>
    </Sheet>
  )
}
