import { Text, TextClassContext } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { View } from 'react-native'

/**
 * A badge — the shoot-detail handoff's one labelling primitive.
 *
 * It replaces a pattern that had been rewritten inline on every screen: a
 * `View` with `rounded-full px-2.5 py-1` and a `Text` inside it, once in
 * `StatusPill`, once in `ResponsePill`, twice in `Visibility`, and again in each
 * screen that needed a one-off chip. Those all say the same thing in slightly
 * different paddings.
 *
 * **The variants are the handoff's own three**, and with the app-wide
 * monochrome pass (owner, 2026-08-30) they are the whole vocabulary — fill,
 * outline, or the muted surface. Nothing is distinguished by hue any more, so
 * these three have to carry what six colour scales used to:
 *
 * - `solid` — `#fafafa` on `#18181b` text. The affirmative one: «Підтвердила».
 * - `outline` — border `#3f3f46`, text `#d4d4d8`. The not-yet one: «Очікує».
 * - `muted` — `#27272a` fill. A label rather than a state: the shoot's status
 *   badge, «Бачите лише ви».
 *
 * Radius is **6px** (`rounded-md`), not the pill shape the old chips used —
 * that is what the handoff draws for every badge, and it is the visible
 * difference between a badge and an avatar at this size.
 */
const badgeVariants = cva('shrink-0 flex-row items-center rounded-md px-2 py-[3px]', {
  variants: {
    variant: {
      solid: 'bg-primary',
      outline: 'border-border-strong border',
      muted: 'bg-secondary',
    },
  },
  defaultVariants: { variant: 'muted' },
})

const badgeTextVariants = cva('text-caption font-semibold', {
  variants: {
    variant: {
      solid: 'text-primary-foreground',
      outline: 'text-foreground/85',
      muted: 'text-secondary-foreground',
    },
  },
  defaultVariants: { variant: 'muted' },
})

type BadgeProps = React.ComponentProps<typeof View> &
  VariantProps<typeof badgeVariants> & {
    /** Convenience — a badge is almost always one string. */
    label?: string
  }

function Badge({ className, variant, label, children, ...props }: BadgeProps) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)} {...props}>
        {/* `numberOfLines`: a badge sits beside a name in a row, and Ukrainian
            labels are long — «Клієнт не бачить» is 16 characters. Without it the
            badge wraps and takes the row's height with it (§5.3). */}
        {label !== undefined ? <Text numberOfLines={1}>{label}</Text> : children}
      </View>
    </TextClassContext.Provider>
  )
}

export { Badge, badgeTextVariants, badgeVariants }
