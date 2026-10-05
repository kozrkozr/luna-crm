import { Linking, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

export type ReminderPermission = 'granted' | 'blocked' | 'askable'

/**
 * `granted`, or why not: `askable` while iOS will still show its prompt,
 * `blocked` once it will not (it shows it once — after a refusal only the app's
 * page in iOS settings can turn notifications back on).
 */
export async function getReminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === 'web') return 'blocked'
  try {
    const permission = await Notifications.getPermissionsAsync()
    if (permission.granted) return 'granted'
    return permission.canAskAgain ? 'askable' : 'blocked'
  } catch {
    return 'blocked'
  }
}

/**
 * `US-041` AC-1 — asked at first launch. iOS shows its prompt only while the
 * answer is undetermined, so calling this on every launch asks exactly once.
 */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (Platform.OS === 'web') return 'blocked'
  try {
    await Notifications.requestPermissionsAsync()
  } catch {
    // Reported through the read below, like any other refusal.
  }
  return getReminderPermission()
}

/**
 * AC-10's «Увімкнути» — the prompt again if iOS still allows it, otherwise the
 * app's own page in iOS settings.
 */
export async function enableReminderPermission(): Promise<ReminderPermission> {
  const current = await getReminderPermission()
  if (current === 'askable') return requestReminderPermission()
  if (current === 'blocked') await Linking.openSettings()
  return current
}
