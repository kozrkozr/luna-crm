import { cn } from '@/lib/utils';
import * as LabelPrimitive from '@rn-primitives/label';
import { Platform } from 'react-native';

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Text>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex select-none flex-row items-center gap-2',
        Platform.select({
          web: 'cursor-default leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        }),
        disabled && 'opacity-50'
      )}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}>
      <LabelPrimitive.Text
        className={cn(
          /*
           * ADR-017 §5.9 — a field label sits on the dark frame, not on a card:
           * 12/600 in `onDark-secondary` (#C9C9CC, 11.04:1). Every Label in the
           * app is above an input on the frame, so this is the default rather
           * than a variant. A label ever placed on a white card must override
           * it — `text-foreground` would be white there.
           */
          'text-muted-foreground text-label font-semibold',
          Platform.select({ web: 'leading-none' }),
          className
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}

export { Label };
