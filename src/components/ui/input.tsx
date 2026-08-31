import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

/*
 * React Native Reusables' stock dark field, restored 2026-08-29.
 *
 * ADR-017 had rewritten this as a white field on a near-black frame (its §5.9).
 * When the owner dropped that design system and took RNR's stock dark tokens
 * (see src/theme/global.css), the component was only re-pointed at dark
 * tokens — the fill and the lift RNR gives a field were left out. They are back.
 *
 * Two deliberate departures from stock remain:
 *
 * - `h-11`, not `h-10 sm:h-9`. 44pt is the iOS minimum tap target.
 * - The placeholder is `text-muted-foreground`, not stock's `/50` of it. At half
 *   opacity over this background it lands near #565656 and fails 4.5:1.
 */
function Input({ className, ...props }: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        // `bg-input/30` is what stock RNR paints in dark mode, written without
        // the `dark:` prefix: this app has one theme on `:root` and never
        // applies the `dark` class, so the prefixed version could never fire and
        // the field sat at exactly the screen colour. Translucent, as stock has
        // it — over the background it composites to ~#131313, so the field reads
        // as faintly raised rather than relying on the hairline alone.
        'border-input bg-input/30 text-foreground flex h-11 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 shadow-sm shadow-black/5',
        props.editable === false &&
        cn(
          'opacity-50',
          Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
        ),
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
          ),
          native: 'placeholder:text-muted-foreground',
        }),
        className
      )}
      // iOS shows the light keyboard unless it is asked otherwise; the frame is
      // dark, so the keyboard is too. Overridable per field via props.
      keyboardAppearance="dark"
      {...props}
    />
  );
}

export { Input };
