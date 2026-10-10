import { useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { useLanguage } from '../../i18n/LanguageProvider'
import { onShootsChanged } from '../shoots/changes'
import type { ReminderData } from './plan'
import { setReminderLanguage, syncReminders } from './sync'
import { useAccess } from '../subscription/access'

/*
 * A reminder that comes due while the app is open is still shown as a banner —
 * otherwise iOS drops it, and the creator looking at another screen would never
 * see «Зйомка через 2 години».
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

/**
 * `US-041`'s side effects, mounted once inside the signed-in group (it needs a
 * session to read shoots and the language to word them). Renders nothing.
 *
 * - **Sync** on mount, on a language change (AC-12), after every shoot save
 *   or delete (AC-8), and every time the app comes back to the foreground —
 *   the moment a change made elsewhere, or a permission granted in iOS
 *   settings, can be picked up.
 * - **Taps** (AC-11): a «за N годин» reminder opens its shoot; the evening
 *   digest opens the calendar with tomorrow selected.
 */
export function RemindersHost() {
  const language = useLanguage()
  const router = useRouter()
  const response = Notifications.useLastNotificationResponse()
  const handled = useRef<string | null>(null)

  useEffect(() => {
    setReminderLanguage(language)
    void syncReminders()
  }, [language])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncReminders()
    })
    return () => subscription.remove()
  }, [])

  // AC-8 — a create, edit or delete re-plans at once, not at the next launch.
  useEffect(() => onShootsChanged(() => void syncReminders()), [])

  /*
    `US-054` — the trial's reminder follows the access: planned when a trial
    starts, re-worded when it is cancelled (AC-2), gone when it ends or turns
    into a subscription. The status object changes identity on every read, so
    the key is what it says.
  */
  const { subscription } = useAccess()
  const accessKey = subscription ? JSON.stringify(subscription) : null
  useEffect(() => {
    if (accessKey !== null) void syncReminders()
  }, [accessKey])

  useEffect(() => {
    if (!response) return
    // The hook keeps returning the last response; act on each one once. The
    // delivery date is part of the key because identifiers repeat — a shoot's
    // «за N годин» reminder is `before-<id>` every time it is planned.
    const id = `${response.notification.request.identifier}@${response.notification.date}`
    if (handled.current === id) return
    handled.current = id
    Notifications.clearLastNotificationResponse()

    const data = response.notification.request.content.data as Partial<ReminderData> | undefined
    if (data?.kind === 'before' && typeof data.shootId === 'string') {
      router.push(`/(app)/shoot/${data.shootId}`)
    } else if (data?.kind === 'digest' && typeof data.date === 'string') {
      router.navigate({ pathname: '/(app)/(tabs)/shoots', params: { date: data.date } })
    }
  }, [response, router])

  return null
}
