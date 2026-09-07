import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'

/**
 * Anything that can report its own position — a `TextInput`, a `View`.
 *
 * Typed structurally rather than as `TextInput` so `reveal` is not tied to one
 * component: the next thing that needs to escape the keyboard may not be a
 * field at all.
 */
type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void
}

/**
 * How much clear space to leave between a revealed field and the keyboard.
 *
 * Enough to see the field is not flush against the keyboard, and not so much
 * that revealing one field scrolls the label off the top.
 */
const REVEAL_GAP = 16

const RevealContext = createContext<((target: Measurable | null) => void) | null>(null)

/**
 * Ask the enclosing `FormScrollView` to bring a field above the keyboard.
 *
 * Returns null outside one, so a field rendered in a sheet or a modal simply
 * does nothing rather than throwing. `Textarea` calls it on focus.
 */
export function useRevealOnFocus() {
  return useContext(RevealContext)
}

/**
 * A `ScrollView` that gets out of the keyboard's way.
 *
 * Every screen with a text field scrolls, and every one of them had the same
 * bug: focus a field near the bottom and the keyboard covered it. Owner
 * reported it across the app on 2026-09-05.
 *
 * Two things have to happen, and the second is the one that took three tries.
 *
 * ── 1. Room below the content ───────────────────────────────────────────────
 *
 * A scroll view whose content ends at the screen's bottom cannot scroll further
 * however much you ask it to. So the keyboard's height becomes a `contentInset`
 * while it is up, and the range exists.
 *
 * **This was `automaticallyAdjustKeyboardInsets` and is not any more.** That
 * prop does the same thing on iOS's schedule rather than ours, and a scroll
 * cannot move into range that has not been created yet: `scrollTo` was clamped,
 * nothing visible happened, and the content only moved once UIKit caught up.
 * Owning the inset makes the ordering knowable — see `keyboardInset`.
 *
 * ── 2. Scrolling the field into view ────────────────────────────────────────
 *
 * Nothing in UIKit does this for a multiline field. A single-line one is a
 * `UITextField` and UIKit brings it above the keyboard itself; a `Textarea` is
 * a `UITextView`, which scrolls its own caret INSIDE itself and never asks the
 * scroll view around it to move. That is why «Нотатки» was the field left
 * covered after single-line fields already worked.
 *
 * `reveal` measures the field against the keyboard's own frame — from the
 * event's `endCoordinates`, never an assumed height — and scrolls the
 * difference, so it is right with a suggestion bar, a floating keyboard, or a
 * hardware keyboard showing only the shortcut bar.
 *
 * ── The other two props ─────────────────────────────────────────────────────
 *
 * **`keyboardDismissMode="interactive"`** is the iOS convention for dismissing:
 * drag down over the content. The default keyboard has no Done key.
 * **`keyboardShouldPersistTaps="handled"`** lets a tap reach a button while the
 * keyboard is up; every screen set it individually before this existed.
 *
 * ── Not solved here ─────────────────────────────────────────────────────────
 *
 * **A pinned CTA still sits behind the keyboard.** The shoot, contact and
 * add-crew forms park their save button absolutely at the bottom, outside this
 * view, so an inset cannot move it. Dismissing the keyboard reveals it, which
 * is the usual iOS answer, and moving it would mean animating against the
 * keyboard frame — a different job and a bigger one. Recorded rather than done.
 *
 * Android resizes the window instead of insetting and needs none of this;
 * `react-native-web` has no keyboard at all. Both paths no-op.
 */
