import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { ImageViewer } from './ImageViewer'
import { Text } from './ui/text'
import { uk } from '../i18n/uk'
import { openExternalUrl } from '../lib/openExternalUrl'
import type { LinkReference } from '../features/links/gateway'

/**
 * References as the anonymous link surface shows them.
 *
 * Separate from `ReferenceGrid` on purpose. That one takes rows the creator's
 * app read from the database and signs their URLs itself; this one takes what
 * the gateway already shaped, because nothing on this surface may touch a table
 * (ADR-013, and `anon` is granted nothing). Same layout, different source of
 * truth — merging them would put a Supabase client on the link surface.
 *
 * `onMediaError` exists for risks.md R-4: a signed URL expires while the link
 * token never does, so an idle page can hold a dead image on an otherwise valid
 * view. The remedy CLAUDE.md names is re-requesting the payload, which is what
 * this reports upward.
 */
export function LinkReferenceGrid({
  references,
  onMediaError,
}: {
  references: LinkReference[]
  onMediaError?: () => void
}) {
  const [viewing, setViewing] = useState<string | null>(null)

  if (references.length === 0) return null

  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        {references.map((reference) =>
          reference.kind === 'image' ? (
            <Pressable
              key={reference.id}
              className="bg-secondary border-border h-24 w-24 overflow-hidden rounded-md border active:opacity-70"
              disabled={!reference.url}
              onPress={() => reference.url && setViewing(reference.url)}
              role="button"
              accessibilityLabel={uk.references}
            >
              {reference.url ? (
                <Image
                  source={{ uri: reference.url }}
                  className="h-full w-full"
                  resizeMode="cover"
                  onError={onMediaError}
                />
              ) : null}
            </Pressable>
          ) : (
            <Pressable
              key={reference.id}
              className="bg-secondary border-border h-24 w-24 justify-end rounded-md border p-2 active:opacity-70"
              onPress={() => reference.url && void openExternalUrl(reference.url)}
              role="button"
              accessibilityLabel={hostOf(reference.url)}
            >
              <Text className="text-xs" numberOfLines={3}>
                {hostOf(reference.url)}
              </Text>
            </Pressable>
          )
        )}
      </View>
      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

function hostOf(url: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
