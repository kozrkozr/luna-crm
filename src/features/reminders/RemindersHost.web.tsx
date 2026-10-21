/**
 * Web — no reminders (`ADR-024` decision 5): they are the iOS app's local
 * notifications, and `expo-notifications` has no web implementation of the
 * last-response hook `RemindersHost.tsx` mounts — it threw on sign-in and took
 * the whole signed-in tree down with it. `RemindersHost.tsx` is the real one.
 */
export function RemindersHost() {
  return null
}
