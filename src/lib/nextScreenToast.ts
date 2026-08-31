/**
 * A toast raised on one screen and shown on the next.
 *
 * `Toast` portals to the root `PortalHost`, but it is still rendered BY a
 * screen — so it disappears with that screen. The edit screen saves and pops
 * immediately, which means the handoff's «Зміни збережено» would flash for a
 * frame at most, or never render at all.
 *
 * This is the smallest thing that fixes it: the leaving screen leaves a message
 * behind, and the screen that receives focus picks it up. One value, cleared on
 * read, so it can never be shown twice.
 *
 * Deliberately not a context or a store. Exactly one message is ever in flight,
 * nothing needs to subscribe to it, and a provider around the whole app would be
 * a lot of machinery for a string that lives for one navigation.
 */
let pending: string | null = null

/** Leave a message for whichever screen gains focus next. */
export function toastOnNextScreen(message: string): void {
  pending = message
}

/** Take the message, if there is one. Reading clears it. */
export function takePendingToast(): string | null {
  const message = pending
  pending = null
  return message
}
