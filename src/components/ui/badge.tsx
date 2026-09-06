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
 * These three are the neutral vocabulary — fill, outline, or a raised label:
 *
 * - `solid` — `--primary` (the pale blue-white) with its dark ink. The
 *   affirmative one: «Підтвердила».
 * - `outline` — border `--border-strong`. The not-yet one, where no coloured
 *   scale applies.
 * - `muted` — a label rather than a state: «Бачите лише ви».
 *
 * The domain states the 2026-09-04 handoff defines — «Запланована»,
 * «Завершена», «Очікує», «Підтверджено» — are **not** variants here. They live
 * in `StatusPill` and `ResponsePill`, which own the mapping from a domain value
 * to a tone; adding four colour variants to this primitive would let any caller
 * pick «Очікує» styling for something that is not a pending answer.
 *
 * `accent` and `success` are the exception, and the fourth and fifth variants:
 *
 * - `accent` — `bg-accent-solid` with the primary ink, no border. It is here
 *   rather than in a pill because it marks *proximity*, not a domain value —
 *   the home card computes it from a date, and no enum on `Shoot` carries it.
 *   It has no relation to `--accent` beyond the word; see the token note in
 *   src/theme/global.css.
 *
 *   **It was the «Сьогодні» chip until 2026-09-06** and now has no callers. Kept
 *   rather than deleted: `--accent-solid` exists in the theme for exactly this
 *   shape, and removing the variant would strand the token.
 *
 * - `success` — `bg-success-bg text-success-soft border-success-border`. The
 *   home card's countdown chip since 2026-09-06 (owner). Same argument as
 *   `accent` for living here: it marks proximity rather than a domain state.
 *
 *   **It is the tinted shape, not a solid fill**, because the owner asked for
 *   this chip to look like the `StatusPill`s on the shoots below it. That is
 *   also what fixed its contrast: a solid `--success` fill with near-white ink
 *   measured 4.20:1, under AA for an 11px label; the tint measures 6.87:1.
 *   `StatusPill` is a separate component and stays one — it maps a
 *   `ShootStatus`, where this marks how near a date is.
 *
 * ── Three changes from the 2026-09-04 handoff ───────────────────────────────
 *
 * **Radius is a full pill** (`rounded-full`), not the 6px the shoot-detail
 * handoff drew. "Кнопки й баджі в цьому дизайні — таблетки: став `rounded-full`
 * на всі `Button` і `Badge`, не `rounded-md`" — step 3. This reverses the
 * owner's 2026-09-03 decision that took `StatusPill` to `rounded-md` to match
 * `Calendar.dc.html`; the newer instruction wins and the two agree again, this
 * time as pills.
 *
 * **`px-2 py-1` at 11px/500.** `4px 8px` and `font-medium`, which is what both
 * artboards specify — `Home.dc.html` inline on its chips, the shoot-detail
 * handoff as "badge 11/500". The padding had been `py-[3px]` and the weight 600,
 * neither traceable to a source.
 *
 * **`muted` is `bg-accent`, not `bg-secondary`.** In this theme `--secondary`
 * and `--card` are the same value, so a `bg-secondary` badge on a card is
 * literally invisible. `--accent` is the next step up (`#18191A`) and is what
 * the design uses for a raised chip on a card. See src/theme/global.css.
 */
const badgeVariants = cva('shrink-0 flex-row items-center rounded-full px-2 py-1', {
  variants: {
    variant: {
      solid: 'bg-primary',
      outline: 'border-border-strong border',
      muted: 'bg-accent',
      accent: 'bg-accent-solid',
      success: 'bg-success-bg border-success-border border',
    },
  },
  defaultVariants: { variant: 'muted' },
})

const badgeTextVariants = cva('text-caption font-medium', {
  variants: {
    variant: {
      solid: 'text-primary-foreground',
      outline: 'text-foreground/85',
      muted: 'text-accent-foreground',
      accent: 'text-primary-foreground',
      success: 'text-success-soft',
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
