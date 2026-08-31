import { useCallback, useEffect, useState } from 'react'
import { SectionLabel } from '../../src/components/ShootFormFields'
import { Pressable, ScrollView, View } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Badge } from '../../src/components/ui/badge'
import { Button } from '../../src/components/ui/button'
import { Card } from '../../src/components/ui/card'
import { Text } from '../../src/components/ui/text'
import { Avatar } from '../../src/components/Avatar'
/*
 * A deep per-icon import, never the `lucide-react-native` barrel: Metro does
 * not tree-shake, so the barrel ships all ~2,000 icon components and doubled
 * the web bundle last time (S-2 F-5). The same rule select.tsx follows.
 */
import Bell from 'lucide-react-native/icons/bell'
import CalendarIcon from 'lucide-react-native/icons/calendar'
import MapPin from 'lucide-react-native/icons/map-pin'
import { Icon } from '../../src/components/ui/icon'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { useProfile } from '../../src/features/auth/useProfile'
import { tapped } from '../../src/lib/haptics'
import { listShoots, type Shoot } from '../../src/features/shoots/api'
import { listCrew } from '../../src/features/crew/api'
import {
  dayOfMonth,
  formatDayMonth,
  formatTimeRange,
  shortMonth,
} from '../../src/features/shoots/date'
import {
  daysUntil,
  distanceLabel,
  nextShoot,
  todayLabel,
  upcomingShoots,
} from '../../src/features/shoots/home'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded'
      /** AC-4's shoot, or null when nothing is upcoming (AC-5). */
      next: Shoot | null
      /**
       * Whether the account has any shoot at all, past ones included.
       *
       * Separate from `next` because the two absences are different screens: an
       * account with nothing in it gets the empty state below, while one whose
       * shoots are all in the past keeps AC-5's silence — see the note there.
       */
      hasAny: boolean
      /** How many of that shoot's crew have confirmed, and how many there are. */
      confirmed: { done: number; total: number } | null
      /** Everything upcoming after `next` — the «Наступні зйомки» list. */
      upcoming: Shoot[]
    }

/**
 * `US-035` — the home screen, and the `(app)` index.
 *
 * Answers the question the app is opened with — "what is next" — rather than
 * "what do I have", which is the shoot list's question and now lives at
 * `/(app)/shoots`.
 *
 * Everything on it is derived. There is no new table and no new column: the next
 * shoot is the soonest row dated today or later, the countdown is arithmetic,
 * and the confirmation count reads `CrewMember.response` (`US-008`).
 *
 * ── Departures from home-screen.html, all in the story's Out of scope ────────
 *
 * **The bell does nothing.** Its mockup handler shows «Гліб підтвердив участь
 * у зйомці 19 вересня», which implies a notification system: there is no table,
 * no read state and no delivery anywhere in the product. Rendered inert at the
 * owner's decision (2026-08-28) so the screen matches. **The unread dot is drawn
 * and reflects nothing** — the one thing on this screen that states something
 * untrue, and the reason it is worth building notifications or removing the dot.
 *
 * **No name in the greeting.** «Доброго дня, Дарино» is the vocative of
 * «Дарина» and we store one nominative `name`; declining it in code would
 * mangle the names the rules do not cover. Owner's decision.
 *
 * **No statistics cards.** «Зйомок цього місяця» and «Очікують підтвердження»
 * are in the mockup and were removed at the owner's request.
 */
