import { createContext, useContext } from 'react'
import type { ViewStyle } from 'react-native'

/**
 * `US-057` AC-6 — a link page keeps a 640 px column in the middle of a wide
 * window; below 640 px the style changes nothing. `app/s/_layout.tsx` turns it
 * on, so the in-app entrance to the same views (`(app)/crew/`) is untouched.
 */
export const LinkColumnContext = createContext(false)

const COLUMN: ViewStyle = { width: '100%', maxWidth: 640, alignSelf: 'center' }

/** The column's style on a link page; `undefined` anywhere else. */
export function useLinkColumn(): ViewStyle | undefined {
  return useContext(LinkColumnContext) ? COLUMN : undefined
}
