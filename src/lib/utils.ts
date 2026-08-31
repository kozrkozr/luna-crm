import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The design system's type scale, as tailwind-merge class-group members.
 *
 * **This list is load-bearing, and the failure it prevents is silent.**
 *
 * `cn` runs tailwind-merge so a caller's class can override a component's
 * default — that is the whole reason RNR components take `className`. To do
 * that, tailwind-merge has to know which classes conflict, and it works that
 * out from the *class name*, not from the Tailwind config. It has never heard of
 * `text-numeric-xl`, so it guesses: `text-<something>` that is not one of
 * Tailwind's own sizes must be a text **colour**.
 *
 * The consequence is that a size and a colour on the same element are treated
 * as rivals and one is deleted. a size paired with a colour lost the
 * size, so the shoot's time range rendered at 16px instead of 22 — and in the
 * other order it lost the colour, so every field label in the app rendered
 * black on a near-black background. Invisible, and caused by a utility
 * function rather than by any style anyone wrote.
 *
 * Nothing warns. The class is dropped from the output string, so there is no
 * unmatched selector, no console message, and the element simply inherits.
 * Any new step added to `fontSize` in tailwind.config.js must be added here
 * too, or it will behave the same way.
 */
const DESIGN_FONT_SIZES = [
  'micro',
  'caption',
  'overline',
  'label',
  'body-sm',
  'body',
  'subtitle',
  'title-sm',
  'title',
  'title-lg',
  'numeric-xl',
  'display',
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...DESIGN_FONT_SIZES] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
