import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '../../lib/supabase/client'
import { DEFAULT_LANGUAGE, stringsFor, type Language } from '../../i18n'
import { listShoots } from '../shoots/api'
import { planReminders } from './plan'
import { loadReminderSettings } from './settings'

/**
 * `US-041` — puts the phone's pending notifications in step with the shoots.
 *
 * **Local notifications, no server.** The phone schedules them itself; nothing
 * is sent from Supabase and no push token exists. Each sync cancels everything
 * this app has pending and schedules the current plan again, which is what
 * makes AC-8 hold without bookkeeping: an edited, deleted or finished shoot
 * simply is not in the next plan.
 *
 * The cost is that a change made on another device reaches this phone only
 * when this app next syncs — on launch, on returning to the foreground, and
 * after every save here.
 */

/**
 * The account's language, as `LanguageProvider` last resolved it. Module state
 * rather than a parameter because the callers that matter most — the shoot
 * API after a save — sit below any React context. AC-12.
 */
let language: Language = DEFAULT_LANGUAGE

export function setReminderLanguage(next: Language): void {
  language = next
}

/**
 * Syncs run one after another, never side by side: two interleaved
 * cancel-then-schedule passes could leave both plans pending.
 */
let queue: Promise<void> = Promise.resolve()

export function syncReminders(): Promise<void> {
  queue = queue.then(run, run)
  return queue
}

/** Sign-out and account deletion — a logged-out phone reminds no one. */
export async function clearReminders(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {
    // Nothing to recover: the worst case is a reminder for a shoot the next
    // signed-in sync would have cancelled anyway.
  }
}

async function run(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return clearReminders()

    const permission = await Notifications.getPermissionsAsync()
    if (!permission.granted) return clearReminders()

    const [settings, shoots] = await Promise.all([loadReminderSettings(), listShoots()])
    // A failed read keeps what is already pending. Clearing would silence every
    // reminder because of one dropped request.
    if (!shoots) return

    const plan = planReminders(shoots, settings, new Date(), stringsFor(language), language)

    await Notifications.cancelAllScheduledNotificationsAsync()
    for (const reminder of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body, data: reminder.data },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at },
      })
    }
  } catch {
    // A reminder is a convenience; failing to schedule one must never surface
    // as a failed save. The next sync tries again.
  }
}
