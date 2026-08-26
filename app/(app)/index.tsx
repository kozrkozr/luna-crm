import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  Button,
  Card,
  H4,
  ListItem,
  Paragraph,
  ScrollView,
  Separator,
  Spinner,
  XStack,
  YGroup,
  YStack,
} from 'tamagui'
import { uk } from '../../src/i18n/uk'
import { listShoots, type Shoot } from '../../src/features/shoots/api'
import { StatusPill } from '../../src/components/StatusPill'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoots: Shoot[] }

/**
 * The shoot creator's home view.
 *
 * US-002 AC-1 requires a newly created shoot to *appear here*, which is why the
 * list is real rather than a placeholder. The calendar, ordering rules and the
 * empty-state copy in full are US-004; this renders the list and its empty
 * state only.
 *
 * Refetches on focus so returning from the creation form shows the new shoot
 * without a manual refresh.
 */
export default function ShootListScreen() {
  const router = useRouter()
  const [state, setState] = useState<State>({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const shoots = await listShoots()
        if (!active) return
        setState(shoots ? { status: 'loaded', shoots } : { status: 'error' })
      })()
      return () => {
        active = false
      }
    }, [])
  )

  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$3">
        <Button theme="accent" size="$4" onPress={() => router.push('/(app)/new-shoot')}>
          {uk.newShoot}
        </Button>

        {state.status === 'loading' ? (
          <YStack items="center" py="$8">
            <Spinner size="large" />
          </YStack>
        ) : state.status === 'error' ? (
          <Paragraph theme="alt2">{uk.somethingWentWrong}</Paragraph>
        ) : state.shoots.length === 0 ? (
          <YStack items="center" py="$8" gap="$2">
            <H4>{uk.emptyShoots}</H4>
            <Paragraph theme="alt2">{uk.emptyShootsSub}</Paragraph>
          </YStack>
        ) : (
          <YGroup borderWidth={1} borderColor="$borderColor" rounded="$4" overflow="hidden">
            {state.shoots.map((shoot, index) => (
              <YGroup.Item key={shoot.id}>
                {index > 0 ? <Separator /> : null}
                <ListItem
                  pressStyle={{ bg: '$color3' }}
                  title={shoot.clientName}
                  subTitle={`${shoot.date}${shoot.locationAddress ? ` · ${shoot.locationAddress}` : ''}`}
                  iconAfter={<StatusPill value={shoot.status} />}
                />
              </YGroup.Item>
            ))}
          </YGroup>
        )}
      </YStack>
    </ScrollView>
  )
}
