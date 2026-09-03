import { Text, TextClassContext } from '@/components/ui/text'
import { selected as selectionTick } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { elevation } from '@/theme/elevation'
import { Pressable, View } from 'react-native'

/**
 * The segmented control, at last in one place.
 *
 * It existed three times before this: `AuthScreen`'s login/register `SegmentTab`,
 * `ShootCalendar`'s view switcher, and — after the shoot-detail redesign would
 * have added them — the detail screen's three tabs and the edit screen's status
 * segment. All five are the same control: a `secondary` track with 3px of
 * padding, and an active segment on the page colour with a shadow under it.
 *
 * The handoff's values (its "segmented Tabs control"): container `#18181b`,
 * 1px `#27272a`, radius 10, 3px padding; triggers min-height 34, radius 8,
 * active `#09090b` + `0 1px 2px rgba(0,0,0,.4)` + `#fafafa` text, inactive
 * `#a1a1aa`.
 *
 * `bg-background` for the active segment, not `bg-card`. That is the note
 * `AuthScreen` already carried and the reason is unchanged: `--card` was lifted
 * to `#1F1F22` on 2026-08-30, and on a `#262626` track a `#1F1F22` segment is
 * almost invisible. The active segment is the PAGE showing through a lighter
 * track.
 *
 * Generic over the value so a caller gets `ShootStatus` or a tab union back from
 * `onChange` rather than a bare string.
 */
export type TabItem<T extends string> = {
  value: T
  label: string
  /**
   * The handoff puts a count beside each tab label — «Команда 4», «Матеріали 8» —
   * in 11px, dimmer than the label and dimmer again when the tab is inactive.
   * Optional: the edit screen's status segment has no counts.
   */
  count?: string
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <View
      className={cn('bg-secondary border-border flex-row rounded-lg border p-[3px]', className)}
      role="tablist"
    >
      {items.map((item) => (
        <Tab
          key={item.value}
          item={item}
          active={item.value === value}
          onPress={() => onChange(item.value)}
        />
      ))}
    </View>
  )
}

function Tab<T extends string>({
  item,
  active,
  onPress,
}: {
  item: TabItem<T>
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={cn(
        'min-h-[34px] flex-1 flex-row items-center justify-center gap-1.5 rounded-md py-2',
        active && 'bg-background'
      )}
      // The active segment lifts off the track — the handoff's
      // `0 1px 2px rgba(0,0,0,.4)`. As a style, not a class: NativeWind's shadow
      // does not survive to Android (src/theme/elevation.ts).
      style={active ? elevation.xs : undefined}
      onPress={() => {
        // `selected`, not `tapped`. A segment changing a value is what iOS's
        // selection tick is for; an impact here makes the control feel like a
        // row of buttons (src/lib/haptics.ts).
        selectionTick()
        onPress()
      }}
      role="tab"
      accessibilityState={{ selected: active }}
    >
      <TextClassContext.Provider value={undefined}>
        <Text
          numberOfLines={1}
          className={cn(
            'text-body-sm font-semibold',
            active ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Text>
        {item.count ? (
          /*
            Dimmer than the label in both states, and dimmer again when
            inactive — the handoff's `#71717a` active / `#52525b` inactive. Two
            steps down from the label, expressed as opacity so it stays one
            token deep.
          */
          <Text
            className={cn(
              'text-caption font-semibold',
              active ? 'text-muted-foreground' : 'text-muted-foreground/60'
            )}
          >
            {item.count}
          </Text>
        ) : null}
      </TextClassContext.Provider>
    </Pressable>
  )
}
