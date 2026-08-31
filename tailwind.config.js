const { hairlineWidth } = require('nativewind/theme')

/**
 * React Native Reusables' stock scales. ADR-017's application colours — the
 * frame, warm neutrals, client/private, warning, link, cta — were removed on
 * 2026-08-29 at the owner's request; see src/theme/global.css.
 *
 * The type scale below is NOT stock and stays deliberately: `text-body`,
 * `text-title` and the rest are named sizes used across 33 files, and they
 * carry no colour and no visual identity. Removing them would be churn, not a
 * theme reset. Say so if they should go too.
 *
 * Every colour carries `<alpha-value>`, which is what makes an opacity modifier
 * work: `bg-primary/90`, `active:bg-accent/50`, `ring-destructive/20`. Written
 * as a bare `hsl(var(--x))` the modifier is parsed, matched — and then silently
 * dropped, because there is nowhere in the value to put the alpha. Every
 * pressed and hover state in RNR's stock components is written with one, so
 * without this the buttons have no press feedback at all and nothing reports a
 * problem.
 *
 * Colour is NOT defined here — every value is an `hsl(var(--token) / <alpha-value>)` reference
 * into src/theme/global.css, which is the single place a colour may appear
 * (README, Layout). That includes the Layer B application scales: the design
 * system's §4 suggests writing those as literal hex here, and `ADR-017`
 * declines it for this rule's sake.
 *
 * The colour set is deliberately small since the monochrome pass of 2026-08-30:
 * the stock shadcn slots plus `border-strong`, and no application scales at
 * all. Seven used to sit below them — two shoot-status triples, `client`,
 * `link`, `pending`, `confirmed` and `warning` — and all went with the app-wide
 * move to the handoff's monochrome zinc direction. Read global.css first; it
 * carries the reasoning and what the change costs.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  /*
   * Retained, but nothing applies the class: the app declares one theme, so
   * there is no `dark` variant to switch into (global.css, header).
   */
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── shadcn slots (Layer A) — stock RNR components read these ──────
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },

        /*
         * `--border-strong` — the shoot-detail handoff's `#3f3f46`, one step up
         * from `border`. The outlined «Очікує» badge, the reminder button and
         * the sheet grabber all sit on it. See src/theme/global.css.
         */
        'border-strong': 'hsl(var(--border-strong) / <alpha-value>)',

      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      /*
       * The design system's scale, normalised from the 19 sizes (with half
       * pixels) the mockups used. Tuples are [size, line-height], both
       * absolute: RN rounds fractional sizes differently per screen density,
       * and unitless line-heights are not reliable across versions.
       *
       * Weight and letter-spacing stay as classes, not baked in here —
       * `body` is 400 or 600 depending on use, and `overline` needs
       * `tracking-[0.35px]` (RN letterSpacing is absolute, never em).
       */
      fontSize: {
        micro: ['10px', '13px'],
        caption: ['11px', '15px'],
        overline: ['11px', '14px'],
        label: ['12px', '16px'],
        'body-sm': ['13px', '20px'],
        body: ['14px', '20px'],
        subtitle: ['15px', '20px'],
        'title-sm': ['16px', '22px'],
        title: ['19px', '24px'],
        'title-lg': ['20px', '26px'],
        'numeric-xl': ['22px', '26px'],
        display: ['24px', '30px'],
      },
      borderWidth: {
        hairline: hairlineWidth(),
        // 1.5px: dashed placeholders, the active status pill, conflict rows.
        // Keep it applied in both states and change only the colour — swapping
        // the width between states shifts the content inside (§5.11).
        1.5: '1.5px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      // fast / base / slow — the three durations the design system normalises
      // its mockups' timings to (§3.7).
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
}
