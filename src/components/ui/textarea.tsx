import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';
import { useRevealOnFocus } from './form-scroll-view';

function Textarea({
  ref: forwarded,
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }), // On web, numberOfLines also determines initial height. On native, it determines the maximum height.
  placeholderClassName,
  ...props
}: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  /*
    A multiline field has to ask to be scrolled into view; a single-line one
    does not. UIKit brings a `UITextField` above the keyboard itself, but a
    `UITextView` scrolls its own caret INSIDE itself and never tells the scroll
    view around it to move — so «Нотатки» stayed under the keyboard even with
    the inset applied. See `FormScrollView`.

    Null outside a `FormScrollView`, which is why this is safe on every screen:
    a textarea in a sheet simply does nothing.
  */
  const own = useRef<TextInput>(null)

  /*
    Both refs, not whichever the prop order favours. `ref` arrives inside
    `props` (the type includes `RefAttributes`), so setting ours before the
    spread would let a caller's ref silently disable the reveal, and setting it
    after would silently drop theirs. Nothing passes one today; this is so the
    first thing that does still works.
  */
  const setRef = (node: TextInput | null) => {
    own.current = node
    if (typeof forwarded === 'function') forwarded(node)
    else if (forwarded) forwarded.current = node
  }
  const reveal = useRevealOnFocus()

  return (
    <TextInput
      ref={setRef}
      className={cn(
        // Same stock fill, border and lift as Input — see the note there. A
        // textarea that did not match the single-line field beside it on the
        // same form would look like a different control.
        'text-foreground border-input bg-input/30 flex min-h-16 w-full flex-row rounded-md border px-3 py-2 text-base shadow-sm shadow-black/5 md:text-sm',
        Platform.select({
          web: 'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content resize-y outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.editable === false && 'opacity-50',
        className
      )}
      placeholderClassName={cn('text-muted-foreground', placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      // Dark keyboard — see input.tsx.
      keyboardAppearance="dark"
      {...props}
      onFocus={(event) => {
        reveal?.(own.current)
        props.onFocus?.(event)
      }}
      // `letterSpacing: 0` stated rather than left absent — a recycled Fabric view
      // can otherwise arrive carrying the masked password field's 2pt. Full
      // reasoning in ui/input.tsx, which does the same.
      style={[{ letterSpacing: 0 }, props.style]}
    />
  );
}

export { Textarea };
