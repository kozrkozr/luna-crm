import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useDesktop } from '../lib/desktop'
import { Sidebar } from './Sidebar'

/**
 * Web — `US-057` AC-1: from 1024 px the sidebar sits beside every signed-in
 * screen, tabs and pushed screens alike, which is why it wraps the whole stack
 * rather than living in the tabs' layout. Narrower, the phone layout, tab bar
 * and all (AC-4) — the same as `AppShell.tsx`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const desktop = useDesktop()
  if (!desktop) return <>{children}</>

  return (
    <View className="bg-background flex-1 flex-row">
      <Sidebar />
      <View className="min-w-0 flex-1">{children}</View>
    </View>
  )
}
