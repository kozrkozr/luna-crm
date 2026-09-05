import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import Trash from 'lucide-react-native/icons/trash'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { tapped } from '../lib/haptics'

/**
 * The red panel's own width, and the 8px that separates it from the row.
 *
 * 8 is the column gap the two lists already use between their cards
 * (`Home.dc.html`, `Calendar.dc.html`), so the panel reads as one more card in
 * the stack rather than something wedged against the row it belongs to.
 *
 * Their sum is the whole travel of the gesture: `overshootRight={false}` stops
 * the drag exactly here, so a row cannot be pulled halfway across the screen.
 */
const PANEL_WIDTH = 88
const PANEL_GAP = 8
const TRAVEL = PANEL_WIDTH + PANEL_GAP

/**
 * The row that is currently open, and where on screen it is.
 *
 * `frame` is the wrapper's window coordinates, filled in just after the row
 * opens. `SwipeDismissBoundary` needs it to tell a tap on the revealed action
 * from a tap anywhere else, and window coordinates are what a touch event
 * reports — so this is measured rather than derived from layout, which would be
 * relative to a parent the boundary knows nothing about.
 *
 * Module scope rather than context: there is exactly one open row in the whole
 * app at a time, and a provider around two screens would be a lot of machinery
 * for one value. The same reasoning `src/lib/nextScreenToast.ts` records for the
 * same shape — with a subscription added, because unlike a toast this one has to
 * re-render something when it changes.
 *
 * Without it both lists happily leave two red panels open at once, and the
 * confirmation that follows names a shoot the user may not be looking at.
 */
type OpenRow = {
  methods: SwipeableMethods
  frame: { x: number; y: number; width: number; height: number } | null
}

let openRow: OpenRow | null = null

const subscribers = new Set<() => void>()

function setOpenRow(next: OpenRow | null): void {
  openRow = next
  subscribers.forEach((notify) => notify())
}

const subscribe = (notify: () => void): (() => void) => {
  subscribers.add(notify)
  return () => {
    subscribers.delete(notify)
  }
}

/** Close whatever is open. Safe to call when nothing is. */
function closeOpenRow(): void {
  openRow?.methods.close()
}

type Props = {
  /**
   * Raised when «Видалити» is tapped, *after* the row has closed.
   *
   * Deliberately not the deletion itself. `US-019` AC-2 is required — an
   * accidental tap must not destroy a shoot without a confirmation step — so
   * every caller passes `ask` from `useDestructiveConfirm`, and this component
   * cannot be wired straight to `deleteShoot` by mistake.
   */
  onRequestDelete: () => void
  /** The row. Anything with its own opaque background; the panel sits behind it. */
  children: React.ReactNode
}

/**
 * Swipe a row left, reveal «Видалити», tap it.
 *
 * **New interaction, no artboard.** Neither `Home.dc.html` nor
 * `Calendar.dc.html` draws it; the owner asked for it on 2026-09-05, in as many
 * words "like removing chats in Telegram". Deleting a shoot is `US-019`, which
 * is built and confirmed — this adds a second way to reach it from the two
 * lists, so nothing about what the action *does* is invented here.
 *
 * **Reveal, then tap — never a full-swipe trigger.** Dragging past a threshold
 * could fire the action directly, and iOS Mail offers exactly that; the owner
 * chose the two-step version (2026-09-05) because these lists are scrolled
 * vertically with the thumb and a diagonal flick is easy to produce by
 * accident. So the gesture only ever *reveals* — the tap and the confirmation
 * after it are what delete anything, which is three deliberate acts.
 *
 * **Wrapped per row by the caller, never per list.** `US-009`'s crew rows on
 * the calendar are shoots somebody else created — the RPC behind `deleteShoot`
 * authorises the creator only — so those rows are simply not wrapped, rather
 * than wrapped and disabled. There is no gesture to discover on a row that has
 * no action behind it.
 *
 * **The row closes on tap, before the confirmation.** Also the owner's call: on
 * iOS the confirmation is a `UIAlertController` over a dimmed screen, and a red
 * panel left open behind it is still open when the user cancels.
 *
 * ── Copy ────────────────────────────────────────────────────────────────────
 *
 * «Видалити», `t.remove` — the bare verb, which uk.ts reserves for controls
 * whose subject is obvious from where they sit. Nothing is invented: the panel
 * is 88px and could not hold «Скасувати зйомку» anyway.
 *
 * Note that the shoot-detail screen calls this same soft delete «Скасувати
 * зйомку», the handoff's rename of `US-019`'s «Видалити зйомку». The app now
 * shows both verbs for one action. It already did — that button raises
 * `confirmDeleteShoot`, «Видалити цю зйомку?» — but two entry points make it
 * easier to notice. Worth a decision; not one to make here (rule 1).
 */
