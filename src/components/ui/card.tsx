import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { elevation } from '@/theme/elevation';
import { View } from 'react-native';

/**
 * The design system's card shapes (§5.2). `default` is React Native
 * Reusables' stock card, left alone so screens not yet ported keep working.
 *
 *   hero   — the main card of a screen: radius 20, generous padding
 *   row    — a list row: radius 14, the workhorse
 *   block  — notes, contacts: radius 14, even padding
 *   flat   — the handoff's card: no fill of its own, a border and the page
 *            colour behind it (`#09090b` + `#27272a`)
 *
 * **Every variant draws a border** (owner, 2026-08-30), which reverses what this
 * note used to say. The old reasoning was that white on the near-black frame
 * separates at 18.24:1, so a border would be decoration — true while cards were
 * white. They are dark now, and the Figma file draws its card as a `#1F1F22`
 * fill *plus* a `#27272A` 1px border (shoot-detail frame, node `1:79`). Callers
 * that had been adding `border-border border` by hand can drop it.
 *
 * **The `client` variant is gone** (owner, 2026-08-30). It was a `row` on the
 * purple that meant "this is the client" (§5.7), and the purple went with the
 * app-wide monochrome pass — see src/theme/global.css. A client is now a `row`
 * like any other person, told apart by its words. Its only caller was the shoot
 * detail screen, rebuilt in the same pass.
 *
 * The shadow comes from `elevation.xs` as a style rather than the stock
 * `shadow-sm shadow-black/5` classes, because NativeWind's shadow does not
 * survive the trip to Android — see src/theme/elevation.ts.
 */
const CARD_VARIANTS = {
  default: 'bg-card border-border flex flex-col gap-6 rounded-xl border py-6',
  hero: 'bg-card border-border rounded-3xl border px-4 py-5',
  row: 'bg-card border-border rounded-xl border px-3.5 py-3',
  block: 'bg-card border-border rounded-xl border p-3.5',
  /*
   * The shoot-detail handoff's card: background `#09090b`, 1px `#27272a`,
   * radius 12, padding 14–16. It has no fill of its own — the page shows
   * through and the border is the whole of the edge, which is stock shadcn's
   * arrangement and the opposite of `--card`'s lift.
   *
   * It takes no shadow either — see the `style` prop below. A shadow under a
   * card that is the same colour as the page reads as a smudge.
   */
  flat: 'bg-background border-border rounded-xl border p-4',
} as const;

type CardVariant = keyof typeof CARD_VARIANTS;

function Card({
  className,
  variant = 'default',
  style,
  ...props
}: React.ComponentProps<typeof View> &
  React.RefAttributes<View> & { variant?: CardVariant }) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(CARD_VARIANTS[variant], className)}
        /*
         * `flat` is the one variant with no lift. The shadow is a STYLE, not a
         * class (NativeWind's does not survive the trip to Android — see
         * src/theme/elevation.ts), so a `shadow-none` class could not have
         * turned it off: the style wins on native and the card would have kept
         * a shadow nobody could find in its class list.
         */
        style={[variant === 'flat' ? null : elevation.xs, style]}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

function CardTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {

  return (
    <Text
      ref={ref}
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
export type { CardVariant };
