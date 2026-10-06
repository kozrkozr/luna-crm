import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Text } from '../../../src/components/ui/text'
import { LinkReferenceGrid } from '../../../src/components/LinkReferenceGrid'
import { useStrings } from '../../../src/i18n/LanguageProvider'
import { resolveLink, type LinkReference } from '../../../src/features/links/gateway'
import { useMediaReload } from '../../../src/features/links/useMediaReload'
import { Starfield } from '../../../src/components/Starfield'

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
  const t = useStrings()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })

  const load = useCallback(async () => {
    if (token === undefined) return
    const payload = await resolveLink(token)
    // Either audience. US-010 AC-1 gives the client the same "see all" link
    // the crew has, and both payloads carry `references` — the difference
    // between the two audiences is crew notes, which are not here.
    setResolution(payload ? { phase: 'ready', references: payload.references } : { phase: 'invalid' })
  }, [token])
  // risks.md R-4 — an expired signed URL re-requests the payload.
  const onMediaError = useMediaReload(load)

  useEffect(() => {
    if (token === undefined) return
    void load()
  }, [token, load])

  if (resolution.phase === 'resolving') {
    return (
      <View className="bg-background flex-1 items-center justify-center py-10">
        <Starfield />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (resolution.phase === 'invalid') {
    return (
      <View className="bg-background flex-1 items-center gap-2 px-4 py-10">
        <Starfield />
        <Text className="text-5xl">⚠️</Text>
        <Text className="text-title text-foreground text-center font-semibold">
          {t.linkInvalidTitle}
        </Text>
        <Text className="text-body-sm text-muted-foreground text-center" style={{ maxWidth: 280 }}>
          {t.linkInvalidSub}
        </Text>
      </View>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View className="gap-3 p-4">
          <Text className="text-title text-foreground font-semibold">{t.allReferencesTitle}</Text>
          <LinkReferenceGrid references={resolution.references} onMediaError={onMediaError} />
        </View>
      </ScrollView>
    </View>
  )
}
