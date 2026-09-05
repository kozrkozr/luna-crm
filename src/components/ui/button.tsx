import { TextClassContext } from '@/components/ui/text';
import { tapped } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    /*
     * §3.7 — a button's press is a scale: the mockups all use
     * `transform: scale(.98)`. The dim is added on top, because scale alone is
     * the one thing iOS never does — every UIKit control fades on touch, and a
     * control that only shrinks reads as a web page pretending.
     *
     * Applied to every variant, so the dashed and ghost ones respond too rather
     * than only the filled ones.
     *
     * **`rounded-full`, on every variant and every size.** "Кнопки й баджі в
     * цьому дизайні — таблетки" (2026-09-04 handoff, step 3). `--radius` is
     * still 14px and still governs cards and sheets; a button no longer reads
     * it. `sm`, `lg`, `cta` and `block` repeat the class only because they
     * previously overrode it — none of them may set a corner of its own now.
     */
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-full shadow-none active:scale-[0.98] active:opacity-80',
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
         * Identical to `default` today, and kept as a distinct variant on
         * purpose. It existed to invert `--primary` back to white for the
         * pinned button when primary was dark; since the 2026-09-04 handoff
         * made `--primary` itself the pale blue-white plate, there is nothing
         * left to invert and the two collapsed onto one token. The name still
         * marks *where* a button sits — pinned at the bottom, above the
         * content — which is the thing §3.5 is actually about, and it is 20-odd
         * call sites' worth of intent to throw away for a deduplication.
         *
         * "Не використовувати чистий білий (`#fff`) для кнопок — тільки
         * `--primary`" (handoff): do not reintroduce a literal here.
         */
        cta: 'bg-primary active:bg-primary/90',
        /*
         * The dashed placeholder: «Додати учасника», add tiles, «Незабаром».
         *
         * `border-dashed` with `borderRadius` renders incorrectly on Android —
         * corners go solid, or the dashes vanish (§5.5). Accepted for now:
         * CLAUDE.md is iOS-first, and this variant is the single place to fix
         * it, either with a react-native-svg rect or by accepting a solid
         * border there.
         */
        dashed: 'bg-card border-1.5 border-dashed border-border',
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-full px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-11 rounded-full px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
        /*
         * §5.5's full-width buttons, sized by padding rather than a fixed
         * height so a two-line Ukrainian label still fits — «Позначити як
         * «Закінчена»» is 22 characters and wraps on a 360dp screen.
         * 15px padding lands at ~48pt, 13px at ~44pt: both clear the 44pt
         * minimum without a hitSlop.
         */
        cta: 'h-auto w-full rounded-full py-[15px]',
        block: 'h-auto w-full rounded-full py-[13px]',
        /*
         * The 32pt circular icon button (`icon-circle`). Visually 32, which is
         * below the 44pt minimum on purpose — §6.3 says keep the visual size
         * and widen the touch area, so callers pass hitSlop. RNR's stock
         * `icon` size is 40 and would break the row's proportions.
         */
        // §3.7 gives the circular icon button a deeper press than the rest.
        circle: 'h-8 w-8 rounded-full active:scale-95',
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
        // No longer even the same value — the 2026-09-04 handoff makes
        // `--destructive-foreground` a warm off-white (#FFF8F7).
        destructive: 'text-destructive-foreground',
        outline: cn(
          'group-active:text-accent-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' })
        ),
        secondary: 'text-secondary-foreground',
        cta: 'text-primary-foreground text-subtitle font-semibold',
        dashed: 'text-muted-foreground text-body font-semibold',
        ghost: 'group-active:text-accent-foreground',
        // "Посилання ... — `text-link`" (2026-09-04 handoff). Was
        // `text-primary`, which is now a button plate rather than a link blue.
        link: cn(
          'text-link group-active:underline',
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

function Button({ className, variant, size, onPress, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        /*
         * Haptics here rather than at each call site: this is the one component
         * every button in the app goes through, so one wrapper gives the whole
         * surface feedback and no screen has to remember.
         *
         * Fired before the handler, not after — the tick should answer the
         * finger, not wait on whatever the press starts. A disabled button
         * never reaches this, since Pressable does not call onPress at all.
         */
        onPress={
          onPress
            ? (event) => {
                tapped();
                onPress(event);
              }
            : undefined
        }
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
