import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Text } from '../../src/components/ui/text'
import { uk } from '../../src/i18n/uk'

/**
 * The anonymous link surface (US-007, US-010). Ukrainian only — no switcher
 * (EP-05, Out of scope).
 *
 * Resolution is a THREE-state machine, and that is a finding, not a style
 * choice. See docs/spikes/S-2-static-export.md F-2:
 *
 *   Static export prerenders this route with no token. Deciding "invalid" from
 *   an absent token bakes the US-007 AC-2 error page into the HTML the host
 *   then serves for EVERY link, valid ones included. The browser corrects it on
 *   hydration, but a crew member on cellular sees «Це посилання більше не діє»
 *   for as long as the JS takes to arrive — and reads a working link as dead.
 *
 * So: `resolving` until a resolution has actually been ATTEMPTED. Never infer
 * invalidity from a missing param. The same trap applies to US-010 AC-2,
 * US-026 AC-2 and US-008 AC-2.
 */
type Resolution =
  | { phase: 'resolving' }
  | { phase: 'invalid' }
  | { phase: 'ready'; payload: unknown }

export default function LinkView() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })

  useEffect(() => {
    // Undefined during prerender and on the first client paint; wait for it.
    if (token === undefined) return

    let cancelled = false
    // TODO(EP-03): call the link-gateway Edge Function, which resolves the
    // token and shapes the payload per audience (ADR-013). The client's
    // response must never contain a crew member's note at any point.
    void (async () => {
      const payload = null
      if (cancelled) return
      setResolution(payload ? { phase: 'ready', payload } : { phase: 'invalid' })
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

  return null
}
