import { useState } from 'react'
import { Pressable, View } from 'react-native'
import CalendarIcon from 'lucide-react-native/icons/calendar'
import Check from 'lucide-react-native/icons/check'
import Pencil from 'lucide-react-native/icons/pencil'
import Plus from 'lucide-react-native/icons/plus'
import Trash from 'lucide-react-native/icons/trash-2'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { DateField } from './DateField'
import { useStrings } from '../i18n/LanguageProvider'
import type { Strings } from '../i18n'
import { failed, succeeded, tapped } from '../lib/haptics'
import { setDelivered, setDeliveryDeadline, type Shoot } from '../features/shoots/api'
import { formatDayMonth, toIsoDate } from '../features/shoots/date'
import { plural } from '../features/shoots/home'
import {
  DEADLINE_DEFAULT_DAYS,
  DEADLINE_QUICK_DAYS,
  addDaysIso,
  canMarkDelivered,
  daysBetween,
  deadlineChip,
  deadlineStep,
  type DeadlineChip,
  type DeadlineTone,
} from '../features/shoots/deadline'

/** The two columns this section owns, as the screen holds them. */
export type DeadlinePatch = Pick<Shoot, 'deliveryDue' | 'deliveredAt'>

type Props = {
  shoot: Shoot
  /** A write succeeded — the screen keeps `shoot` and has to hear about it. */
  onChanged: (patch: DeadlinePatch) => void
  /** The screen's toast; `undo` makes it offer «Скасувати». */
  onToast: (message: string, undo?: () => void) => void
}

/**
 * `US-042` — «Дедлайн здачі», at the top of the «Файли» section on
 * «Матеріали», as `Shoot Detail v3.dc.html` draws it: a dashed tile with no
 * deadline (AC-2), a card with one (AC-4 – AC-6), and the editor in place of
 * either (AC-3).
 *
 * The creator's screen only — nothing here is reachable from a link view, and
 * the gateway never sends either column (AC-1).
 */
