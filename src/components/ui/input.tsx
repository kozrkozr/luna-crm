import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

/*
 * ADR-017 — a white field, explicitly.
 *
 * Stock RNR styles this with `bg-background` and `text-foreground`, which is
 * correct in a light app and wrong in this one: after the inversion those are
 * the near-black frame and white text, so every form field on every screen went
 * dark-on-dark. The design system's §5.9 specifies the opposite — a white input
 * with #111111 text and an #E9E8E4 hairline, sitting on the frame under a
 * light-grey label.
 *
 * `bg-card` / `text-card-foreground` rather than `surface`/`ink` so the field
 * keeps tracking the same token pair as every other white surface.
 */
function Input({ className, ...props }: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        'border-input bg-card text-card-foreground flex h-11 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5',
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
      {...props}
    />
  );
}

export { Input };
