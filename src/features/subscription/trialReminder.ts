import type { Strings } from '../../i18n'
import type { PlannedReminder } from '../reminders/plan'

/** `US-054` AC-1 — how long before the trial ends the reminder comes. */
export const TRIAL_REMINDER_BEFORE_MS = 2 * 24 * 3600 * 1000

export type Trial = {
  /** When the trial ends — `account_access.expires_at`. */
  endsAt: Date
  /** False once it was cancelled in Apple's settings (AC-2). */
  willRenew: boolean
}

/**
 * `US-054` — the one notification a trial gets, or none.
 *
 * Pure, like `planReminders`: the trial, the price and a clock in, a reminder
 * out. Two days before the end (AC-1); if that moment has passed — a trial
 * shorter than two days, or one started with less than that left — nothing,
 * because a late "in 2 days" would be untrue.
 *
 * AC-1 names the price, which comes from the store; without one the charge
 * reminder is not planned at all rather than worded without it. A cancelled
 * trial (AC-2) needs no price.
 */
export function planTrialReminder(
  trial: Trial | null,
  price: string | null,
  now: Date,
  t: Strings
): PlannedReminder | null {
  if (!trial) return null
  const at = new Date(trial.endsAt.getTime() - TRIAL_REMINDER_BEFORE_MS)
  if (at.getTime() <= now.getTime()) return null
  if (trial.willRenew && !price) return null
  return {
    id: 'trial-ending',
    at,
    title: t.trialReminderTitle,
    body: trial.willRenew
      ? t.trialReminderChargeTemplate.replace('{price}', price ?? '')
      : t.trialReminderViewMode,
    data: { kind: 'trial' },
  }
}
