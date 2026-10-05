import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * `US-041` AC-9 — the creator's reminder settings.
 *
 * **Kept on the device, not on the account.** Reminders are local
 * notifications scheduled by this phone (`./sync.ts`), so the settings describe
 * what this phone does — there is no server that would read a column. The story
 * names no second device, and a second phone simply starts at AC-2's defaults.
 *
 * `expo-secure-store` because it is already a dependency and holds a small
 * string; nothing here is secret.
 */
export type BeforeHours = 1 | 2 | 3

export type ReminderSettings = {
  /** The evening digest of tomorrow's shoots (AC-3). */
  digestOn: boolean
  /** Its local wall-clock time, `HH:MM` — hours and minutes (owner, 2026-10-05). */
  digestTime: string
  /** The reminder N hours before each shoot (AC-4). */
  beforeOn: boolean
  beforeHours: BeforeHours
}

/** AC-2 — both on, the digest at 20:00, N = 2. */
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  digestOn: true,
  digestTime: '20:00',
  beforeOn: true,
  beforeHours: 2,
}

/** AC-9 — the three values N can take. */
export const BEFORE_HOURS_OPTIONS: readonly BeforeHours[] = [1, 2, 3]

const KEY = 'reminder-settings'

export async function loadReminderSettings(): Promise<ReminderSettings> {
  if (Platform.OS === 'web') return DEFAULT_REMINDER_SETTINGS
  try {
    const raw = await SecureStore.getItemAsync(KEY)
    return raw ? parse(raw) : DEFAULT_REMINDER_SETTINGS
  } catch {
    return DEFAULT_REMINDER_SETTINGS
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

/**
 * Field by field, each checked, so a value written by an older build — or a
 * corrupted one — falls back to its default instead of scheduling nonsense.
 */
function parse(raw: string): ReminderSettings {
  let value: Partial<Record<keyof ReminderSettings, unknown>>
  try {
    value = JSON.parse(raw)
  } catch {
    return DEFAULT_REMINDER_SETTINGS
  }
  const d = DEFAULT_REMINDER_SETTINGS
  return {
    digestOn: typeof value.digestOn === 'boolean' ? value.digestOn : d.digestOn,
    digestTime:
      typeof value.digestTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.digestTime)
        ? value.digestTime
        : d.digestTime,
    beforeOn: typeof value.beforeOn === 'boolean' ? value.beforeOn : d.beforeOn,
    beforeHours: BEFORE_HOURS_OPTIONS.includes(value.beforeHours as BeforeHours)
      ? (value.beforeHours as BeforeHours)
      : d.beforeHours,
  }
}
