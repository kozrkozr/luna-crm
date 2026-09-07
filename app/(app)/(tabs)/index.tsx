import { useCallback, useEffect, useState } from 'react'
import { SectionLabel } from '../../../src/components/ShootFormFields'
import { Image, Pressable, ScrollView, View } from 'react-native'
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
import { Badge } from '../../../src/components/ui/badge'
import { Button } from '../../../src/components/ui/button'
import { Card } from '../../../src/components/ui/card'
import { StatusPill } from '../../../src/components/StatusPill'
import { Text } from '../../../src/components/ui/text'
import { Avatar } from '../../../src/components/Avatar'
import { TabHeader } from '../../../src/components/TabHeader'
/*
 * A deep per-icon import, never the `lucide-react-native` barrel: Metro does
 * not tree-shake, so the barrel ships all ~2,000 icon components and doubled
 * the web bundle last time (S-2 F-5). The same rule select.tsx follows.
 */
import Bell from 'lucide-react-native/icons/bell'
import MapPin from 'lucide-react-native/icons/map-pin'
import { Icon } from '../../../src/components/ui/icon'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { useProfile } from '../../../src/features/auth/useProfile'
import { resolveAvatar } from '../../../src/features/auth/avatar'
import { signedAvatarUrl } from '../../../src/features/auth/profile'
import { failed, tapped } from '../../../src/lib/haptics'
import { useDestructiveConfirm } from '../../../src/components/DestructiveAction'
import { SwipeDismissBoundary, SwipeToDelete } from '../../../src/components/SwipeToDelete'
import { deleteShoot, listShoots, type Shoot } from '../../../src/features/shoots/api'
import { listCrew } from '../../../src/features/crew/api'
import {
  dayOfMonth,
  formatDayMonth,
  formatTimeRange,
  shortMonth,
} from '../../../src/features/shoots/date'
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationsRead,
  type ShootNotification,
} from '../../../src/features/notifications/api'
import { NotificationsPopover } from '../../../src/components/NotificationsPopover'
import {
  daysUntil,
  distanceLabel,
  nextShoot,
  todayLabel,
  upcomingShoots,
} from '../../../src/features/shoots/home'
import { Starfield } from '../../../src/components/Starfield'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'loaded'
      /** AC-4's shoot, or null when nothing is upcoming (AC-5). */
      next: Shoot | null
      /**
       * Unread notifications — what the bell's dot means since 2026-09-06.
       *
       * A count and not a list: this screen only ever asks whether there are
       * any, and the screen behind the bell does its own fetch.
       */
      unread: number
      /**
       * Whether the account has any shoot at all, past ones included.
       *
       * Separate from `next` because the two absences read differently: an
       * account with nothing in it is told to create its first shoot, while one
       * whose shoots are all in the past is told there is nothing scheduled.
       * Same card, one word apart — and until 2026-09-05 the second said
       * nothing at all (`US-035` AC-5).
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
 * **The bell works as of 2026-09-06.** It was inert from 2026-08-28 — no table,
 * no read state, no delivery — with an unread dot drawn unconditionally, which
 * this note called "the one thing on this screen that states something untrue".
 * Migration `20260906120000` gives it a table and a trigger; the bell opens
 * «Сповіщення» and the dot counts unread crew answers.
 *
 * Its mockup handler showed «Гліб підтвердив участь у зйомці 19 вересня», and
 * that sentence is still NOT what the screen behind it says: Ukrainian needs a
 * gendered verb for it and nothing here stores a gender, so the list reuses the
 * crew list's own «Підтверджено» / «Відмова» pill instead. See
 * `app/(app)/notifications.tsx`.
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
  /*
    Bumped after a swipe-delete to refetch without waiting for focus to change.
    The screen is already focused when a row is deleted from it, so
    `useFocusEffect` alone would leave the hero slot empty until the user
    navigated away and back — the shoot that should be promoted into it is only
    knowable from the full list.
  */
  const [reloadKey, setReloadKey] = useState(0)

  /*
    The bell's popover — `Home.dc.html` draws one anchored under the bell rather
    than a screen behind it, so it lives here on the screen it belongs to.

    Held as `null` when closed and a list when open: the fetch happens on the
    tap, not on every focus. The home screen already asks for a COUNT on focus,
    which is all the bell itself needs.
  */
  const [notifications, setNotifications] = useState<ShootNotification[] | null>(null)

  const openBell = async () => {
    const items = await listNotifications()
    // A failure opens nothing rather than an empty popover claiming there is
    // nothing to see. The bell's dot still says otherwise, which is the honest
    // pair of states.
    if (!items) return
    setNotifications(items)
    /*
      Opening IS the reading, so this marks everything read and drops the dot on
      the next focus. The rows keep the tint they opened with — nothing here
      re-renders them — so the reader can still tell which were new while the
      popover is up.
    */
    void markNotificationsRead().then(() => setState((current) =>
      current.status === 'loaded' ? { ...current, unread: 0 } : current
    ))
  }

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

        /*
          The bell's dot, which reflected nothing until 2026-09-06 — see
          `HomeHeader`. Fetched here rather than in the header so the screen
          makes one pass over the network per focus, and counted rather than
          listed: the home screen never needs the bodies.
        */
        const unread = await unreadNotificationCount()
        if (!active) return

        setState({
          status: 'loaded',
          next,
          unread,
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
    }, [reloadKey])
  )

  /*
    `US-019` — the same soft delete the shoot-detail screen performs, reached by
    swiping a row (`SwipeToDelete`). AC-2 is required and this hook is the whole
    of it: a real iOS alert on device, a dialog on web, and `deleteShoot` runs
    only from inside it.

    Generic over the `Shoot` so the question carries which row was swiped all
    the way to the confirm — the alternative is a second piece of state that can
    drift from what the alert is asking about.
  */
  const { ask: askDelete, dialog: deleteDialog } = useDestructiveConfirm<Shoot>({
    label: t.deleteShoot,
    question: t.confirmDeleteShoot,
    onConfirm: (shoot) => {
      void (async () => {
        if (!(await deleteShoot(shoot.id))) {
          /*
            The write did not happen and the row stays. No message: no story
            supplies one for a failed delete, and `deleteShoot` returns a bare
            boolean that does not say why (the RPC is deliberately silent about
            whether the shoot was missing or not the caller's). The refused
            haptic is the feedback — `haptics.ts` names this case — and the
            screen is still true, which is the part that matters.
          */
          failed()
          return
        }
        /*
          Drop it locally first so the row goes at once, then refetch, because
          the full list is what decides which shoot is next.

          **Deleting the hero promotes the first upcoming one locally**, rather
          than leaving the slot empty until the round trip returns. It has to
          since 2026-09-05: an empty hero slot with `hasAny` true now draws
          «Немає запланованих зйомок», so the gap that used to be blank would
          flash a sentence that is false — there ARE upcoming shoots, one of
          them is simply about to move up. Promoting locally shows the true
          answer immediately and the refetch confirms it.

          The promoted shoot carries `confirmed: null`: the crew count is
          fetched for the hero alone, so it is genuinely unknown until the
          refetch. The card drops that line rather than showing a stale count
          belonging to the shoot that was just deleted.
        */
        setState((current) => {
          if (current.status !== 'loaded') return current
          const upcoming = current.upcoming.filter((row) => row.id !== shoot.id)
          if (current.next?.id !== shoot.id) return { ...current, upcoming }
          const [promoted, ...rest] = upcoming
          return {
            ...current,
            next: promoted ?? null,
            confirmed: promoted ? null : current.confirmed,
            upcoming: promoted ? rest : upcoming,
          }
        })
        setReloadKey((key) => key + 1)
      })()
    },
  })

  return (
    <View className="bg-background flex-1">
      <Starfield />
      {/* Everything the user can touch goes inside, so an open row closes on a
          tap anywhere but its «Видалити». The Starfield is outside because it
          is painted behind and takes no touches; `deleteDialog` is outside
          because the boundary must not intercept the confirmation itself. */}
      <SwipeDismissBoundary>
        {/* `hasShoots` gates the bell — see the note there. Unknown while
            loading, which is when the artboard draws nothing either. */}
        <HomeHeader
          hasShoots={state.status === 'loaded' ? state.hasAny : false}
          unread={state.status === 'loaded' ? state.unread : 0}
          onOpenBell={() => void openBell()}
        />
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          {/*
            Room for the pinned CTA below (owner, 2026-09-06), where this was
            `pb-10`.

            That 40 came from the artboard, which ends its scroll container at
            `padding-bottom:114` with 75 of it the bottom bar — the navigator
            reserves the bar's height, its screens being a flex child ABOVE it
            rather than underneath, so 39 was what belonged here. The button now
            sits in that space instead of scrolling with the list, so the
            padding has to clear the button as well as the bar.
          */}
          {/*
            `pt-3` (owner, 2026-09-07) — «НАЙБЛИЖЧА ЗЙОМКА» was sitting straight
            under the header's hairline. This screen had no top padding at all,
            and did not need one while the header carried `pb-5`; the shared
            `TabHeader` ends at the artboard's own `pb-2`, so the gap the
            greeting used to provide had to move here, where it belongs.

            12 is the artboard's figure — its scroll container starts at
            `padding-top:112` against a header that measures ~100 — and it is
            what «Календар», «Мої контакти» and «Статистика» already use, so the
            four tabs now begin at the same height as well as ending at one.
          */}
          <View className="gap-3 px-4 pb-24 pt-3">
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
                    The «Сьогодні» state. It was amber, then monochrome-white for
                    the fortnight the app had no colour, then a `--success` dot
                    over a blue stripe and chip — and since 2026-09-06 all three
                    are `--success` (owner). Three signals, one colour, and none
                    of them merely "brighter than the rest of the screen", which
                    is what the white version had to be.
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
                {/* The hero card swipes too, at the owner's request — it is a
                    shoot like any other, and being the nearest one is not a
                    reason to have to open it to remove it.

                    `hero` rather than `state.next` inside the handler: the
                    narrowing above does not survive into a closure, and a local
                    const is the honest way to keep it — a cast would be a
                    promise the type system is not making. */}
                <HeroCard shoot={state.next} confirmed={state.confirmed} onRequestDelete={askDelete} />
              </View>
            ) : state.status === 'loaded' ? (
              /*
                Nothing is coming up — and there are two ways to arrive here.

                `Home.dc.html` draws one of them: an account with no shoots at
                all. **The other is new** (owner, 2026-09-05): shoots on the
                account, all of them in the past. `US-035` AC-5 kept that one
                silent and the log flagged it as needing the owner's word on
                2026-08-29; this is that word. A screen whose only content is two
                buttons was the thing AC-5 left behind.

                One card either way. The states differ only in whether the reader
                has history, so they get the same surface, the same glyph and
                the same shape of sentence — a different voice would imply a
                different kind of absence.
              */
              <Card variant="flat" className="items-center px-5 py-[30px]">
                <EmptyCalendarGlyph />
                <Text className="text-body text-foreground font-semibold">
                  {state.hasAny ? t.noUpcomingTitle : t.emptyNextTitle}
                </Text>
                <Text
                  className="text-body-sm text-muted-foreground mt-1.5 text-center leading-5"
                  style={{ maxWidth: 250 }}
                >
                  {state.hasAny ? t.noUpcomingSub : t.emptyNextSub}
                </Text>
              </Card>
            ) : null}
            {/*
              «Наступні зйомки» stays absent when there is nothing in it — the
              card above has already said so, and a heading over nothing would
              say it twice. AC-5's silence now applies to this section only; the
              screen itself speaks, which is the part the owner changed.
            */}

            {/*
              «Наступні зйомки» — new on this screen. Everything after the shoot in
              the card above, so the two never show the same shoot twice (see
              `upcomingShoots`, and the prototype bug it does not copy).
            */}
            {state.status === 'loaded' && state.upcoming.length > 0 ? (
              <View className="mt-2.5">
                <View className="mb-2 flex-row items-baseline justify-between px-0.5">
                  <SectionLabel label={t.upcomingShootsLabel} />
                  <Link href="/(app)/(tabs)/shoots" asChild>
                    <Pressable hitSlop={10} onPress={tapped} role="button">
                      <Text className="text-label text-foreground font-medium">{t.seeAll}</Text>
                    </Pressable>
                  </Link>
                </View>
                {/*
                  Separate cards with 8px between them, not one card with
                  hairlines. `Home.dc.html` draws each upcoming shoot as its own
                  `border-radius:12px` surface inside a `gap:8px` column — see
                  `UpcomingRow`.
                */}
                <View className="gap-2">
                  {state.upcoming.map((shoot) => (
                    <SwipeToDelete key={shoot.id} onRequestDelete={() => askDelete(shoot)}>
                      <UpcomingRow shoot={shoot} />
                    </SwipeToDelete>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/*
          «+ Нова зйомка», pinned (owner, 2026-09-06) — the arrangement the
          calendar has had since 2026-09-04, and the same reasoning: the
          screen's one action was halfway down a scrolling list, reachable only
          from the top of it. `Home.dc.html` draws it inline, under the next
          shoot; taken as drawn until now.

          **No bottom inset**, like the calendar's and unlike the shoot screen's.
          This is a `(tabs)` route, and the bar owns the safe area — its screens
          are a flex child above the bar rather than underneath it — so the
          screen's own bottom edge is already clear of the home indicator.
          Adding `insets.bottom` here would float the CTA 34pt up into the list.

          `py-2.5` is the calendar's own padding, so the two tabs put their
          button in the same place to the pixel.
        */}
        <View className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 py-2.5">
          {/*
            Bare `cta`/`cta`, with no height override and ONE space after the
            «+» — identical to the calendar's, which is the point (owner,
            2026-09-06: the two read as almost-the-same, which is worse than
            either being different on purpose).

            What went: `h-12 justify-center py-0` and a double space. The fixed
            48 came from `Home.dc.html`'s `height:48px` while this button was
            inline and artboard-driven; `size="cta"`'s `py-[15px]` lands at the
            same ~48 and, being padding rather than a height, still fits a label
            that wraps to two lines — which `Button` chose deliberately for
            Ukrainian, «Позначити як «Закінчена»» being 22 characters.
          */}
          <Button variant="cta" size="cta" onPress={() => router.push('/(app)/new-shoot')}>
            <Text className="text-subtitle font-semibold">{`+ ${t.newShootTitle}`}</Text>
          </Button>
        </View>
      </SwipeDismissBoundary>
      {deleteDialog}

      {/*
        Outside `SwipeDismissBoundary`, like `deleteDialog` and for the same
        reason: the boundary closes an open swipe on any touch inside it, and
        the popover's own scrim is a touch target that must not be intercepted.

        It portals to the root, so it covers the header and the tab bar as the
        artboard's scrim does — `inset:0` on the frame, not on the scroll.
      */}
      {notifications ? (
        <NotificationsPopover
          items={notifications}
          onClose={() => setNotifications(null)}
          onOpenShoot={(shootId) => router.push(`/(app)/shoot/${shootId}`)}
        />
      ) : null}
    </View>
  )
}

/**
 * The empty state's calendar — drawn, not a lucide icon.
 *
 * `Home.dc.html` builds it from two elements: a 38×34 rounded rectangle in
 * 1.6px `--border-strong`, and a 1.6px rule 8px down for the calendar's header.
 * That is all — **no tick marks on top**, which every lucide calendar has,
 * including the one this used to borrow. At 34px the difference is two small
 * strokes, but it is the difference between the drawing and something near it,
 * and the placeholder's whole job is to suggest rather than depict.
 *
 * The one hand-drawn glyph in the app, and it stays a local component rather
 * than joining `components/ui`: nothing else wants it, and a shared icon that
 * exists for one empty state is a worse trade than eight lines here.
 */
function EmptyCalendarGlyph() {
  return (
    <View
      className="border-border-strong mb-3.5 overflow-hidden rounded-md border-[1.6px]"
      style={{ width: 38, height: 34 }}
    >
      {/* The header rule. `top: 8` measured from inside the border, which is
          what both engines do: an absolutely positioned child is laid out
          against the parent's padding edge in CSS and in Yoga alike, so the
          artboard's `top:8px` transfers unchanged and needs no adjustment for
          the 1.6px frame. `inset-x-0` reaches the same inner edges. */}
      <View className="bg-border-strong absolute inset-x-0" style={{ top: 8, height: 1.6 }} />
    </View>
  )
}

/**
 * The hero card, wrapped in its swipe gesture.
 *
 * A component only so that the shoot is a prop — the deletion handler needs it
 * non-null, and TypeScript drops the narrowing `state.next !== null` gives the
 * moment the value is read inside a callback.
 */
function HeroCard({
  shoot,
  confirmed,
  onRequestDelete,
}: {
  shoot: Shoot
  confirmed: { done: number; total: number } | null
  onRequestDelete: (shoot: Shoot) => void
}) {
  return (
    <SwipeToDelete onRequestDelete={() => onRequestDelete(shoot)}>
      <NextShootCard shoot={shoot} confirmed={confirmed} />
    </SwipeToDelete>
  )
}

/**
 * One card of «Наступні зйомки»: a date column, a hairline, the shoot, a status.
 *
 * **Its own card, not a row in a shared one** (2026-09-04). It had been one
 * `Card` holding every shoot with a `border-t` between them; the artboard draws
 * each as a separate `background:var(--surface)` card, `border-radius:12px`,
 * 1px `--border`, `min-height:60px`, `padding:12px 14px`, in a column with
 * `gap:8px`. The parent supplies the gap, this supplies the card.
 *
 * `active:bg-muted` is the artboard's `style-hover="background:var(--surface-soft)"`
 * — a step **darker** than the card, which is how this design presses. It was
 * `active:bg-secondary`, and since the 2026-09-04 theme made `--secondary` equal
 * `--card` that press had become invisible.
 *
 * **The status is a `StatusPill`** since 2026-09-04. It was a neutral outline
 * `Badge`, because under the monochrome theme the design drew every row's chip
 * the same whatever the status, and a fill on a list where every row says the
 * same word would have been noise.
 *
 * `Home.dc.html` does not draw it neutral — the row's chip is
 * `background:var(--info-bg);border:1px solid var(--info-border);color:var(--info)`,
 * the blue «Запланована» chip — and now that those tokens exist, `StatusPill`
 * renders exactly that. A «Завершена» row comes out red by the same mapping,
 * which is the whole point of a status having a colour again.
 */
function UpcomingRow({ shoot }: { shoot: Shoot }) {
  const t = useStrings()
  const range = formatTimeRange(shoot.startTime, shoot.endTime)

  return (
    <Link href={`/(app)/shoot/${shoot.id}`} asChild>
      <Pressable
        className="bg-card border-border active:bg-muted min-h-[60px] flex-row items-center gap-3 rounded-xl border px-3.5 py-3"
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

        <StatusPill value={shoot.status} />
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
function HomeHeader({
  hasShoots,
  unread,
  onOpenBell,
}: {
  hasShoots: boolean
  unread: number
  /** Opens the popover, which the SCREEN owns — see the note there. */
  onOpenBell: () => void
}) {
  const t = useStrings()
  const profile = useProfile()
  const name = profile.status === 'loaded' ? profile.profile.name : ''
  /*
    The account holder's own avatar — all three states, so the header agrees
    with the profile screen whatever is set there.

    An emoji needs nothing but two columns. A photo needs a signed URL, and this
    header briefly did not fetch one: it showed an emoji or initials and never a
    photo, which would have read as the same bug the clipped glyph did, one
    photo later. The signing is cheap — one call, only when there is a path, and
    the screen already fetches shoots and crew on focus.
  */
  const avatar = profile.status === 'loaded' ? resolveAvatar(profile.profile) : null
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const photoPath = avatar?.kind === 'photo' ? avatar.path : null

  useEffect(() => {
    if (!photoPath) return setPhotoUri(null)
    let active = true
    void (async () => {
      const signed = await signedAvatarUrl(photoPath)
      if (active) setPhotoUri(signed)
    })()
    return () => {
      active = false
    }
    // The path, not the resolved object: `resolveAvatar` returns a new one each
    // render and would re-sign the same photo on every one.
  }, [photoPath])

  return (
    /*
      The shared `TabHeader` since 2026-09-07 (owner) — the greeting is this
      screen's title and the date its meta line, which is exactly how
      `Home.dc.html` draws them and had drifted furthest from it: the greeting
      was `text-numeric-xl` and bold at 22px against the artboard's 16/600, the
      date was 13px where the drawing says 11.5, there was no hairline under any
      of it, and the two controls were 40pt rather than 36.

      **The greeting still carries no name.** The artboard reads «Доброго дня,
      Дарино» and `t.greeting` is «Доброго дня» alone — because Ukrainian puts
      the name in the vocative there («Дарина» → «Дарино»), which is a case this
      app cannot derive from a `name` column. Unchanged by this pass and logged
      in docs/redesign-log.md; it is a copy question, not a header one.
    */
    <TabHeader
      title={t.greeting}
      meta={todayLabel(new Date(), t.weekdaysFull, t.monthsGenitive)}
      right={
      <View className="flex-row items-center gap-2">
        {/*
          The bell. Inert — see the note on this screen. The dot is drawn as the
          mockup draws it and reflects nothing.

          **Absent entirely on an empty account** (`Home.dc.html`, 2026-09-05):
          the artboard wraps it in `sc-if hasNotifications`, and its own script
          sets `hasNotifications: !isEmpty`. There is still no notification
          system to ask, so `hasShoots` stands in for it exactly as the artboard
          stands in for it — a photographer with no shoots has nothing anyone
          could have confirmed.

          **It does something as of 2026-09-06** (owner, migration
          `20260906120000`): it opens «Сповіщення», and the dot below counts
          unread crew answers instead of being drawn unconditionally. That
          retires the note this screen carried for nine days — "the one thing on
          this screen that states something untrue".

          `hasShoots` still gates the bell itself, as the artboard's
          `sc-if hasNotifications` does. It is now a weaker claim than it was:
          somebody with shoots and no answers gets a bell with nothing behind
          it, where the artboard would hide it. Kept because the alternative is
          a control that appears and disappears as invitations are answered,
          which reads as a bug.
        */}
        {hasShoots ? (
        <Pressable
          className="border-border h-9 w-9 shrink-0 items-center justify-center rounded-lg border active:bg-secondary"
          onPress={() => {
            tapped()
            void onOpenBell()
          }}
          hitSlop={4}
          role="button"
          accessibilityLabel={t.notifications}
        >
          {/* A lucide bell, not the 🔔 emoji this drew: an emoji renders in its
              own colours and is a different glyph on every platform. */}
          <Icon as={Bell} size={17} strokeWidth={1.7} className="text-foreground" />
          {/*
            The unread dot, **blue** since 2026-09-06 (owner) — `bg-accent-solid`,
            which is what `Home.dc.html` draws: `background:var(--accent-solid)`
            with a 2px `--bg` ring.

            It was `foreground` on the note that "the design draws it white",
            which was true of the monochrome pass and stopped being true when
            the 2026-09-04 handoff brought colour back. White also made it the
            same tone as the bell it sits on, so the one thing it had to do —
            catch the eye — was the one thing it did not.

            This gives `--accent-solid` a caller again. `Badge`'s `accent`
            variant lost its last one when «Сьогодні» went green, and was kept
            on the grounds that the token existed for that shape; the token is
            in use here regardless of what happens to the variant.

            **It reflects `notifications.read_at`**, so a photographer with
            nothing unread sees a plain bell.
          */}
          {unread > 0 ? (
            <View className="border-background bg-accent-solid absolute right-[5px] top-[5px] h-2 w-2 rounded-full border-2" />
          ) : null}
        </Pressable>
        ) : null}

        <Link href="/(app)/(tabs)/profile" asChild>
          {/* A plain 40pt avatar. The chevron beside it is gone with the pill
              it sat in — the design draws the avatar alone. */}
          <Pressable
            className="shrink-0 rounded-full active:opacity-70"
            onPress={tapped}
            role="button"
            accessibilityLabel={t.profileTitle}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} className="h-9 w-9 rounded-full" />
            ) : name ? (
              <Avatar
                name={name}
                size={36}
                emoji={
                  avatar?.kind === 'emoji' ? { char: avatar.emoji, tint: avatar.tint } : null
                }
              />
            ) : (
              <View className="bg-secondary h-9 w-9 rounded-full" />
            )}
          </Pressable>
        </Link>
      </View>
      }
    />
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
      className="bg-success h-[7px] w-[7px] rounded-full"
      style={animated}
    />
  )
}

/**
 * AC-4's card: a 5px status stripe, then the shoot.
 *
 * **A dark card on `bg-card`, bordered** — `Home.dc.html`'s `.next-card`. It
 * was a light `bg-primary` card until 2026-08-29 (the one bright surface on the
 * screen, so the next shoot read first), then `bg-background` with a border,
 * and it is now the same lifted `--card` surface as every other card. See the
 * inline note on the View.
 *
 * **The card is green, whatever the date, since 2026-09-06.** The 3px stripe
 * and the countdown chip are `--success`; the chip is the tinted shape, so it
 * is the same object as the `StatusPill`s on the shoots below the CTA.
 *
 * Two changes on one day got it here, both the owner's. First the stripe and
 * chip went from `--accent-solid` (blue) to green, because the pulsing dot
 * above the card had been `--success` since 2026-09-04 and three signals saying
 * "today" in two colours read as two facts. Then the green stopped being
 * conditional: the card holds exactly one shoot, the nearest, and the chip
 * already says «Сьогодні» or «за 5 днів» in words — a stripe that changed
 * colour was restating it.
 *
 * What still marks today, and it is all above or around the card rather than
 * in it: the pulsing dot, the word «Сьогодні» in place of «Найближча зйомка»,
 * and a stronger border.
 *
 * Before any of that it was monochrome, where "today" was only *brighter* —
 * white stripe, solid white chip — and had to compete with every other white
 * thing on the screen.
 *
 * `overflow-hidden` with the elevation on the same View is what lets the stripe
 * reach the rounded corners — the same arrangement as the agenda row.
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
          lets the 3px stripe and the badge do that work instead.

          `bg-card`, not `bg-background`, since 2026-09-04 — the design draws it
          on `--surface`, which is what `--card` now holds, and the two tokens
          are no longer near enough for the choice to be cosmetic.

          Everything inside therefore un-inverts. The card's text was
          `primary-foreground` at various opacities, because `card-foreground`
          and `muted-foreground` are light and would have vanished on white.
          Those are simply the right tokens again.

          A stronger border when the shoot is today. It was the quietest of
          three signals on this card; since 2026-09-06 it is the ONLY one — the
          stripe and the chip are green whatever the date. The loud half of
          «сьогодні» moved above the card, to the pulsing dot and the word
          itself, which is where a reader looks first anyway.
        */}
        <View
          className={`flex-row overflow-hidden rounded-xl border bg-card ${
            isToday ? 'border-border-strong' : 'border-border'
          }`}
        >
          {/*
            3px, `Home.dc.html`'s `nextBar`. **Green whatever the date**, since
            2026-09-06 (owner) — it was green for today and a receding grey
            otherwise. The card only ever holds one shoot, the nearest, and the
            stripe was marking a distinction the «Сьогодні»/«за N днів» chip
            beside it already states in words.

            The status has never picked this — that went with the amber `STRIPE`.
          */}
          <View className="bg-success w-[3px] self-stretch" />

          <View className="flex-1 px-4 py-3.5">
            <View className="flex-row items-center justify-between gap-2.5">
              <Text className="text-label text-muted-foreground flex-1 font-medium" numberOfLines={1}>
                {[formatDayMonth(shoot.date, t.monthsGenitive), range].filter(Boolean).join(' · ')}
              </Text>
              {/*
                The countdown badge. «Сьогодні» and «Завтра» are new copy — the
                mockups only ever show the «за N днів» form.

                **The green tint whatever the date**, since 2026-09-06 (owner):
                it was filled for today and outlined otherwise. Same reasoning as
                the stripe — the label already says which day it is.

                `success` is the tinted shape now, so this chip is the same
                object as the `StatusPill`s on the shoots below the CTA, in the
                colour this card marks itself with. That is what the owner asked
                for, and it is also what took the chip from 4.20:1 to 6.87:1.
              */}
              <Badge variant="success" label={distanceLabel(days, t)} />
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