export function SwipeToDelete({ onRequestDelete, children }: Props) {
  const ref = useRef<SwipeableMethods | null>(null)
  /*
    A plain View around the swipeable, for one reason: something has to be
    measurable. `ReanimatedSwipeable` gives us its methods through the ref, not
    its node, and the boundary below needs this row's rectangle in window
    coordinates. The wrapper does not move when the row is dragged — the
    translation happens inside it — so its frame covers the card and the
    revealed panel both, which is exactly the region a tap may still land in.
  */
  const box = useRef<View>(null)

  useEffect(
    () => () => {
      // A row can be unmounted while open — the list refetches on focus, and a
      // deleted row goes away underneath its own panel. Leaving it registered
      // would have the next swipe call `close()` on an unmounted tree.
      if (openRow?.methods === ref.current) setOpenRow(null)
    },
    []
  )

  return (
    <View ref={box}>
      <ReanimatedSwipeable
        ref={ref}
        // 2 is the library's own default and is what makes the panel feel dragged
        // rather than dropped; 1 (the row tracking the finger exactly) reads as
        // slippery next to iOS's own lists.
        friction={2}
        // Half the panel is what iOS treats as committed. Below it the row
        // springs back, which is the escape hatch for a swipe that was meant to
        // be a scroll.
        rightThreshold={TRAVEL / 2}
        // The gesture stops at the panel's width. Without it the row can be
        // pulled clear of the screen, which promises a full-swipe trigger the
        // interaction deliberately does not have.
        overshootRight={false}
        onSwipeableWillOpen={() => {
          const methods = ref.current
          if (!methods) return
          if (openRow && openRow.methods !== methods) openRow.methods.close()
          /*
            Registered before it is measured, so the row counts as open from the
            first frame. `measureInWindow` is a round trip to the native side and
            the boundary treats an unmeasured row as "do not intercept" — the tap
            that arrives in between behaves as it did before this existed, rather
            than being swallowed by a boundary that cannot yet say where the
            action is.
          */
          setOpenRow({ methods, frame: null })
          box.current?.measureInWindow((x, y, width, height) => {
            if (openRow?.methods !== methods) return
            setOpenRow({ methods, frame: { x, y, width, height } })
          })
          // `tapped` — haptics.ts names this case itself: "a button was pressed,
          // a row was opened".
          tapped()
        }}
        onSwipeableWillClose={() => {
          if (openRow?.methods === ref.current) setOpenRow(null)
        }}
        renderRightActions={(_progress, translation, methods) => (
          <DeletePanel
            translation={translation}
            onPress={() => {
              tapped()
              methods.close()
              onRequestDelete()
            }}
          />
        )}
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  )
}

