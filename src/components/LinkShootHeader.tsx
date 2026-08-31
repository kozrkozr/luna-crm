import { useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { ImageViewer } from './ImageViewer'
import { Text } from './ui/text'
import { uk } from '../i18n/uk'
import { Card } from './ui/card'
import { openExternalUrl } from '../lib/openExternalUrl'

type Shoot = {
  date: string
  locationAddress: string | null
  locationNote: string | null
  locationAttachmentUrl: string | null
}

/**
 * The date and the location, as both anonymous audiences see them.
 *
 * `US-007` gives a crew member the shoot's date and location; `US-010` gives a
 * client the same two. Nothing here is audience-dependent, so it lives once —
 * the fields that DO differ (notes, response, the answer buttons) are kept out
 * of this component deliberately, so there is never a flag in here deciding
 * what a client may see. That decision belongs to the gateway (ADR-013).
 *
 * `US-018` AC-2 shows the location note "wherever the location is displayed",
 * which is what makes it correct for both.
 */
export function LinkShootHeader({ shoot, onReload }: { shoot: Shoot; onReload: () => void }) {
  const [viewing, setViewing] = useState<string | null>(null)
  const hasLocation = shoot.locationAddress || shoot.locationNote || shoot.locationAttachmentUrl

  return (
    <>
      {/*
        ADR-017 — a hero card, mirroring the creator's shoot screen: the date
        leads, the location sits with it behind a hairline. Content, not chrome,
        so it belongs on white.

        No time range here. US-030 added start and end times, but the gateway
        still selects only `date` — deliberately, since AC-4 names the owner's
        screens and adding a field to an anonymous payload needs a story
        (ADR-013). When that story lands, the range goes here.
      */}
      <Card variant="hero" className="gap-3">
        <Text className="text-numeric-xl text-card-foreground font-bold">
          {`${uk.shootFor}: ${shoot.date}`}
        </Text>

        {hasLocation ? (
          <View className="border-border gap-2 border-t pt-3">
            {shoot.locationAddress ? (
              <View className="flex-row items-start gap-1.5">
                <Text className="text-muted-foreground text-[16px]">📍</Text>
                <Text className="text-body-sm text-card-foreground flex-1">{shoot.locationAddress}</Text>
              </View>
            ) : null}
            {shoot.locationNote ? (
              <Text className="text-body-sm text-muted-foreground">{shoot.locationNote}</Text>
            ) : null}
            {shoot.locationAttachmentUrl ? (
              <LocationAttachment
                url={shoot.locationAttachmentUrl}
                onOpenImage={setViewing}
                onMediaError={onReload}
              />
            ) : null}
          </View>
        ) : null}
      </Card>

      <ImageViewer uri={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

/**
 * `US-018`'s location attachment, read by its recipient. An image opens
 * full-screen; a video opens in the platform's player, for the reason
 * docs/open-questions.md #19 records — `S-4` has not run.
 */
function LocationAttachment({
  url,
  onOpenImage,
  onMediaError,
}: {
  url: string
  onOpenImage: (uri: string) => void
  onMediaError: () => void
}) {
  // The signed URL keeps the stored extension, which is the only signal of what
  // it holds — the column has no companion `kind` (open question 18).
  const isVideo = /\.(mov|mp4)(\?|$)/i.test(url)

  if (isVideo) {
    return (
      <Pressable
        className="bg-muted h-20 w-full items-center justify-center rounded-xl active:opacity-70"
        onPress={() => void openExternalUrl(url)}
        role="button"
        accessibilityLabel={uk.attachVideo}
      >
        <Text className="text-3xl">🎞</Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      className="bg-muted h-40 w-full overflow-hidden rounded-xl active:opacity-70"
      onPress={() => onOpenImage(url)}
      role="button"
      accessibilityLabel={uk.locationSection}
    >
      <Image source={{ uri: url }} className="h-full w-full" resizeMode="cover" onError={onMediaError} />
    </Pressable>
  )
}
