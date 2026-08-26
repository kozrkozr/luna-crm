import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { Button } from '../../src/components/ui/button'
import { Separator } from '../../src/components/ui/separator'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'
import { listShoots, type Shoot } from '../../src/features/shoots/api'
import { StatusPill } from '../../src/components/StatusPill'
import { ShootCalendar } from '../../src/components/ShootCalendar'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; shoots: Shoot[] }

/**
 * The shoot creator's home view (US-004).
 *
 * AC-1 — every shoot, ordered by date, with a calendar below the "new shoot"
 * button marking the dates that have one. The ordering is the query's
 * (`listShoots` orders ascending), not this screen's.
 *
 * AC-2 — with no shoots, an empty state and an unmarked calendar. Both render;
 * neither is an error and neither is a blank screen. The calendar deliberately
 * stays visible when the list is empty, which is what AC-2 describes.
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

        {/*
          AC-1 places the calendar below the "new shoot" button, as the
          prototype does. It is fed the loaded shoots' dates, so during loading
          and after an error it renders unmarked rather than disappearing —
          the chrome should not move under the reader.
        */}
        <ShootCalendar shootDates={state.status === 'loaded' ? state.shoots.map((s) => s.date) : []} />

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
            {/* The prototype's empty state offers the action directly. */}
            <Button className="mt-2" onPress={() => router.push('/(app)/new-shoot')}>
              <Text>{uk.createFirst}</Text>
            </Button>
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
