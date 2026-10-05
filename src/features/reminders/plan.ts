import type { Language, Strings } from '../../i18n'
import type { Shoot } from '../shoots/api'
import { toIsoDate, formatTimeRange } from '../shoots/date'
import { pluralUk } from '../shoots/home'
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

/**
 * iOS keeps at most 64 pending local notifications per app and silently drops
 * the rest, so the plan is cut to the soonest 64 rather than leaving the choice
 * to the OS. Every sync re-plans from scratch, so the far ones arrive as the
 * near ones fire.
 */
export const MAX_PENDING = 64

/** AC-3 — how many shoots the digest names before «і ще N». */
const DIGEST_LISTED = 3

const SEPARATOR = ' · '

export function planReminders(
  shoots: readonly Shoot[],
  settings: ReminderSettings,
  now: Date,
  t: Strings,
  language: Language
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
        title: digestTitle(onDate.length, t, language),
        body: digestBody(onDate, t, language),
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
          `${settings.beforeHours} ${plural(settings.beforeHours, t.reminderHourForms, language)}`
        ),
        body: beforeBody(shoot, t),
        data: { kind: 'before', shootId: shoot.id },
      })
    }
  }

  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING)
}

/** «Завтра зйомка» for one; «Завтра 3 зйомки» / «Завтра 5 зйомок» for several. */
function digestTitle(count: number, t: Strings, language: Language): string {
  if (count === 1) return t.reminderDigestTitleOne
  return t.reminderDigestTitleMany.replace(
    '{count}',
    `${count} ${plural(count, t.shootCountForms, language)}`
  )
}

/**
 * One shoot: «Олена · 10:00 – 13:00 · Студія KULT».
 * Several: «10:00 Олена · 14:00 Марія · 18:00 Ірина · і ще 2».
 *
 * An empty client or location is dropped together with its separator (owner,
 * 2026-10-05) — `filter(Boolean)` before the join is what does that.
 */
function digestBody(onDate: readonly Shoot[], t: Strings, language: Language): string {
  if (onDate.length === 1) {
    const shoot = onDate[0]
    return [shoot.clientName.trim(), formatTimeRange(shoot.startTime, shoot.endTime), place(shoot)]
      .filter(Boolean)
      .join(SEPARATOR)
  }
  // By start time; the timeless pre-`US-030` shoots go last, since they have
  // nothing to sort by.
  const ordered = [...onDate].sort((a, b) =>
    (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99')
  )
  const named = ordered
    .slice(0, DIGEST_LISTED)
    .map((shoot) => [shoot.startTime, shoot.clientName.trim()].filter(Boolean).join(' '))
    .filter(Boolean)
  const rest = ordered.length - DIGEST_LISTED
  if (rest > 0) named.push(t.reminderMore.replace('{count}', String(rest)))
  return named.join(SEPARATOR)
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

/**
 * Ukrainian's three forms through `pluralUk`; English has two, and `pluralUk`'s
 * last-digit rule would give «21 shoot».
 */
function plural(count: number, forms: readonly string[], language: Language): string {
  if (language === 'uk') return pluralUk(count, forms)
  return count === 1 ? forms[0] : forms[1]
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
