import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Separator } from '../../src/components/ui/separator'
import { Text } from '../../src/components/ui/text'
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
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <Button onPress={() => router.push('/(app)/new-shoot')}>
          <Text>{uk.newShoot}</Text>
        </Button>

        {state.status === 'loading' ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
          </View>
        ) : state.status === 'error' ? (
          <Text className="text-muted-foreground">{uk.somethingWentWrong}</Text>
        ) : state.shoots.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text variant="h4">{uk.emptyShoots}</Text>
            <Text className="text-muted-foreground">{uk.emptyShootsSub}</Text>
          </View>
        ) : (
          /*
            The previous UI layer's grouped-list components have no RNR
            counterpart, so the list is composed here: a bordered, clipped
            container, a Separator between rows, and each row a
            title/subtitle/trailing layout. Same shape, same content — the kit
            is thinner, not the screen.

            Rows open the shoot detail screen. They were deliberately inert
            until US-003, which is the story that gave them somewhere to go.
          */
          <View className="border-border overflow-hidden rounded-lg border">
            {state.shoots.map((shoot, index) => (
              <View key={shoot.id}>
                {index > 0 ? <Separator /> : null}
                <Link href={`/(app)/shoot/${shoot.id}`} asChild>
                  <Pressable className="active:bg-secondary flex-row items-center gap-3 px-4 py-3">
                    <View className="flex-1 gap-0.5">
                      <Text className="font-medium">{shoot.clientName}</Text>
                      <Text className="text-muted-foreground text-sm">
                        {`${shoot.date}${shoot.locationAddress ? ` · ${shoot.locationAddress}` : ''}`}
                      </Text>
                    </View>
                    <StatusPill value={shoot.status} />
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
