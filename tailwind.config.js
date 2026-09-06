const { hairlineWidth } = require('nativewind/theme')

/**
 * React Native Reusables' stock scales, plus the application scales the
 * 2026-09-04 design handoff reintroduced. See src/theme/global.css — it carries
 * the provenance, the oklch originals and what the change costs.
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
 * **This block is what Tailwind v4's `@theme inline` would be.** The handoff
 * (`THEME-HANDOFF.md`, step 2) asks for the custom tokens to be declared there
 * so that `bg-info-bg`, `text-info`, `border-info-border`, `text-link`,
 * `bg-warn-bg` and the rest resolve to classes. This project is on Tailwind
 * v3 — `@theme inline` does not exist and NativeWind's preset expects a config
 * — so the same declaration happens in `theme.extend.colors` below. The class
 * names come out identical, which is what the handoff actually specifies.
 *
 * The nesting is what produces those names: a `DEFAULT` key gives `text-info`,
 * and a sibling `bg` key gives `bg-info-bg` rather than a second `bg-` prefix.
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
          /*
           * `bg-accent-solid` — the «Сьогодні» badge. It lives under `accent`
           * rather than as a top-level key so the name matches the handoff
           * exactly; it shares nothing with `--accent` but the word.
           */
          solid: 'hsl(var(--accent-solid) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },

        // ── Application scales (Layer B) — the 2026-09-04 handoff ─────────

        /*
         * `--border-strong` — `#3D3D40`, one step up from `border`. The
         * outlined badge, the reminder button and the sheet grabber all sit on
         * it. The one token here that `shadcn-theme.css` does not carry; its
         * value comes from the design project's `theme.css`. See global.css.
         */
        'border-strong': 'hsl(var(--border-strong) / <alpha-value>)',

        /** `text-link` — links, and the active tab in the bottom navigation. */
        link: {
          DEFAULT: 'hsl(var(--link) / <alpha-value>)',
          hover: 'hsl(var(--link-hover) / <alpha-value>)',
        },

        /** «Запланована» — `bg-info-bg text-info border-info-border`. */
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          bg: 'hsl(var(--info-bg) / <alpha-value>)',
          border: 'hsl(var(--info-border) / <alpha-value>)',
        },

        /** «Очікує» — `bg-warn-bg text-warn border-warn-border`. */
        warn: {
          DEFAULT: 'hsl(var(--warn) / <alpha-value>)',
          bg: 'hsl(var(--warn-bg) / <alpha-value>)',
          border: 'hsl(var(--warn-border) / <alpha-value>)',
        },

        /**
         * Two shapes, like `--danger-*` and unlike it in having both:
         *
         * - solid — `bg-success text-success-foreground`. «Підтверджено», the
         *   home card's pulsing dot, and its 3px stripe.
         * - tinted — `bg-success-bg text-success-soft border-success-border`,
         *   the same object `info`, `warn` and `danger` are. The home card's
         *   «Сьогодні» chip (2026-09-06).
         */
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          soft: 'hsl(var(--success-soft) / <alpha-value>)',
          bg: 'hsl(var(--success-bg) / <alpha-value>)',
          border: 'hsl(var(--success-border) / <alpha-value>)',
        },

        /*
         * «Завершена» — `bg-danger-bg text-danger-soft border-danger-border`.
         *
         * No `DEFAULT`: the handoff gives this scale three roles and no plain
         * `text-danger`, and `--destructive` is what an action that destroys
         * something uses. Leaving the key out keeps the two from being reached
         * for interchangeably.
         */
        danger: {
          soft: 'hsl(var(--danger-soft) / <alpha-value>)',
          bg: 'hsl(var(--danger-bg) / <alpha-value>)',
          border: 'hsl(var(--danger-border) / <alpha-value>)',
        },

        /*
         * Pastel avatar tints, `bg-chart-1` … `bg-chart-5`. Named for the
         * shadcn slot the handoff put them in; nothing is charted.
         * `text-tint-foreground` is the initials' ink — these are the only
         * light surfaces in the app, so no `*-foreground` token reads on them.
         */
        chart: {
          1: 'hsl(var(--chart-1) / <alpha-value>)',
          2: 'hsl(var(--chart-2) / <alpha-value>)',
          3: 'hsl(var(--chart-3) / <alpha-value>)',
          4: 'hsl(var(--chart-4) / <alpha-value>)',
          5: 'hsl(var(--chart-5) / <alpha-value>)',
        },
        tint: {
          foreground: 'hsl(var(--tint-foreground) / <alpha-value>)',
        },
      },
      /*
       * `--radius` is 8px, so this ladder is 8 / 6 / 4 — small controls only.
       * Cards are `rounded-xl`, Tailwind's stock 12px, which is what every
       * artboard draws and is deliberately NOT derived from `--radius`.
       * Buttons and badges are `rounded-full` and read none of this.
       * See src/theme/global.css for why 8 rather than the handoff's 14.
       */
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
