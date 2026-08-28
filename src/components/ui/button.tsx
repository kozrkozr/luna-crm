import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:bg-primary/90 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn(
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-accent dark:hover:bg-input/50',
          })
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' })
        ),
        link: '',
        /*
         * The pinned screen CTA (§3.5, variant 2 — the owner's choice).
         *
         * White on the frame, not the mockups' #1C1C1E, which sits on #151517
         * at 1.07:1 and has no visible edge at all — the button "reads" only
         * because its label is white. This is the one place `primary` is
         * inverted, and it is a separate variant rather than a change to
         * `--primary` because a modal's primary button sits on a white card and
         * would vanish. See src/theme/global.css, departure 2.
         *
         * Belongs at the bottom of a screen, above the content, per §3.5 —
         * white competes with the white cards if it floats among them.
         */
        cta: 'bg-cta active:bg-cta/90',
        /*
         * The dashed placeholder: «Додати учасника», add tiles, «Незабаром».
         *
         * `border-dashed` with `borderRadius` renders incorrectly on Android —
         * corners go solid, or the dashes vanish (§5.5). Accepted for now:
         * CLAUDE.md is iOS-first, and this variant is the single place to fix
         * it, either with a react-native-svg rect or by accepting a solid
         * border there.
         */
        dashed: 'bg-surface border-1.5 border-dashed border-surface-hair',
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-11 rounded-md px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
        /*
         * §5.5's full-width buttons, sized by padding rather than a fixed
         * height so a two-line Ukrainian label still fits — «Позначити як
         * «Закінчена»» is 22 characters and wraps on a 360dp screen.
         * 15px padding lands at ~48pt, 13px at ~44pt: both clear the 44pt
         * minimum without a hitSlop.
         */
        cta: 'h-auto w-full rounded-xl py-[15px]',
        block: 'h-auto w-full rounded-xl py-[13px]',
        /*
         * The 32pt circular icon button (`icon-circle`). Visually 32, which is
         * below the 44pt minimum on purpose — §6.3 says keep the visual size
         * and widen the touch area, so callers pass hitSlop. RNR's stock
         * `icon` size is 40 and would break the row's proportions.
         */
        circle: 'h-8 w-8 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-sm font-medium',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        // Was `text-white`, an RNR stock literal that bypassed the token.
        // Same value today (--destructive-foreground is #FFFFFF) but it now
        // follows the palette instead of coinciding with it.
        destructive: 'text-destructive-foreground',
        outline: cn(
          'group-active:text-accent-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' })
        ),
        secondary: 'text-secondary-foreground',
        cta: 'text-cta-foreground text-subtitle font-semibold',
        dashed: 'text-ink-muted text-body font-semibold',
        ghost: 'group-active:text-accent-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
        // Text sizing for these three comes from the variant, not the size:
        // `cta` and `dashed` set their own, and `circle` holds an icon.
        cta: '',
        block: '',
        circle: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> & React.RefAttributes<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
