import type { ReactNode } from 'react'

/**
 * What the signed-in screens sit in. On iOS, nothing: the stack is the whole
 * screen and the tab bar is the navigation. `AppShell.web.tsx` puts the
 * desktop sidebar beside it (`US-057`).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return <>{children}</>
}
