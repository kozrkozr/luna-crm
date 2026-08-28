const { hairlineWidth } = require('nativewind/theme')

/**
 * Colour is NOT defined here — every value is an `hsl(var(--token))` reference
 * into src/theme/global.css, which is the single place a colour may appear
 * (README, Layout). That includes the Layer B application scales: the design
 * system's §4 suggests writing those as literal hex here, and `ADR-017`
 * declines it for this rule's sake.
 *
 * The scales below are the dark-frame design system adopted in `ADR-017`. Read
 * global.css first — it carries the reasoning, the contrast ratios, and the
 * four places this implementation departs from the source document.
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // ── the dark frame (Layer B) ──────────────────────────────────────
        screen: {
          DEFAULT: 'hsl(var(--screen))',
          deep: 'hsl(var(--screen-deep))',
          raised: 'hsl(var(--screen-raised))',
          chip: 'hsl(var(--screen-chip))',
          segment: 'hsl(var(--screen-segment))',
        },
        // Text and hairlines that sit ON the frame. `onDark.border` is the
        // second border colour shadcn has no slot for — name it explicitly
        // anywhere a border lands on the dark background.
        onDark: {
          DEFAULT: 'hsl(var(--on-dark))',
          secondary: 'hsl(var(--on-dark-secondary))',
          muted: 'hsl(var(--on-dark-muted))',
          empty: 'hsl(var(--on-dark-empty))',
          border: 'hsl(var(--on-dark-border))',
          borderStrong: 'hsl(var(--on-dark-border-strong))',
        },

        // ── light surfaces (Layer B) ──────────────────────────────────────
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          alt: 'hsl(var(--surface-alt))',
          hair: 'hsl(var(--surface-hair))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          muted: 'hsl(var(--ink-muted))',
          // 3.44 on white: icons and decoration only, never text.
          icon: 'hsl(var(--ink-icon))',
        },

        // ── the pinned screen CTA ─────────────────────────────────────────
        cta: {
          DEFAULT: 'hsl(var(--cta))',
          foreground: 'hsl(var(--cta-foreground))',
        },

        // ── shoot status ──────────────────────────────────────────────────
        // Named for `ShootStatus` (`new` | `finished`), not the design
        // document's planned/progress/done — see global.css, departure 4.
        // `solid` is the 4px stripe down the left of a list row.
        'status-new': {
          bg: 'hsl(var(--status-new-bg))',
          fg: 'hsl(var(--status-new-fg))',
          solid: 'hsl(var(--status-new-solid))',
        },
        'status-finished': {
          bg: 'hsl(var(--status-finished-bg))',
          fg: 'hsl(var(--status-finished-fg))',
          solid: 'hsl(var(--status-finished-solid))',
        },

        // ── warning / waiting ─────────────────────────────────────────────
        warning: {
          bg: 'hsl(var(--warning-bg))',
          fg: 'hsl(var(--warning-fg))',
          ring: 'hsl(var(--warning-ring))',
        },

        // ── role vs visibility: two scales, same values today ─────────────
        client: {
          bg: 'hsl(var(--client-bg))',
          chip: 'hsl(var(--client-chip))',
          fg: 'hsl(var(--client-fg))',
          ring: 'hsl(var(--client-ring))',
          avatar: 'hsl(var(--client-avatar))',
        },
        private: {
          bg: 'hsl(var(--private-bg))',
          fg: 'hsl(var(--private-fg))',
        },

        // ── links ─────────────────────────────────────────────────────────
        // `link` is unreadable on the frame (2.80) — use `link-onDark` there.
        link: {
          DEFAULT: 'hsl(var(--link))',
          onDark: 'hsl(var(--link-on-dark))',
        },

        online: 'hsl(var(--online))',
        'avatar-header': 'hsl(var(--avatar-header))',
      },
      /*
       * `--radius: 12px` makes the derived three exactly the design's first
       * three steps; xl/2xl/3xl extend it to all six (8/10/12/14/16/20).
       * `xl` (14) is the workhorse: row cards, buttons, tiles.
       */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '14px',
        '2xl': '16px',
        '3xl': '20px',
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