/**
 * Wraps a screen so that a tap anywhere but the revealed action closes the row.
 *
 * The owner asked for this on 2026-09-05, after the gesture itself shipped: a
 * row that can only be closed by swiping it back is a state the user can get
 * stuck in, and every list on iOS closes on an outside tap.
 *
 * ── Why the touch is intercepted rather than merely observed ────────────────
 *
 * Returning `true` from `onStartShouldSetResponderCapture` takes the touch away
 * from whatever was under it, and that is the point. The three cases:
 *
 * - **The revealed «Видалити» panel** — the touch passes through untouched, or
 *   the one control the gesture exists to reach would be unreachable while it
 *   is showing.
 * - **The open row's own card** — closes, and does NOT navigate to the shoot.
 *   Letting it through would open a shoot the user was trying to stop deleting.
 * - **Everything else** — another row, the buttons, the header, empty space —
 *   closes, and swallows that one tap. The first tap dismisses; the second does
 *   what it says. That is the platform's convention, not an invention here.
 *
 * The whole rule reduces to: while a row is open, only its action strip is
 * still live. `TRAVEL` is what makes that strip findable — it is the rightmost
 * `TRAVEL` points of the row's frame, because that is precisely how far the row
 * moved to reveal it.
 *
 * ── Scrolling ───────────────────────────────────────────────────────────────
 *
 * Holding the responder would stop the ScrollView from scrolling, so this
 * grants the standard termination request the ScrollView makes the moment the
 * touch turns into a drag: the row closes and the list scrolls, from one
 * gesture. Nothing here has to know a ScrollView is involved.
 */
export function SwipeDismissBoundary({ children }: { children: React.ReactNode }) {
  const open = useSyncExternalStore(
    subscribe,
    () => openRow !== null,
    // The web export prerenders every route (ADR-012), where no row can be
    // open and there is no native side to measure against.
    () => false
  )

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={(event) => {
        if (!open) return false
        const frame = openRow?.frame
        // Not measured yet: leave the touch alone. Fail open — a tap that does
        // what the user expected is a better failure than one that vanishes.
        if (!frame) return false
        const { pageX, pageY } = event.nativeEvent
        const onAction =
          pageY >= frame.y &&
          pageY <= frame.y + frame.height &&
          pageX >= frame.x + frame.width - TRAVEL
        return !onAction
      }}
      onResponderRelease={closeOpenRow}
      // The ScrollView asked to take over — the touch was a scroll, not a tap.
      onResponderTerminate={closeOpenRow}
    >
      {children}
    </View>
  )
}

/**
 * The red card behind the row.
 *
 * A component rather than JSX inlined in `renderRightActions`, because it holds
 * a hook: the library calls that prop as a plain function during its own
 * render, so a `useAnimatedStyle` written there would belong to `Swipeable` and
 * silently depend on the prop never becoming conditional.
 *
 * `translation` is 0 closed and -TRAVEL fully open, so `translation + TRAVEL`
 * puts the panel just past the right edge at rest and flush against it when
 * open — it slides in with the finger instead of sitting statically behind the
 * row waiting to be uncovered. The library pins these actions to the right edge
 * for us (`rightActions` is an absolute fill with `flexDirection: row-reverse`).
 *
 * `bg-destructive` and not `--danger-*`: this is an action that destroys
 * something, which is the distinction src/theme/global.css draws between the
 * two scales and `StatusPill` is careful to respect.
 */
function DeletePanel({
  translation,
  onPress,
}: {
  translation: SharedValue<number>
  onPress: () => void
}) {
  const t = useStrings()

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translation.value + TRAVEL }],
  }))

  return (
    <Animated.View style={[{ width: TRAVEL }, style]}>
      <Pressable
        className="active:opacity-80"
        style={{ flex: 1, marginLeft: PANEL_GAP }}
        onPress={onPress}
        role="button"
        accessibilityLabel={t.remove}
      >
        {/* `flex-1` so the panel is exactly as tall as the row beside it —
            the rows differ in height (a two-line one on the calendar, the
            hero card on Home) and a fixed height would leave a red edge. */}
        <View className="bg-destructive flex-1 items-center justify-center gap-1 rounded-xl">
          <Icon
            as={Trash}
            size={18}
            strokeWidth={1.8}
            className="text-destructive-foreground"
          />
          <Text className="text-label text-destructive-foreground font-semibold">{t.remove}</Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}
