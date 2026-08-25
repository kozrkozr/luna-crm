import { Paragraph, ScrollView, YStack } from 'tamagui'
import { uk } from '../../src/i18n/uk'

/**
 * US-004 — shoot list and calendar. Scaffolding: US-001 AC-1 requires a new
 * account to land on its *empty* shoot list, which is what this renders. The
 * real screen, with the calendar and populated state, is EP-02.
 */
export default function ShootListScreen() {
  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$2" items="center" py="$10">
        <Paragraph theme="alt2">{uk.emptyShoots}</Paragraph>
        <Paragraph theme="alt2">{uk.emptyShootsSub}</Paragraph>
      </YStack>
    </ScrollView>
  )
}
