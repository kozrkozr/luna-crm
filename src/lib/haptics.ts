import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

/**
 * Touch feedback, wrapped so callers never have to think about the platform.
 *
 * iOS controls tick when you commit something, and their silence is the thing
 * that makes a hand-rolled control feel like a web page — more than any visual
 * detail. This is the cheapest fix for that in the whole app.
 *
 * Three reasons everything goes through here rather than calling
 * `expo-haptics` directly:
 *
 * 1. **The link views are static web** (`ADR-012`), where the Haptics API does
 *    not exist. Every call is guarded once, here, instead of at 30 call sites.
 * 2. **A rejected promise must never surface.** Haptics fail quietly on a
 *    device with the Taptic Engine disabled, in the simulator, and on a phone
 *    in Low Power Mode. A missing tick is not worth an unhandled rejection, so
 *    each call swallows its own.
 * 3. **The vocabulary stays small.** Four verbs, chosen by what the user did —
 *    not by which generator they map to. If someone needs a fifth, that is a
 *    design conversation rather than an import.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android'

const run = (fire: () => Promise<void>): void => {
  if (!supported) return
  void fire().catch(() => {
    // Deliberately empty. See reason 2 above.
  })
}

/** A button was pressed, a row was opened. The default. */
export const tapped = (): void => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))

/**
 * A choice changed — a segment, a tab, a calendar day, a picker value.
 *
 * `selectionAsync` rather than an impact: it is the lighter, drier tick iOS
 * uses for a value changing inside a control, and using an impact here makes a
 * segmented control feel like a series of button presses.
 */
export const selected = (): void => run(() => Haptics.selectionAsync())

/** Something completed — a shoot saved, a link copied. */
export const succeeded = (): void =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))

/** Something was refused — a blocked save, a rejected link. */
export const failed = (): void =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
