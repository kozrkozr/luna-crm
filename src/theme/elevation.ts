import { Platform, type ViewStyle } from 'react-native'

/**
 * Layer C of the design system adopted in `ADR-017`.
 *
 * Shadows are style objects rather than Tailwind classes because NativeWind has
 * no reliable cross-platform shadow: iOS wants four `shadow*` props, Android
 * wants a single `elevation`, and the web wants `boxShadow`. RNR's own
 * components use `shadow-black/5` classes, which is why they look flat on
 * Android — this is the seam that fixes that where it matters.
 *
 * The whole system has exactly **two** shadows. If a third seems necessary,
 * the surface probably wants a border instead (see `onDark.border`).
 *
 * `shadowColor` is a colour value outside global.css, which the project's rule
 * would normally forbid. It is allowed here because this file is inside
 * src/theme/ — the rule scopes the *directory*, not the one file — and because
 * an alpha-only black is not part of the palette: it is the same shadow whatever
 * the theme, and RN gives no way to express it as a token.
 *
 * `boxShadow` is typed on `ViewStyle` as of RN 0.86, so the web branch needs no
 * cast.
 *
 * The web branch matters more than it looks: the link views are static-exported
 * (`ADR-012`) and are two of the product's three user journeys, so a shadow that
 * silently disappears there is a shadow that is missing for most of the people
 * who see this product.
 */

/** Cards and the active segment of a light segmented control. */
export const shadowXs: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
  },
  android: { elevation: 1 },
  web: { boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  default: {},
})

/** Popovers, dropdowns, suggestion lists, modals, toasts. */
export const shadowOverlay: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 8 },
  web: { boxShadow: '0 8px 24px rgba(0,0,0,.18)' },
  default: {},
})

export const elevation = { xs: shadowXs, overlay: shadowOverlay } as const

/**
 * Animation durations (§3.7), normalised from the mockups' spread to three.
 * `ease-out` for things appearing, `ease-in` for things leaving.
 *
 * Toast auto-dismiss is separate and deliberately not one of these: 2200ms
 * normally, **4000ms when the toast carries an undo action**. Do not shorten the
 * second — someone has to read it and reach the button.
 */
export const duration = { fast: 150, base: 200, slow: 250 } as const
export const toastDuration = { plain: 2200, withAction: 4000 } as const
