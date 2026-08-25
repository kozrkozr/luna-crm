import { Paragraph, ScrollView, YStack } from 'tamagui'
import { uk } from '../../src/i18n/uk'

/**
 * US-004 — shoot list and calendar. Scaffolding only: the real screen is built
 * as part of EP-02, after EP-01 provides an account to own the shoots.
 */
export default function ShootListScreen() {
  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$2">
        <Paragraph theme="alt2">{uk.emptyShoots}</Paragraph>
      </YStack>
    </ScrollView>
  )
}
