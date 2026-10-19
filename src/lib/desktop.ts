import { createContext, useContext } from 'react'
import { Platform, useWindowDimensions } from 'react-native'

/**
 * `US-057` AC-1 — the window width from which the web app is laid out for a
 * desktop: a sidebar instead of the tab bar. Tailwind's `lg`, so a class like
 * `lg:flex-row` and this hook agree on where the line is.
 */
export const DESKTOP_MIN_WIDTH = 1024

/**
 * True on the web at 1024 px or wider, and **never on iOS**: the app is
 * iPhone-only and portrait (`supportsTablet: false`), and `US-057` AC-5 keeps
 * the iOS app unchanged — so the platform check is not left to the width.
 */
export function useDesktop(): boolean {
  const { width } = useWindowDimensions()
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH
}

/**
 * True inside the creator's app laid out for a desktop — set by
 * `AppShell.web.tsx` around the signed-in stack. The link views (`/s/...`)
 * share components with it but are not part of `US-057`, so a component
 * those views also use (`Sheet`) asks this rather than the window's width.
 */
export const DesktopShellContext = createContext(false)

export function useDesktopShell(): boolean {
  return useContext(DesktopShellContext)
}