export function DeliveryDeadline({ shoot, onChanged, onToast }: Props) {
  const t = useStrings()
  // The editor's draft, or null while it is closed.
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const due = shoot.deliveryDue
  const dayMonth = (iso: string) => formatDayMonth(iso, t.monthsGenitive)

  /** Every write goes through here: one busy flag, one failure path. */
  const write = async (run: () => Promise<boolean>) => {
    setBusy(true)
    const ok = await run()
    setBusy(false)
    if (!ok) {
      failed()
      onToast(t.somethingWentWrong)
    }
    return ok
  }

  const save = async (value: string) => {
    const ok = await write(() => setDeliveryDeadline(shoot.id, value))
    if (!ok) return
    succeeded()
    setDraft(null)
    onChanged({ deliveryDue: value, deliveredAt: shoot.deliveredAt })
    onToast(t.deadlineSavedTemplate.replace('{date}', dayMonth(value)))
  }

  // AC-7 — the mark goes with the deadline, and the undo restores both.
  const remove = async () => {
    const before: DeadlinePatch = {
      deliveryDue: due,
      deliveredAt: shoot.deliveredAt,
    }
    const ok = await write(() => setDeliveryDeadline(shoot.id, null))
    if (!ok) return
    succeeded()
    setDraft(null)
    onChanged({ deliveryDue: null, deliveredAt: null })
    onToast(t.deadlineRemoved, () => {
      void write(() => setDeliveryDeadline(shoot.id, before.deliveryDue, before.deliveredAt)).then(
        (restored) => restored && onChanged(before)
      )
    })
  }

  // AC-6 — the toast's undo is the only way back (owner, 2026-10-06).
  const markDelivered = async () => {
    setBusy(true)
    const deliveredAt = await setDelivered(shoot.id, true)
    setBusy(false)
    if (deliveredAt === undefined) {
      failed()
      return onToast(t.somethingWentWrong)
    }
    succeeded()
    onChanged({ deliveryDue: due, deliveredAt })
    onToast(t.deadlineMarkedDelivered, () => {
      void setDelivered(shoot.id, false).then(
        (undone) => undone !== undefined && onChanged({ deliveryDue: due, deliveredAt: null })
      )
    })
  }

  if (draft !== null) {
    return (
      <DeadlineEditor
        t={t}
        shootDate={shoot.date}
        draft={draft}
        busy={busy}
        canRemove={due !== null}
        onDraft={setDraft}
        onSave={() => void save(draft)}
        onCancel={() => setDraft(null)}
        onRemove={() => void remove()}
      />
    )
  }

  // AC-2 — no deadline yet.
  if (!due) {
    return (
      <Pressable
        className="border-border-strong min-h-[58px] flex-row items-center gap-[11px] rounded-xl border-[1.5px] border-dashed px-3.5 py-2.5 active:bg-secondary"
        onPress={() => {
          tapped()
          setDraft(addDaysIso(shoot.date, DEADLINE_DEFAULT_DAYS))
        }}
        role="button"
      >
        <View className="bg-secondary h-[34px] w-[34px] items-center justify-center rounded-lg">
          <Icon as={CalendarIcon} size={16} strokeWidth={1.8} className="text-muted-foreground" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-body-sm text-foreground font-semibold">{t.deadlineAdd}</Text>
          <Text className="text-label text-muted-foreground">{t.deadlineAddCaption}</Text>
        </View>
        <Icon as={Plus} size={16} strokeWidth={1.9} className="text-muted-foreground" />
      </Pressable>
    )
  }

  // AC-4 – AC-6 — a deadline is set.
  const { chip, tone } = deadlineChip(due, shoot.deliveredAt !== null)
  const step = deadlineStep(shoot)
  const style = TONE[tone]

  return (
    <View className={`bg-card overflow-hidden rounded-xl border ${style.card}`}>
      <View className="flex-row items-start gap-[11px] pl-3.5 pr-2 pt-3">
        <View className="min-w-0 flex-1">
          <Text className="text-label text-muted-foreground">{t.deadlineLabel}</Text>
          <View className="mt-[3px] flex-row flex-wrap items-center gap-2">
            <Text className="text-subtitle text-foreground font-semibold">
              {t.deadlineByTemplate.replace('{date}', dayMonth(due))}
            </Text>
            <View className={`rounded-md border px-2 py-[3px] ${style.chip}`}>
              <Text className={`text-caption font-semibold ${style.ink}`}>
                {chipLabel(chip, t)}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          className="h-9 w-9 items-center justify-center rounded-lg active:bg-secondary"
          onPress={() => {
            tapped()
            setDraft(due)
          }}
          role="button"
          accessibilityLabel={t.deadlineEditA11y}
        >
          <Icon as={Pencil} size={15} strokeWidth={1.8} className="text-muted-foreground" />
        </Pressable>
      </View>

      {/* AC-5 — «Знято · Обробка · Передано». */}
      <View className="gap-1.5 px-3.5 pb-[13px] pt-3">
        <View className="flex-row gap-[3px]">
          {t.deadlineSteps.map((label, index) => (
            <View
              key={label}
              className={`h-1 flex-1 rounded-sm ${index <= step ? style.bar : 'bg-border'}`}
            />
          ))}
        </View>
        <View className="flex-row gap-[3px]">
          {t.deadlineSteps.map((label, index) => (
            <Text
              key={label}
              numberOfLines={1}
              className={`text-caption flex-1 ${
                index === step ? 'text-foreground font-semibold' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>

      {canMarkDelivered(shoot) ? (
        <Pressable
          // Centred, and shaped like «Запрошення на зйомку» at the foot of the
          // client's card on «Деталі» (owner, 2026-10-06) — the same kind of
          // single action closing a card.
          className="border-border min-h-11 flex-row items-center justify-center gap-[7px] border-t p-2 active:bg-secondary"
          disabled={busy}
          onPress={() => {
            tapped()
            void markDelivered()
          }}
          role="button"
        >
          <Icon as={Check} size={14} strokeWidth={1.8} className="text-muted-foreground" />
          <Text className="text-label text-foreground font-semibold">
            {t.deadlineMarkDelivered}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** AC-3 — the editor, in place of the tile or the card. */
function DeadlineEditor({
  t,
  shootDate,
  draft,
  busy,
  canRemove,
  onDraft,
  onSave,
  onCancel,
  onRemove,
}: {
  t: Strings
  shootDate: string
  draft: string
  busy: boolean
  canRemove: boolean
  onDraft: (iso: string) => void
  onSave: () => void
  onCancel: () => void
  onRemove: () => void
}) {
  const after = daysBetween(shootDate, draft)

  return (
    <View className="border-border-strong bg-card rounded-xl border p-3.5">
      <Text className="text-body-sm text-foreground font-semibold">{t.deadlineEditorTitle}</Text>
      <Text className="text-label text-muted-foreground mt-0.5">{t.deadlineEditorCaption}</Text>

      <View className="mt-3 flex-row gap-1.5">
        {DEADLINE_QUICK_DAYS.map((days) => {
          const iso = addDaysIso(shootDate, days)
          const on = iso === draft
          return (
            <Pressable
              key={days}
              className={`min-h-[52px] flex-1 items-center justify-center gap-0.5 rounded-[9px] border px-1 py-1.5 ${
                on ? 'bg-primary border-primary' : 'border-border active:bg-secondary'
              }`}
              onPress={() => {
                tapped()
                onDraft(iso)
              }}
              role="button"
            >
              <Text
                className={`text-label font-semibold ${on ? 'text-primary-foreground' : 'text-foreground'}`}
              >
                {`+${days}`}
              </Text>
              <Text
                className={`text-caption opacity-75 ${on ? 'text-primary-foreground' : 'text-foreground'}`}
              >
                {formatDayMonth(iso, t.monthsGenitive)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Text className="text-label text-muted-foreground mb-1.5 mt-3">{t.deadlinePickDate}</Text>
      <DateField
        value={fromIsoDate(draft)}
        minimumDate={fromIsoDate(shootDate)}
        // The wheel already refuses earlier days; this keeps a web build, where
        // it may not, from saving one the database would reject anyway.
        onChange={(date) => {
          const iso = toIsoDate(date)
          onDraft(iso < shootDate ? shootDate : iso)
        }}
      />
      <Text className="text-label text-muted-foreground mt-1.5">
        {after <= 0
          ? t.deadlineOnShootDay
          : t.deadlineAfterShootTemplate.replace(
              '{days}',
              `${after} ${plural(after, t.dayForms)}`
            )}
      </Text>

      <View className="mt-3 flex-row items-center gap-2">
        <Button variant="cta" className="h-10 flex-1" disabled={busy} onPress={onSave}>
          <Text className="text-body-sm font-semibold">{t.done}</Text>
        </Button>
        <Pressable
          className="active:bg-muted h-10 shrink-0 items-center justify-center rounded-lg px-3.5"
          onPress={() => {
            tapped()
            onCancel()
          }}
          role="button"
        >
          <Text className="text-body-sm text-muted-foreground font-semibold">{t.cancel}</Text>
        </Pressable>
        {canRemove ? (
          <Pressable
            className="active:bg-danger-bg h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            disabled={busy}
            onPress={() => {
              tapped()
              onRemove()
            }}
            role="button"
            accessibilityLabel={t.deadlineRemoveA11y}
          >
            <Icon as={Trash} size={16} strokeWidth={1.8} className="text-danger-soft" />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

/**
 * AC-4's tones as classes. Whole class names, never assembled, so Tailwind's
 * scanner finds every one of them.
 */
const TONE: Record<DeadlineTone, { card: string; chip: string; ink: string; bar: string }> = {
  idle: {
    card: 'border-border',
    chip: 'bg-secondary border-border',
    ink: 'text-muted-foreground',
    bar: 'bg-muted-foreground',
  },
  warn: {
    card: 'border-warn-border',
    chip: 'bg-warn-bg border-warn-border',
    ink: 'text-warn',
    bar: 'bg-warn',
  },
  bad: {
    card: 'border-danger-border',
    chip: 'bg-danger-bg border-danger-border',
    ink: 'text-danger-soft',
    bar: 'bg-danger-soft',
  },
  ok: {
    card: 'border-border',
    chip: 'bg-secondary border-border',
    ink: 'text-success',
    bar: 'bg-success',
  },
}

function chipLabel(chip: DeadlineChip, t: Strings): string {
  const days = (n: number) => `${n} ${plural(n, t.dayForms)}`
  switch (chip.kind) {
    case 'delivered':
      return t.deadlineDelivered
    case 'overdue':
      return t.deadlineOverdueTemplate.replace('{days}', days(chip.days))
    case 'today':
      return t.todayWord
    case 'tomorrow':
      return t.tomorrowWord
    case 'in':
      return t.deadlineInTemplate.replace('{days}', days(chip.days))
  }
}

/** A local-midnight Date for an ISO day — never `new Date(iso)`, which is UTC. */
function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}
