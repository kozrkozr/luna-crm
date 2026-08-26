import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Text } from '../../../src/components/ui/text'
import { LinkReferenceGrid } from '../../../src/components/LinkReferenceGrid'
import { uk } from '../../../src/i18n/uk'
import { resolveLink, type LinkReference } from '../../../src/features/links/gateway'

/**
 * US-021 on the anonymous surface — every reference on the shoot, reached from
 * the "show all" link on either link view (US-007 AC-1, US-010 AC-1).
 *
 * The same three-state rule as the view it comes from (S-2 F-2): nothing is
 * reported invalid until a resolution has been attempted. A crew member who
 * refreshes this page, or opens it from a message, must not be told their link
 * is dead while the bundle is still downloading.
 */
type Resolution =
  | { phase: 'resolving' }
  | { phase: 'invalid' }
  | { phase: 'ready'; references: LinkReference[] }

export default function LinkAllReferencesScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })

  useEffect(() => {
    if (token === undefined) return
    let cancelled = false
    void (async () => {
      const payload = await resolveLink(token)
      if (cancelled) return
      // Either audience. US-010 AC-1 gives the client the same "see all" link
      // the crew has, and both payloads carry `references` — the difference
      // between the two audiences is crew notes, which are not here.
      setResolution(payload ? { phase: 'ready', references: payload.references } : { phase: 'invalid' })
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  if (resolution.phase === 'resolving') {
    return (
      <View className="bg-background flex-1 items-center justify-center py-10">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (resolution.phase === 'invalid') {
    return (
      <View className="bg-background flex-1 items-center gap-2 px-4 py-10">
        <Text className="text-5xl">⚠️</Text>
        <Text variant="h3" className="text-center">
          {uk.linkInvalidTitle}
        </Text>
        <Text className="text-muted-foreground text-center">{uk.linkInvalidSub}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <Text variant="h3">{uk.allReferencesTitle}</Text>
        <LinkReferenceGrid references={resolution.references} />
      </View>
    </ScrollView>
  )
}
