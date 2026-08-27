import { View } from 'react-native'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import type { ShootStatus } from '../features/shoots/api'

/**
 * Status colour is named by token, never by value, so the later re-theming task
 * does not have to touch this file.
 *
 * Before ADR-016 these were the UI kit's own colour sub-themes. NativeWind has
 * no equivalent, so each tone is a pair of tokens defined in
 * src/theme/global.css and surfaced by tailwind.config.js — same rule, one
 * indirection instead of the other.
 */
const TONE: Record<ShootStatus, string> = {
  new: 'bg-status-new border-status-new-border',
  finished: 'bg-status-finished border-status-finished-border',
}

const TONE_TEXT: Record<ShootStatus, string> = {
  new: 'text-status-new-foreground',
  finished: 'text-status-finished-foreground',
}

export function StatusPill({ value }: { value: ShootStatus }) {
  const t = useStrings()
  // Built here, not at module scope. The previous version read the dictionary
  // once when the module was imported, so it would have kept the language the
  // app started in for the rest of the session.
  const LABEL: Record<ShootStatus, string> = {
    new: t.statusNew,
    finished: t.statusFinished,
  }

  return (
    <View className={`rounded-full border px-2.5 py-1 ${TONE[value]}`}>
      <Text className={`text-xs font-bold ${TONE_TEXT[value]}`}>{LABEL[value]}</Text>
    </View>
  )
}
