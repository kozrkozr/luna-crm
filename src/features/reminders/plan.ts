import type { Strings } from '../../i18n'
import type { Shoot } from '../shoots/api'
import { toIsoDate, formatTimeRange } from '../shoots/date'
import { plural } from '../shoots/home'
import type { ReminderSettings } from './settings'

/**
 * `US-041` — which notifications the phone should hold, and what they say.
 *
 * Pure: shoots, settings and a clock in, a list out. Nothing here touches
 * `expo-notifications`, so every criterion below can be checked without a
 * device (`./sync.ts` is the only part that schedules).
 */
export type PlannedReminder = {
  /** Stable per subject, so a re-plan replaces rather than duplicates. */
  id: string
  at: Date
  title: string
  body: string
  data: ReminderData
}

/** What a tap needs to know — AC-11. */
export type ReminderData =
  | { kind: 'digest'; date: string }
  | { kind: 'before'; shootId: string }
  /** `US-054` — the free trial ends in two days. */
  | { kind: 'trial' }
  /** `US-055` — a picked beta tester's access ends in two days. */
  | { kind: 'beta' }

/**
 * iOS keeps at most 64 pending local notifications per app and silently drops
 * the rest, so the plan is cut to the soonest 64 rather than leaving the choice
 * to the OS. Every sync re-plans from scratch, so the far ones arrive as the
 * near ones fire.
 */
export const MAX_PENDING = 64

/**
 * AC-3 — how many shoots the digest names before «і ще N». Two, because a
 * collapsed notification on iOS 26 shows the title and two lines of body.
 */
const DIGEST_LISTED = 2

/** Between the parts of the «за N годин» body. */
const SEPARATOR = ' · '

export function planReminders(
  shoots: readonly Shoot[],
  settings: ReminderSettings,
  now: Date,
  t: Strings,
  random: () => number = Math.random
): PlannedReminder[] {
  // AC-7 — finished shoots get nothing. Deleted ones never arrive here:
  // `listShoots` reads through the RLS policy that filters `deleted_at`
  // (ADR-014, CLAUDE.md rule 3).
  const live = shoots.filter((shoot) => shoot.status !== 'finished')
  const planned: PlannedReminder[] = []

  if (settings.digestOn) {
    const byDate = new Map<string, Shoot[]>()
    for (const shoot of live) {
      const list = byDate.get(shoot.date) ?? []
      list.push(shoot)
      byDate.set(shoot.date, list)
    }
    for (const [date, onDate] of byDate) {
      const at = atLocal(dayBefore(date), settings.digestTime)
      // AC-6 — a digest whose moment has passed is not shown at all.
      if (at.getTime() <= now.getTime()) continue
      planned.push({
        id: `digest-${date}`,
        at,
        title: digestTitle(onDate.length, t, random),
        body: digestBody(onDate, t),
        data: { kind: 'digest', date },
      })
    }
  }

  if (settings.beforeOn) {
    for (const shoot of live) {
      // AC-5 — a shoot from before `US-030` has no start, so no «за N годин».
      if (!shoot.startTime) continue
      const at = atLocal(shoot.date, shoot.startTime)
      at.setHours(at.getHours() - settings.beforeHours)
      if (at.getTime() <= now.getTime()) continue
      planned.push({
        id: `before-${shoot.id}`,
        at,
        title: t.reminderBeforeTitle.replace(
          '{hours}',
          `${settings.beforeHours} ${plural(settings.beforeHours, t.reminderHourForms)}`
        ),
        body: beforeBody(shoot, t),
        data: { kind: 'before', shootId: shoot.id },
      })
    }
  }

  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING)
}

/**
 * One of three titles for the size of tomorrow (AC-3): 1, 2, 3–5 or 6+ shoots.
 * Random each time the plan is built — a re-sync may swap the variant before
 * it is shown, which nobody can see.
 */
function digestTitle(count: number, t: Strings, random: () => number): string {
  const titles =
    count === 1
      ? t.reminderDigestTitles1
      : count === 2
        ? t.reminderDigestTitles2
        : count <= 5
          ? t.reminderDigestTitles3to5
          : t.reminderDigestTitles6plus
  return titles[Math.floor(random() * titles.length) % titles.length]
}

/**
 * One shoot per line, by start time — «• 10:00 – 14:00 Papaya» — and past the
 * second, the rest counted at the end of the last line: «· і ще 3». No location (owner, 2026-10-05). A shoot from before
 * `US-030` has no range and is listed by client alone; the timeless ones go
 * last, having nothing to sort by.
 */
function digestBody(onDate: readonly Shoot[], t: Strings): string {
  const ordered = [...onDate].sort((a, b) =>
    (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
  )
  const lines = ordered
    .slice(0, DIGEST_LISTED)
    .map((shoot) =>
      `• ${[formatTimeRange(shoot.startTime, shoot.endTime), shoot.clientName.trim()]
        .filter(Boolean)
        .join(' ')}`
    )
  const rest = ordered.length - DIGEST_LISTED
  if (rest > 0) {
    lines[lines.length - 1] += `${SEPARATOR}${t.reminderMore.replace('{count}', String(rest))}`
  }
  return lines.join('\n')
}

/** «Олена, о 10:00 · Студія KULT». */
function beforeBody(shoot: Shoot, t: Strings): string {
  const at = t.reminderAt.replace('{time}', shoot.startTime ?? '')
  const client = shoot.clientName.trim()
  return [client ? `${client}, ${at}` : at, place(shoot)].filter(Boolean).join(SEPARATOR)
}

/** The venue's name where there is one, otherwise its address. */
function place(shoot: Shoot): string | null {
  return shoot.locationName?.trim() || shoot.locationAddress?.trim() || null
}


/** Local wall-clock — the same assumption `../shoots/status.ts` makes. */
function atLocal(isoDate: string, time: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

function dayBefore(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return toIsoDate(new Date(year, month - 1, day - 1))
}