export function FormScrollView(props: React.ComponentProps<typeof ScrollView>) {
  const ref = useRef<ScrollView>(null)
  /* The live scroll offset. `scrollTo` takes an absolute position, so moving
     "a bit further down" needs to know where we already are. */
  const offset = useRef(0)
  /** Where the keyboard's top edge is, or null when it is away. */
  /*
    `Keyboard.metrics` does not exist in react-native-web — its Keyboard is a
    five-method stub (isVisible / addListener / dismiss / remove*) — so calling
    it threw during the first render and took the whole tree down with it on
    web. Every screen wrapped in this view was blank: the login form, and with
    it the theme playground and every browser acceptance suite. The effect below
    already returns early on web; this is the same guard, one render earlier.
  */
  const keyboardTop = useRef<number | null>(
    Platform.OS === 'web' ? null : (Keyboard.metrics()?.screenY ?? null)
  )
  /** The field waiting to be revealed. Cleared when the keyboard goes. */
  const pending = useRef<Measurable | null>(null)
  /**
   * The room made for the keyboard, as state because it has to reach `render`.
   *
   * **This is why `automaticallyAdjustKeyboardInsets` is gone.** That prop made
   * the same room, but on iOS's schedule rather than ours — and a scroll cannot
   * move into range that does not exist yet, so `scrollTo` was silently clamped
   * and the content only moved once iOS caught up. That is the delay the owner
   * saw three times.
   *
   * Owning the inset removes the guesswork: the effect below runs after the
   * commit that applied it, so by the time anything scrolls, the range it needs
   * is already there. One frame after `keyboardWillShow`, rather than whenever
   * UIKit decides.
   */
  const [keyboardInset, setKeyboardInset] = useState(0)

  const scrollBy = useCallback((target: Measurable, top: number) => {
    target.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + REVEAL_GAP - top
      // Already clear of it. Never scroll "up" to close a gap that is not a
      // problem — that would yank the form whenever a top field is focused.
      if (overlap <= 0) return
      ref.current?.scrollTo({ y: offset.current + overlap, animated: true })
    })
  }, [])

  /*
    ── The listeners live here, not in `reveal` ───────────────────────────────

    They were registered inside the focus handler, and that is a race iOS loses:
    tapping a field makes it first responder and the keyboard starts rising
    BEFORE React Native delivers `onFocus`, so a listener added there missed
    `keyboardWillShow` altogether. Subscribed for the screen's lifetime instead,
    the keyboard's frame is already known when focus arrives.

    `keyboardWillShow` carries the target frame as the animation starts, so the
    room is made while the keyboard is still rising rather than after it lands.
  */
  useEffect(() => {
    if (Platform.OS === 'web') return
    // Android has no `will` events unless the window resizes, so it uses `did`
    // — later than here, and a platform this app does not ship to yet.
    const rising = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const falling = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const subscriptions = [
      Keyboard.addListener(rising, (event) => {
        keyboardTop.current = event.endCoordinates.screenY
        setKeyboardInset(event.endCoordinates.height)
      }),
      Keyboard.addListener(falling, () => {
        keyboardTop.current = null
        pending.current = null
        setKeyboardInset(0)
      }),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  /*
    The scroll, once the room exists.

    An effect rather than a call inside the listener: React has committed the
    new `contentInset` by the time this runs, so the scroll range is real and
    `scrollTo` cannot be clamped. Nothing happens without a field waiting, so
    the keyboard appearing for someone else's screen moves nothing here.
  */
  useEffect(() => {
    if (keyboardInset === 0 || !pending.current || keyboardTop.current === null) return
    scrollBy(pending.current, keyboardTop.current)
  }, [keyboardInset, scrollBy])

  /**
   * Bring a field above the keyboard.
   *
   * Scrolls at once when the keyboard is already up — moving between fields,
   * where the inset is already committed. Otherwise the target is stored and
   * the effect above acts as soon as the room has been made.
   */
  const reveal = useCallback(
    (target: Measurable | null) => {
      if (!target || Platform.OS === 'web') return
      pending.current = target
      if (keyboardTop.current !== null && keyboardInset > 0) {
        scrollBy(target, keyboardTop.current)
      }
    },
    [keyboardInset, scrollBy]
  )

  return (
    <RevealContext.Provider value={reveal}>
      <ScrollView
        ref={ref}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        // Spread before the props this component owns, so a caller can set
        // anything else without silently breaking the keyboard behaviour.
        {...props}
        /*
          Ours, not `automaticallyAdjustKeyboardInsets`'. `contentInset` rather
          than padding because callers already set `contentContainerStyle` for
          their pinned CTAs — an inset adds to that instead of replacing it.
        */
        contentInset={{ bottom: keyboardInset }}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = event.nativeEvent.contentOffset.y
          // Chained rather than replaced: nothing passes one today, and the
          // screen that eventually does should still get its event.
          props.onScroll?.(event)
        }}
      />
    </RevealContext.Provider>
  )
}
