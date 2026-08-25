import { SizableText, Theme, View } from 'tamagui'
import type { CrewResponse, ShootStatus } from '../demo/data'
import { uk } from '../i18n/uk'

/**
 * Status colour comes from Tamagui's colour sub-themes, not from hex values.
 * That is what makes the later re-theming task cheap: <Theme name="green">
 * resolves against whatever theme is installed, so this file needs no edit
 * when the palette changes.
 */
const TONE: Record<CrewResponse | ShootStatus, 'green' | 'red' | 'yellow'> = {
  confirmed: 'green',
  finished: 'green',
  declined: 'red',
  pending: 'yellow',
  new: 'yellow',
}

const LABEL: Record<CrewResponse | ShootStatus, string> = {
  pending: uk.statusPending,
  confirmed: uk.statusConfirmed,
  declined: uk.statusDeclined,
  new: uk.statusNew,
  finished: uk.statusFinished,
}

export const StatusPill = ({ value }: { value: CrewResponse | ShootStatus }) => (
  <Theme name={TONE[value]}>
    <View bg="$color4" borderColor="$color6" borderWidth={1} rounded="$12" px="$2.5" py="$1">
      <SizableText size="$1" fontWeight="700" color="$color11">
        {LABEL[value]}
      </SizableText>
    </View>
  </Theme>
)
