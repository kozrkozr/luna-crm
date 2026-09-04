import { useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Portal } from '@rn-primitives/portal'
import { Text } from './ui/text'
import { tapped } from '../lib/haptics'
import { elevation } from '../theme/elevation'
import { toastDuration } from '../theme/elevation'

/**
 * The design system's toast (§5.13): `#1C1C1E`, white 13/600, radius 12, near
 * the bottom of the screen.
 *
 * Written here because React Native Reusables ships none — §7's matrix marks it
 * ❌ and suggests `sonner-native`. This is forty lines against the `PortalHost`
 * the root layout already mounts, which is a smaller commitment than a
 * dependency for one component.
 *
 * The Portal is not optional. `position: fixed` does not exist in React Native,
 * so a toast rendered in place would be clipped by whatever `overflow` its
 * ancestors have and would scroll with the content under it.
 *
 * Durations come from §3.7: 2200ms normally, 4000ms when the toast carries an
 * action — nobody can read a message and reach a button in 2.2 seconds.
 *
 * **`action` is what makes that second duration mean anything.** Until
 * 2026-08-30 `withAction` lengthened the timer and nothing rendered a control,
 * so a toast could be given four seconds to reach a button it did not have. The
 * shoot-detail handoff's undo — «Соломію Дяк видалено з команди» with
 * «Скасувати» beside it — is the first caller that needs one, and passing an
 * `action` now sets the longer duration by itself. `withAction` is kept for the
 * callers that only wanted the timing.
 */
export function Toast({
  message,
  onDone,
  withAction = false,
  action,
  bottom = 32,
}: {
  message: string | null
  onDone: () => void
  /**
   * How far off the bottom of the WINDOW the toast sits. 32 by default, which
   * is what `bottom-8` was.
   *
   * It has to be a prop because the toast renders through the root
   * `PortalHost`: it is outside whatever navigator the caller is in, so it
   * cannot discover that a bottom bar is in the way. A screen on the tab bar
   * passes `bottomNavHeight(insets.bottom) + 21` — the artboards' `bottom:96`
   * over a 75px bar.
   */
  bottom?: number
  withAction?: boolean
  /**
   * An undo, or anything else the message offers. Presence of one implies the
   * longer duration, so a caller cannot ask for a button and forget the time to
   * reach it.
   */
  action?: { label: string; onPress: () => void }
}) {
  const [visible, setVisible] = useState(false)
  const timed = withAction || !!action

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const timer = setTimeout(
      () => {
        setVisible(false)
        onDone()
      },
      timed ? toastDuration.withAction : toastDuration.plain
    )
    return () => clearTimeout(timer)
    // `onDone` is deliberately not a dependency: a caller that passes an inline
    // arrow would otherwise restart the timer on every render and the toast
    // would never dismiss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, timed])

  if (!message || !visible) return null

  return (
    <Portal name="toast">
      <View className="absolute inset-x-0 items-center px-4" style={{ bottom }}>
        <View
          className="bg-secondary border-border-strong max-w-[320px] flex-row items-center gap-3 rounded-lg border px-4 py-2.5"
          style={elevation.overlay}
        >
          <Text className="text-body-sm text-foreground shrink font-semibold">{message}</Text>
          {action ? (
            <Pressable
              className="shrink-0 active:opacity-60"
              hitSlop={8}
              onPress={() => {
                tapped()
                // Dismiss immediately: leaving the toast up after its action has
                // run offers an undo that would fire a second time.
                setVisible(false)
                onDone()
                action.onPress()
              }}
              role="button"
            >
              <Text className="text-body-sm text-foreground font-bold underline">
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Portal>
  )
}
