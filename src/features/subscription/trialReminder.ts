import type { Strings } from '../../i18n'
import type { PlannedReminder } from '../reminders/plan'

/** `US-054` AC-1 — how long before the trial ends the reminder comes. */
export const TRIAL_REMINDER_BEFORE_MS = 2 * 24 * 3600 * 1000

/**
 * Dev builds only (the Test Store's `test_…` key): the Test Store runs a
 * 14-day trial in about seven minutes, so "two days before" is always already
 * past and the reminder could never be seen on a device. Two minutes there.
 * The wording stays AC-1's — it is a test of the scheduling, not of the copy.
 */
export const TEST_STORE_REMINDER_BEFORE_MS = 2 * 60 * 1000

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
  t: Strings,
  beforeMs: number = TRIAL_REMINDER_BEFORE_MS
): PlannedReminder | null {
  if (!trial) return null
  const at = new Date(trial.endsAt.getTime() - beforeMs)
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

/**
 * `US-055` AC-3a — the picked beta tester's warning, two days before their
 * access ends, as a trial's is. Only while nothing is bought: a subscription
 * replaces the beta access (AC-4), so the caller passes null then. Worded
 * without «бета» (AC-3b).
 */
export function planBetaReminder(
  until: Date | null,
  now: Date,
  t: Strings,
  beforeMs: number = TRIAL_REMINDER_BEFORE_MS
): PlannedReminder | null {
  if (!until) return null
  const at = new Date(until.getTime() - beforeMs)
  if (at.getTime() <= now.getTime()) return null
  return {
    id: 'beta-ending',
    at,
    title: t.betaReminderTitle,
    body: t.betaReminderBody,
    data: { kind: 'beta' },
  }
}
