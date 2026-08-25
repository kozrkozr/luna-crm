import { useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import {
  Button,
  Card,
  H4,
  ListItem,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  View,
  XStack,
  YGroup,
  YStack,
} from 'tamagui'
import { SHOOTS } from '../src/demo/data'
import { DOW_UK, monthName, t } from '../src/i18n/uk'
import { StatusPill } from '../src/ui'

/**
 * US-004 — shoot list with a calendar below the "new shoot" action.
 * Layout follows the prototype; the components are Tamagui's own.
 */
export default function ShootListScreen() {
  const router = useRouter()
  const [showEmpty, setShowEmpty] = useState(false)
  const [month, setMonth] = useState(8) // September 2026, where the fixtures live
  const [year, setYear] = useState(2026)

  const shoots = showEmpty ? [] : SHOOTS
  const shootDates = useMemo(() => new Set(shoots.map((shoot) => shoot.date)), [shoots])
  const ordered = useMemo(
    () => [...shoots].sort((a, b) => a.date.localeCompare(b.date)),
    [shoots]
  )

  const step = (delta: number) => {
    const next = month + delta
    if (next < 0) {
      setMonth(11)
      setYear(year - 1)
    } else if (next > 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(next)
    }
  }

  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$3">
        <Button theme="accent" size="$4" pressStyle={{ opacity: 0.85 }}>
          {t('newShoot')}
        </Button>

        <Card size="$4" borderWidth={1} borderColor="$borderColor">
          <Card.Header p="$3" pb="$2">
            <XStack items="center" justify="space-between">
              <Button size="$2" circular chromeless onPress={() => step(-1)}>
                ‹
              </Button>
              <SizableText size="$3" fontWeight="700">
                {monthName(month)} {year}
              </SizableText>
              <Button size="$2" circular chromeless onPress={() => step(1)}>
                ›
              </Button>
            </XStack>
          </Card.Header>
          <View px="$3" pb="$3">
            <CalendarGrid year={year} month={month} shootDates={shootDates} />
          </View>
        </Card>

        {ordered.length === 0 ? (
          <Card size="$4" borderWidth={1} borderColor="$borderColor" py="$8" items="center" gap="$2">
            <H4>{t('emptyShoots')}</H4>
            <Paragraph theme="alt1" text="center">
              {t('emptyShootsSub')}
            </Paragraph>
            <Button theme="accent" mt="$2">
              {t('createFirst')}
            </Button>
          </Card>
        ) : (
          <YGroup borderWidth={1} borderColor="$borderColor" rounded="$4" overflow="hidden">
            {ordered.map((shoot, index) => (
              <YGroup.Item key={shoot.id}>
                {index > 0 ? <Separator /> : null}
                <ListItem
                  pressStyle={{ bg: '$color3' }}
                  title={shoot.clientName}
                  subTitle={`${shoot.date}${shoot.locationAddress ? ` · ${shoot.locationAddress}` : ''}`}
                  iconAfter={<StatusPill value={shoot.status} />}
                  onPress={() => router.push(`/shoot/${shoot.id}`)}
                />
              </YGroup.Item>
            ))}
          </YGroup>
        )}

        {/* Spike affordance so both US-004 states can be seen on the device. */}
        <Button size="$2" chromeless self="flex-start" onPress={() => setShowEmpty(!showEmpty)}>
          {showEmpty ? '← показати список (демо)' : 'Показати порожній стан (демо)'}
        </Button>
      </YStack>
    </ScrollView>
  )
}

function CalendarGrid({
  year,
  month,
  shootDates,
}: {
  year: number
  month: number
  shootDates: Set<string>
}) {
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Array<{ key: string; day?: number; marked?: boolean }> = []
  for (let i = 0; i < firstDayOffset; i += 1) cells.push({ key: `pad-${i}` })
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ key: iso, day, marked: shootDates.has(iso) })
  }

  return (
    <YStack gap="$1">
      <XStack>
        {DOW_UK.map((dow) => (
          <View key={dow} flexBasis="14.28%" items="center">
            <SizableText size="$1" theme="alt2">
              {dow}
            </SizableText>
          </View>
        ))}
      </XStack>
      <XStack flexWrap="wrap">
        {cells.map((cell) => (
          <View key={cell.key} flexBasis="14.28%" items="center" py="$1">
            {cell.marked ? (
              <Button size="$2" circular theme="yellow" bg="$color4" disabled>
                <SizableText size="$2" fontWeight="700">
                  {cell.day}
                </SizableText>
              </Button>
            ) : (
              <View width="$2" height="$2" items="center" justify="center">
                <SizableText size="$2" theme={cell.day ? undefined : 'alt2'}>
                  {cell.day ?? ''}
                </SizableText>
              </View>
            )}
          </View>
        ))}
      </XStack>
    </YStack>
  )
}
