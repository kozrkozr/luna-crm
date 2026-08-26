import { View } from 'react-native'
import { Text } from './ui/text'
import { uk } from '../i18n/uk'
import type { ShootStatus } from '../features/shoots/api'

/**
 * Status colour is named by token, never by value, so the later re-theming task
 * does not have to touch this file.
 *
 * On Tamagui these were colour sub-themes (<Theme name="yellow">). NativeWind
 * has no equivalent, so each tone is a pair of tokens defined in
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

const LABEL: Record<ShootStatus, string> = {
  new: uk.statusNew,
  finished: uk.statusFinished,
}

export function StatusPill({ value }: { value: ShootStatus }) {
  return (
    <View className={`rounded-full border px-2.5 py-1 ${TONE[value]}`}>
      <Text className={`text-xs font-bold ${TONE_TEXT[value]}`}>{LABEL[value]}</Text>
    </View>
  )
}
