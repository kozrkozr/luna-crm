import { SizableText, Theme, View } from 'tamagui'
import { uk } from '../i18n/uk'
import type { ShootStatus } from '../features/shoots/api'

/**
 * Status colour comes from Tamagui's colour sub-themes, never hex values, so
 * the later re-theming task does not have to touch this file.
 */
const TONE: Record<ShootStatus, 'yellow' | 'green'> = {
  new: 'yellow',
  finished: 'green',
}

const LABEL: Record<ShootStatus, string> = {
  new: uk.statusNew,
  finished: uk.statusFinished,
}

export function StatusPill({ value }: { value: ShootStatus }) {
  return (
    <Theme name={TONE[value]}>
      <View bg="$color4" borderColor="$color6" borderWidth={1} rounded="$12" px="$2.5" py="$1">
        <SizableText size="$1" fontWeight="700" color="$color11">
          {LABEL[value]}
        </SizableText>
      </View>
    </Theme>
  )
}
