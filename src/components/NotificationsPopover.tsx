import { Portal } from '@rn-primitives/portal'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import X from 'lucide-react-native/icons/x'
import { Avatar } from './Avatar'
import { Icon } from './ui/icon'
import { NativeOnlyAnimatedView } from './ui/native-only-animated-view'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { formatDayMonth } from '../features/shoots/date'
import { relativeTime } from '../features/notifications/time'
import type { ShootNotification } from '../features/notifications/api'
import { tapped } from '../lib/haptics'

/**
 * The bell's popover — `Home.dc.html`'s own, anchored under the bell.
 *
 * **Not a screen.** It was built as one first (`app/(app)/notifications.tsx`,
 * deleted): a pushed route with a header and a back control. The artboard draws
 * a popover, and the difference is not only visual — a popover keeps the reader
 * on the screen the notification is about, and closes by tapping anywhere.
 *
 * ── The artboard's numbers ──────────────────────────────────────────────────
 *
 * `top:104px; right:14px; width:306px`, a 12px caret rotated 45° at
 * `top:-5 right:19`, a `--border-strong` hairline, radius 14, and a
 * `0 18px 44px rgba(0,0,0,.6)` shadow. It animates in from `transform-origin:
 * top right`.
 *
 * **`top` is computed, not the artboard's 104.** That number counts from the
 * frame's own top, 60px of which is its drawn status bar. Ours is
 * `insets.top + 10` of header padding plus the bell's 40pt — so the caret
 * lands under the bell on every device rather than on the one the artboard was
 * drawn at.
 *
 * ── One row ─────────────────────────────────────────────────────────────────
 *
 * A 32pt tinted avatar with a 16pt mark overlapping its bottom-right corner: a
 * tick for a confirmation, a cross for a refusal. Then the name in 600, the
 * action beside it in `--text-mute-hi`, the shoot below, and how long ago on the
 * right.
 *
 * **The mark's ink is ours, not the artboard's.** It strokes both glyphs in
 * `var(--bg)` — a dark tick on `--success`, which is `#098B47` here and would
 * hide it. Each mark takes its own scale's ink instead: `--success-foreground`
 * on green, `--destructive-foreground` on red. `--danger-*` has no solid fill
 * in this theme (`soft`/`bg`/`border` only), which is why the refusal uses
 * `--destructive` — the one place in the app where that is a state rather than
 * an action, and worth knowing.
 */
export function NotificationsPopover({
  items,
  onClose,
  onOpenShoot,
}: {
  items: ShootNotification[]
  onClose: () => void
  onOpenShoot: (shootId: string) => void
}) {
  const t = useStrings()
  const insets = useSafeAreaInsets()
  const now = new Date()

  return (
    <Portal name="notifications-popover">
      {/*
        The scrim, and the whole of the dismiss gesture — the artboard closes on
        a tap anywhere outside the card and offers no ✕. `stopBell` in its script
        is this component's inner Pressable: a tap on the card must not reach
        the scrim behind it.
      */}
      <NativeOnlyAnimatedView
        entering={FadeIn.duration(120).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
        className="absolute inset-0"
      >
        <Pressable
          className="absolute inset-0 bg-black/35"
          onPress={onClose}
          accessibilityLabel={t.cancel}
        />
        <View
          className="absolute right-3.5 w-[306px]"
          style={{ top: insets.top + 10 + 40 + 8 }}
          pointerEvents="box-none"
        >
          {/* The caret. A rotated square with two borders, which is how the
              artboard draws it: the untouched two edges are covered by the
              panel below, so the hairline reads as continuous around it. */}
          <View
            className="bg-background border-border-strong absolute right-[19px] top-[-5px] h-3 w-3 border-l border-t"
            style={{ transform: [{ rotate: '45deg' }] }}
          />
          <View
            className="bg-background border-border-strong overflow-hidden rounded-[14px] border"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.6,
              shadowRadius: 44,
              shadowOffset: { width: 0, height: 18 },
              elevation: 18,
            }}
          >
            {/*
              Scrollable, which the artboard has no need to be: it draws four
              rows and stops. A real account can have any number, and a popover
              that grows past the screen would put its last row under the tab
              bar. Capped at roughly five rows.
            */}
            <ScrollView style={{ maxHeight: 320 }} bounces={false}>
              {items.map((item, index) => (
                <Row
                  key={item.id}
                  item={item}
                  divided={index > 0}
                  now={now}
                  onPress={() => {
                    tapped()
                    onClose()
                    onOpenShoot(item.shootId)
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </NativeOnlyAnimatedView>
    </Portal>
  )
}

function Row({
  item,
  divided,
  now,
  onPress,
}: {
  item: ShootNotification
  divided: boolean
  now: Date
  onPress: () => void
}) {
  const t = useStrings()
  const confirmed = item.kind === 'crew_confirmed'

  return (
    <Pressable
      className={`active:bg-secondary flex-row gap-[11px] px-[15px] py-[11px] ${
        divided ? 'border-border border-t' : ''
      }`}
      onPress={onPress}
      role="button"
      accessibilityLabel={item.crewName}
    >
      <View className="h-8 w-8 shrink-0">
        <Avatar name={item.crewName} size={32} />
        <View
          className={`border-background absolute -bottom-[3px] -right-[3px] h-4 w-4 items-center justify-center rounded-full border-2 ${
            confirmed ? 'bg-success' : 'bg-destructive'
          }`}
        >
          <Icon
            as={confirmed ? Check : X}
            size={9}
            strokeWidth={3.4}
            className={confirmed ? 'text-success-foreground' : 'text-destructive-foreground'}
          />
        </View>
      </View>

      <View className="min-w-0 flex-1">
        {/* One line, two weights — the artboard's `<span 600>name</span>
            <span muted>action</span>`. Wrapping is allowed: a long name plus
            «— відмова від зйомки» does not fit 306px, and truncating the action
            would leave a row that says who but not what. */}
        <Text className="text-body-sm text-foreground leading-[1.35]">
          <Text className="text-body-sm text-foreground font-semibold">{item.crewName}</Text>
          {' '}
          <Text className="text-body-sm text-muted-foreground">
            {confirmed ? t.notificationConfirmedAction : t.notificationDeclinedAction}
          </Text>
        </Text>
        <Text className="text-caption text-muted-foreground mt-[3px]" numberOfLines={1}>
          {t.notificationShootTemplate
            .replace('{client}', item.clientName)
            .replace('{date}', formatDayMonth(item.shootDate, t.monthsGenitive))}
        </Text>
      </View>

      <Text className="text-micro text-muted-foreground shrink-0 pt-px">
        {relativeTime(item.createdAt, now, {
          justNow: t.timeJustNow,
          minutes: t.minutesShort,
          hours: t.hoursShort,
          yesterday: t.timeYesterday,
          dayForms: t.dayForms,
        })}
      </Text>
    </Pressable>
  )
}
