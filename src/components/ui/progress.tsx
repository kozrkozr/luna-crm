import { cn } from '@/lib/utils'
import { View } from 'react-native'

/**
 * A determinate progress bar — the confirmation card's "2 of 4 confirmed".
 *
 * The handoff's values: 6px track on `#27272a`, fill `#fafafa`, fully rounded.
 * Monochrome by construction, so the app-wide colour removal did not touch it.
 *
 * No `@rn-primitives/progress` is installed and this needs none: it is two
 * views and a percentage. Written with a percentage WIDTH rather than `flex`,
 * because a flex child with `flex: 0` still renders its border and a 0% bar
 * would show a white sliver at the left edge.
 */
export function Progress({
  value,
  max,
  className,
}: {
  value: number
  max: number
  className?: string
}) {
  // Guard the empty shoot: a crew of nobody is 0/0, and `0/0` is NaN, which RN
  // renders as a full-width bar rather than an empty one.
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <View
      className={cn('bg-secondary h-1.5 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <View className="bg-foreground h-full rounded-full" style={{ width: `${percent}%` }} />
    </View>
  )
}
