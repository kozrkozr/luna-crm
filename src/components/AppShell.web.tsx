import type { ReactNode } from 'react'
import { View } from 'react-native'
import { DesktopShellContext, useDesktop } from '../lib/desktop'
import { Sidebar } from './Sidebar'
import { SubscriptionNeeded } from '../features/subscription/SubscriptionNeeded'

/**
 * Web — `US-057` AC-1: from 1024 px the sidebar sits beside every signed-in
 * screen, tabs and pushed screens alike, which is why it wraps the whole stack
 * rather than living in the tabs' layout. Narrower, the phone layout, tab bar
 * and all (AC-4) — the same as `AppShell.tsx`.
 *
 * Both widths also hold `US-072`'s «Потрібна підписка», which `useGuard` opens
 * on the web in place of the paywall.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const desktop = useDesktop()
  if (!desktop)
    return (
      <>
        {children}
        <SubscriptionNeeded />
      </>
    )

  return (
    <View className="bg-background flex-1 flex-row">
      <Sidebar />
      {/* `overflow-hidden`: a screen's `Starfield` is drawn at the WINDOW's
          width, and beside the sidebar it ran 260 px past the edge — the page
          grew wider than the window, and full-screen modals (the photo
          preview) stretched to match. */}
      <View className="min-w-0 flex-1 overflow-hidden">
        <DesktopShellContext.Provider value={true}>
          {children}
          <SubscriptionNeeded />
        </DesktopShellContext.Provider>
      </View>
    </View>
  )
}
