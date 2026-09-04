import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { ImageViewer } from './ImageViewer'
import { Card } from './ui/card'
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

  /*
    Grouped by category since 2026-09-03 — «Світло · 3 фото», then its tiles —
    which is what `Shoot Link Preview.dc.html` draws and what the creator's own
    «Матеріали» tab has had since `20260830120000`.

    **Uncategorised references keep their place and get no heading.** That column
    is nullable and the migration deliberately did not backfill it — "assigning
    them a category, even a plausible one, would be writing data" — so on most
    shoots every reference is uncategorised and this renders exactly as the flat
    grid it replaced. Naming that group would mean inventing a word for "the
    ones nobody sorted".

    Order follows first appearance, so the grid does not reshuffle when a
    category is added to one reference.
  */
  const groups: { category: string | null; items: LinkReference[] }[] = []
  for (const reference of references) {
    const key = reference.category?.trim() || null
    const existing = groups.find((g) => g.category === key)
    if (existing) existing.items.push(reference)
    else groups.push({ category: key, items: [reference] })
  }
  // The unlabelled group last: a heading followed by headingless tiles reads as
  // a mistake, where tiles followed by headed groups reads as a list.
  groups.sort((a, b) => Number(a.category === null) - Number(b.category === null))

  return (
    <>
      {/*
        **One bordered card, each group a row inside it** — the artboard wraps
        every group in a single `#27272a` card at radius 12 and separates them
        with hairlines, where this drew free-standing blocks with a gap. That is
        the difference between "a list of groups" and "some groups near each
        other", and it is the whole reason the section reads as one object.
      */}
      <Card variant="flat" className="gap-0 p-0">
        {groups.map((group, index) => (
          <View
            key={group.category ?? '\u0000uncategorised'}
            className={`gap-2.5 px-4 py-3.5 ${index > 0 ? 'border-border border-t' : ''}`}
          >
            {group.category ? (
              <View className="flex-row items-baseline justify-between">
                <Text className="text-body-sm text-foreground font-medium">
                  {group.category}
                </Text>
                <Text className="text-label text-muted-foreground">
                  {`${group.items.length} ${uk.photosWord}`}
                </Text>
              </View>
            ) : null}
            <View className="flex-row flex-wrap gap-[7px]">
              {group.items.map((reference) =>
                reference.kind === 'image' ? (
                  <Pressable
                    key={reference.id}
                    className="bg-muted border-border h-[58px] w-[58px] overflow-hidden rounded-lg border active:opacity-70"
                    disabled={!reference.url}
                    onPress={() => reference.url && setViewing(reference.url)}
                    role="button"
                    accessibilityLabel={reference.category ?? uk.references}
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
                    className="bg-muted border-border h-[58px] w-[58px] justify-end rounded-lg border p-1.5 active:opacity-70"
                    onPress={() => reference.url && void openExternalUrl(reference.url)}
                    role="button"
                    accessibilityLabel={hostOf(reference.url)}
                  >
                    <Text className="text-micro" numberOfLines={3}>
                      {hostOf(reference.url)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        ))}
      </Card>
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