export default function HomeScreen() {
  const t = useStrings()
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoots = await listShoots()
        if (!active) return
        if (!shoots) return setState({ status: 'error' })

        const next = nextShoot(shoots)
        // Crew is fetched only for the one shoot on screen. The list screen
        // needs names for every row and has its own bulk query; here a single
        // shoot's crew is one request, and a failure leaves the count off the
        // card rather than failing the screen.
        const crew = next ? await listCrew(next.id) : null
        if (!active) return

        setState({
          status: 'loaded',
          next,
          hasAny: shoots.length > 0,
          confirmed: crew
            ? { done: crew.filter((m) => m.response === 'confirmed').length, total: crew.length }
            : null,
          upcoming: upcomingShoots(shoots),
        })
      })()
      return () => {
        active = false
      }
    }, [])
  )

  return (
    <View className="bg-background flex-1">
      <HomeHeader />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="gap-3 px-4 pb-8">
          {/*
            `Home.dc.html`'s order, and it is a reversal: the next shoot comes
            FIRST and the two buttons sit under it. They used to lead the screen.

            It is the better answer to the question this screen exists for
            (`US-035` — "what is next"): the shoot is the answer, and the buttons
            are what you do when the answer is not enough.
          */}
          {state.status === 'error' ? (
            <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
          ) : state.status === 'loaded' && state.next ? (
            <View>
              {daysUntil(state.next.date) <= 0 ? (
                /*
                  The «Сьогодні» state. It used to be amber — `home-screen-2.html`
                  called a shoot today «радше нагадування, ніж звичайний запис».
                  `Home.dc.html` draws it **monochrome**: a white pulsing dot, a
                  white label, a white stripe and a solid white badge.

                  That retired the last colour scale in the app. `warning` was
                  the one the 2026-08-30 monochrome pass kept, and its own note
                  in global.css said it was "the obvious next question if «no
                  colour tints» is meant literally". This design answered it.
                */
                <View className="mb-2 flex-row items-center gap-1.5 px-0.5">
                  <PulseDot />
                  <SectionLabel label={t.todayWord} />
                </View>
              ) : (
                <View className="mb-2 px-0.5">
                  <SectionLabel label={t.nextShootLabel} />
                </View>
              )}
              <NextShootCard shoot={state.next} confirmed={state.confirmed} />
            </View>
          ) : state.status === 'loaded' && !state.hasAny ? (
            /*
              The empty state, now **on a card** rather than bare on the frame,
              as drawn. Its copy changed with it: the old line said «Натисніть
              «Нова зйомка» **вище**», and the button is below this block now.
            */
            <Card variant="flat" className="items-center px-5 py-7">
              <Icon
                as={CalendarIcon}
                size={34}
                strokeWidth={1.6}
                className="text-border-strong mb-3"
              />
              <Text className="text-body text-foreground font-semibold">{t.emptyNextTitle}</Text>
              <Text
                className="text-body-sm text-muted-foreground mt-1.5 text-center leading-5"
                style={{ maxWidth: 250 }}
              >
                {t.emptyNextSub}
              </Text>
            </Card>
          ) : null}
          {/*
            AC-5 — with shoots on the account but none upcoming, the section is
            still absent entirely, label included. That case is not the empty
            state above: the design draws nothing for it, and «no upcoming
            shoots» would be copy no story supplies.
          */}

          <View className="gap-2">
            {/* AC-3 — the primary action. 48px, radius 10, as drawn; it was a
                larger 18pt pill at radius 16 while it led the screen. */}
            <Button
              variant="cta"
              size="cta"
              className="h-12 justify-center rounded-lg py-0"
              onPress={() => router.push('/(app)/new-shoot')}
            >
              <Text className="text-subtitle font-semibold">{`+  ${t.newShootTitle}`}</Text>
            </Button>

            {/* AC-3 — and the way to the list, which used to be this route.
                `outline` now, not `secondary`: the design gives it a border on
                the page colour rather than a raised fill. */}
            <Button
              variant="outline"
              size="cta"
              className="h-11 justify-center rounded-lg py-0"
              onPress={() => router.push('/(app)/shoots')}
            >
              {/*
                `Icon` reads the surrounding TextClassContext, which Button sets
                per variant — so the glyph takes the label's colour rather than
                being told one, and cannot drift from it.
              */}
              <Icon as={CalendarIcon} size={15} strokeWidth={1.7} />
              <Text className="text-body-sm text-foreground font-medium">{t.viewCalendar}</Text>
            </Button>
          </View>

          {/*
            «Наступні зйомки» — new on this screen. Everything after the shoot in
            the card above, so the two never show the same shoot twice (see
            `upcomingShoots`, and the prototype bug it does not copy).
          */}
          {state.status === 'loaded' && state.upcoming.length > 0 ? (
            <View className="mt-2.5">
              <View className="mb-2 flex-row items-baseline justify-between px-0.5">
                <SectionLabel label={t.upcomingShootsLabel} />
                <Link href="/(app)/shoots" asChild>
                  <Pressable hitSlop={10} onPress={tapped} role="button">
                    <Text className="text-label text-foreground font-medium">{t.seeAll}</Text>
                  </Pressable>
                </Link>
              </View>
              <Card variant="flat" className="gap-0 p-0">
                {state.upcoming.map((shoot, index) => (
                  <UpcomingRow key={shoot.id} shoot={shoot} divided={index > 0} />
                ))}
              </Card>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

/**
 * One row of «Наступні зйомки»: a date column, a hairline, the shoot, a status.
 *
 * The status is a plain outline `Badge` rather than `StatusPill`. The design
 * draws every row's badge the same — an outline chip, whatever the status — and
 * on a list where every row says «Заплановано» a fill would be noise. The word
 * still distinguishes them.
 */
function UpcomingRow({ shoot, divided }: { shoot: Shoot; divided: boolean }) {
  const t = useStrings()
  const range = formatTimeRange(shoot.startTime, shoot.endTime)
  const STATUS_LABEL: Record<Shoot['status'], string> = {
    new: t.statusNew,
    finished: t.statusFinished,
  }

  return (
    <Link href={`/(app)/shoot/${shoot.id}`} asChild>
      <Pressable
        className={`min-h-[60px] flex-row items-center gap-3 px-3.5 py-3 active:bg-secondary ${
          divided ? 'border-border border-t' : ''
        }`}
        onPress={tapped}
        role="button"
        accessibilityLabel={shoot.clientName}
      >
        <View className="w-10 shrink-0">
          <Text className="text-body text-foreground font-semibold">
            {dayOfMonth(shoot.date)}
          </Text>
          <Text className="text-caption text-muted-foreground mt-0.5">
            {shortMonth(shoot.date, t.monthsGenitive)}
          </Text>
        </View>

        {/* The design's 1px vertical rule between the date and the shoot. */}
        <View className="bg-border w-px self-stretch" />

        <View className="min-w-0 flex-1">
          <Text className="text-body-sm text-foreground font-semibold" numberOfLines={1}>
            {shoot.clientName}
          </Text>
          <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={1}>
            {[range, shoot.locationAddress].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <Badge variant="outline" label={STATUS_LABEL[shoot.status]} />
      </Pressable>
    </Link>
  )
}

/**
 * The greeting, the date, and the two controls on the right.
 *
 * Outside the ScrollView (§5.1) and carrying the safe-area top inset, which the
 * mockups have no notion of.
 */
function HomeHeader() {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  const profile = useProfile()
  const name = profile.status === 'loaded' ? profile.profile.name : ''

  return (
    <View
      /*
        px-4, matching the content below. The mockup writes the header as
        `padding: 0 6px` — but that sits inside `.phone`'s own 14px, landing at
        20. This header is a sibling of the ScrollView, not nested in a padded
        container, so 6px here would be 6px absolute and the greeting would sit
        10px left of the buttons under it.
      */
      className="flex-row items-start justify-between px-4 pb-5"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="flex-1 pr-3">
        <Text className="text-numeric-xl text-foreground font-bold">{t.greeting}</Text>
        <Text className="text-body-sm text-muted-foreground mt-1 font-medium">
          {todayLabel(new Date(), t.weekdaysFull, t.monthsGenitive)}
        </Text>
      </View>

      <View className="mt-0.5 flex-row items-center gap-2">
        {/*
          The bell. Inert — see the note on this screen. The dot is drawn as the
          mockup draws it and reflects nothing.
        */}
        <Pressable
          className="border-border h-10 w-10 shrink-0 items-center justify-center rounded-lg border active:bg-secondary"
          onPress={tapped}
          hitSlop={4}
          role="button"
          accessibilityLabel={t.notifications}
        >
          {/* A lucide bell, not the 🔔 emoji this drew: an emoji renders in its
              own colours and is a different glyph on every platform. */}
          <Icon as={Bell} size={17} strokeWidth={1.7} className="text-foreground" />
          {/* The unread dot. `foreground` now, not `destructive` — the design
              draws it white, and the monochrome pass left no reason for a red
              one. It still reflects nothing; see the note on this screen. */}
          <View className="border-background bg-foreground absolute right-[9px] top-[9px] h-[7px] w-[7px] rounded-full border-2" />
        </Pressable>

        <Link href="/(app)/profile" asChild>
          {/* A plain 40pt avatar. The chevron beside it is gone with the pill
              it sat in — the design draws the avatar alone. */}
          <Pressable
            className="shrink-0 rounded-full active:opacity-70"
            onPress={tapped}
            role="button"
            accessibilityLabel={t.profileTitle}
          >
            {name ? (
              <Avatar name={name} size={40} />
            ) : (
              <View className="bg-secondary h-10 w-10 rounded-full" />
            )}
          </Pressable>
        </Link>
      </View>
    </View>
  )
}

/**
 * The 7px dot beside «СЬОГОДНІ», pulsing.
 *
 * `home-screen-2.html`'s `@keyframes pulse`: 1.6s ease-in-out, infinite,
 * alternating — opacity 1 → .4 and scale 1 → .7 at the half-way point. One
 * shared value drives both, so they cannot drift; the 1.6s cycle is 800ms out
 * and 800ms back, which is what `withRepeat(..., -1, true)` does.
 *
 * `ReduceMotion.System` is the same setting the overlays use (select.tsx):
 * someone who has asked the OS for less motion gets a still dot, not a
 * slightly-calmer one.
 *
 * A plain `Animated.View`, not `NativeOnlyAnimatedView` — that helper returns
 * only its children on web, and this element has none: it IS the dot, so the web
 * export would render nothing.
 */
function PulseDot() {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true
    )
  }, [progress])

  const animated = useAnimatedStyle(() => ({
    opacity: 1 - 0.6 * progress.value,
    transform: [{ scale: 1 - 0.3 * progress.value }],
  }))

  return (
    <Animated.View
      className="bg-foreground h-[7px] w-[7px] rounded-full"
      style={animated}
    />
  )
}

/**
 * AC-4's card: a 5px status stripe, then the shoot.
 *
 * **A light card, on purpose** (owner, 2026-08-29) — the one bright surface on
 * the home screen, so the next shoot reads before anything else does.
 *
 * It uses `primary` rather than a new white token. In RNR's dark theme
 * `--primary` *is* the near-white surface and `--primary-foreground` the dark
 * text that belongs on it, so this stays inside the stock palette instead of
 * reintroducing a colour of our own.
 *
 * Every text inside therefore flips: the card's contents cannot use
 * `card-foreground` or `muted-foreground`, both of which are light and would
 * vanish. Secondary text is `primary-foreground` at reduced opacity, which is
 * only possible because the config carries `<alpha-value>`.
 *
 * `overflow-hidden` with the elevation on the same View is what lets the stripe
 * reach the rounded corners — the same arrangement as the agenda row.
 *
 * Brought back onto `home-screen.html`'s `.next-card` on 2026-08-29: the status
 * was a second chip where the mockup writes it as text, the location pin was an
 * emoji, the radius was 24 rather than 20, and the stripe and countdown chip
 * were the wrong colour — that last one fixed in global.css rather than here,
 * by re-toning the status triples to the design system's own.
 */
function NextShootCard({
  shoot,
  confirmed,
}: {
  shoot: Shoot
  confirmed: { done: number; total: number } | null
}) {
  const t = useStrings()
  const range = formatTimeRange(shoot.startTime, shoot.endTime)
  const days = daysUntil(shoot.date)
  /*
   * `.next-card.today` in `home-screen-2.html`: a shoot happening today reads
   * amber rather than by status — the stripe and the chip both. `<= 0` rather
   * than `=== 0` for the same reason `distanceLabel` uses it: a shoot dated in
   * the past is still «Сьогодні» on this card rather than a negative countdown.
   */
  const isToday = days <= 0
  const STATUS_LABEL: Record<Shoot['status'], string> = {
    new: t.statusNew,
    finished: t.statusFinished,
  }

  return (
    <Link href={`/(app)/shoot/${shoot.id}`} asChild>
      <Pressable onPress={tapped} className="active:opacity-70">
        {/*
          **A dark card, bordered** — `Home.dc.html`, and a reversal of what this
          was. It had been the one bright surface on the screen, `bg-primary`
          filled, so that the next shoot read before anything else; the design
          makes it `#09090b` inside `#27272a` like every other card and lets the
          3px stripe and the badge do that work instead.

          Everything inside therefore un-inverts. The card's text was
          `primary-foreground` at various opacities, because `card-foreground`
          and `muted-foreground` are light and would have vanished on white.
          Those are simply the right tokens again.

          A stronger border when the shoot is today (`#3f3f46`), which is the
          design's quietest way of marking it.
        */}
        <View
          className={`flex-row overflow-hidden rounded-xl border bg-background ${
            isToday ? 'border-border-strong' : 'border-border'
          }`}
        >
          {/* 3px, and monochrome: white today, receding grey otherwise. The
              status no longer picks it — `STRIPE` went with the amber. */}
          <View
            className={`w-[3px] self-stretch ${isToday ? 'bg-foreground' : 'bg-border-strong'}`}
          />

          <View className="flex-1 px-4 py-3.5">
            <View className="flex-row items-center justify-between gap-2.5">
              <Text className="text-label text-muted-foreground flex-1 font-medium" numberOfLines={1}>
                {[formatDayMonth(shoot.date, t.monthsGenitive), range].filter(Boolean).join(' · ')}
              </Text>
              {/*
                The countdown badge. «Сьогодні» and «Завтра» are new copy — the
                mockups only ever show the «за N днів» form.

                Solid when the shoot is today, outlined otherwise: the same
                fill-vs-outline pair the monochrome pass gave every other badge,
                and `Badge` already holds it. It used to be amber-on-amber, which
                is what retired the `warning` scale.
              */}
              <Badge
                variant={isToday ? 'solid' : 'outline'}
                label={distanceLabel(days, t)}
              />
            </View>

            <Text className="text-title-sm text-foreground mt-2.5 font-semibold" numberOfLines={1}>
              {shoot.clientName}
            </Text>

            <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
              {[
                STATUS_LABEL[shoot.status],
                confirmed && confirmed.total > 0
                  ? t.crewConfirmedTemplate
                      .replace('{done}', String(confirmed.done))
                      .replace('{total}', String(confirmed.total))
                  : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            {/*
              The footer: the location, and «Деталі →» on the right. The arrow is
              new — the card was already tappable and said so with nothing.

              `border-border` is the theme's own hairline again; it had to be the
              card's text at low opacity while the card was white.
            */}
            <View className="border-border mt-2.5 flex-row items-center gap-2 border-t pt-2.5">
              <Icon as={MapPin} size={13} strokeWidth={1.7} className="text-muted-foreground" />
              <Text className="text-label text-muted-foreground flex-1" numberOfLines={1}>
                {shoot.locationAddress ?? ''}
              </Text>
              <Text className="text-label text-foreground shrink-0 font-medium">
                {`${t.openDetails} →`}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  )
}

