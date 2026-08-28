import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { elevation } from '@/theme/elevation';
import { View } from 'react-native';

/**
 * The design system's four card shapes (§5.2). `default` is React Native
 * Reusables' stock card, left alone so screens not yet ported keep working.
 *
 *   hero   — the main card of a screen: radius 20, generous padding
 *   row    — a list row: radius 14, the workhorse
 *   block  — notes, contacts: radius 14, even padding
 *   client — a `row` on the purple client surface
 *
 * None of them draws a border. White on the near-black frame separates at
 * 18.24:1 already; a border would be decoration, and §3.5 reserves borders for
 * the surfaces that genuinely cannot separate by fill.
 *
 * The shadow comes from `elevation.xs` as a style rather than the stock
 * `shadow-sm shadow-black/5` classes, because NativeWind's shadow does not
 * survive the trip to Android — see src/theme/elevation.ts.
 */
const CARD_VARIANTS = {
  default: 'bg-card border-border flex flex-col gap-6 rounded-xl border py-6',
  hero: 'bg-card rounded-3xl px-4 py-5',
  row: 'bg-card rounded-xl px-3.5 py-3',
  block: 'bg-card rounded-xl p-3.5',
  client: 'bg-client-bg rounded-xl px-3.5 py-3',
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
        style={[elevation.xs, style]}
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
