import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { Button } from '../../../src/components/ui/button'
import { Separator } from '../../../src/components/ui/separator'
import { Text } from '../../../src/components/ui/text'
import { ImageViewer } from '../../../src/components/ImageViewer'
import { LinkReferenceGrid } from '../../../src/components/LinkReferenceGrid'
import { REFERENCE_DISPLAY_LIMIT } from '../../../src/components/ReferenceGrid'
import { openExternalUrl } from '../../../src/lib/openExternalUrl'
import { uk } from '../../../src/i18n/uk'
import {
  resolveLink,
  respondToLink,
  type CrewLinkPayload,
  type LinkCrewMember,
} from '../../../src/features/links/gateway'

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
  | { phase: 'ready'; payload: CrewLinkPayload }

export default function LinkView() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })

  const load = useCallback(async () => {
    if (token === undefined) return
    const payload = await resolveLink(token)
    // The client audience gets its own view in US-010; a client token reaching
    // this screen has nothing to render, so it is treated as no payload rather
    // than half-rendered.
    setResolution(
      payload && payload.audience === 'crew' ? { phase: 'ready', payload } : { phase: 'invalid' }
    )
  }, [token])

  useEffect(() => {
    // Undefined during prerender and on the first client paint; wait for it.
    if (token === undefined) return
    let cancelled = false
    void (async () => {
      const payload = await resolveLink(token)
      if (cancelled) return
      setResolution(
        payload && payload.audience === 'crew' ? { phase: 'ready', payload } : { phase: 'invalid' }
      )
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

  // AC-2 — a clear "no longer valid" state, never shoot data and never a
  // generic error. The two causes (removed person, deleted shoot) are named in
  // the copy because the reader's next step is the same for both: ask the
  // photographer.
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

  return <CrewView token={token!} payload={resolution.payload} onReload={load} />
}

/** US-007 AC-1 — the date, the location, the references, and the rest of the crew. */
function CrewView({
  token,
  payload,
  onReload,
}: {
  token: string
  payload: CrewLinkPayload
  /**
   * Re-reads the payload from the gateway. Used for two things that are the
   * same thing: a media URL that expired (risks.md R-4) and an answer just
   * submitted — in both cases the server knows the current state and this
   * screen does not.
   */
  onReload: () => void
}) {
  const { shoot, viewer, references, crew } = payload
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <Text variant="h3">{`${uk.shootFor}: ${shoot.date}`}</Text>
        {/*
          The reader is named. The prototype does this, and on a surface with no
          account it is the only thing that says whose link this is — which
          matters most where a phone is shared or a link forwarded.
        */}
        <Text className="text-muted-foreground">
          {`${uk.youAre}: ${viewer.name} (${viewer.role})`}
        </Text>

        {shoot.locationAddress || shoot.locationNote || shoot.locationAttachmentUrl ? (
          <View className="gap-2 pt-2">
            <Text variant="h4">{uk.locationSection}</Text>
            {shoot.locationAddress ? <Text>{shoot.locationAddress}</Text> : null}
            {shoot.locationNote ? (
              <Text className="text-muted-foreground">{shoot.locationNote}</Text>
            ) : null}
            {shoot.locationAttachmentUrl ? (
              <LocationAttachment
                url={shoot.locationAttachmentUrl}
                onOpenImage={setViewingImage}
                onMediaError={onReload}
              />
            ) : null}
          </View>
        ) : null}

        {references.length > 0 ? (
          <View className="gap-2 pt-2">
            <Text variant="h4">{uk.references}</Text>
            {/*
              AC-1 — "up to the display limit (with a link to see all,
              US-021)". The limit is the same constant the creator's screen
              uses, so the two surfaces cannot drift apart.
            */}
            <LinkReferenceGrid
              references={references.slice(0, REFERENCE_DISPLAY_LIMIT)}
              onMediaError={onReload}
            />
            {references.length > REFERENCE_DISPLAY_LIMIT ? (
              <Link href={`/s/${token}/references`} asChild>
                <Button variant="secondary">
                  <Text>{`${uk.showAllReferences} (${references.length})`}</Text>
                </Button>
              </Link>
            ) : null}
          </View>
        ) : null}

        <View className="gap-2 pt-2">
          <Text variant="h4">{uk.crew}</Text>
          <View className="border-border overflow-hidden rounded-lg border">
            {crew.map((member, index) => (
              <View key={member.id}>
                {index > 0 ? <Separator /> : null}
                {/*
                  AC-1 says each person is "clickable through to their own
                  details (US-023)". That screen is not built, so the row is not
                  yet a link — a control that goes nowhere would be worse than
                  one that is not there.
                */}
                <View className="flex-row items-center gap-3 px-4 py-3">
                  <Text className="flex-1">
                    <Text className="font-medium">{member.name}</Text>
                    <Text className="text-muted-foreground">{` · ${member.role}`}</Text>
                  </Text>
                  <ResponsePill value={member.response} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Respond token={token} viewer={viewer} onAnswered={onReload} />

        <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
      </View>
    </ScrollView>
  )
}

/**
 * US-008 — confirm or decline, once.
 *
 * The buttons are replaced by the answer rather than joined by it: a submitted
 * response is final in v1 (Out of scope), so leaving a way to press the other
 * one would offer something the gateway will refuse.
 *
 * `onAnswered` re-reads the payload instead of trusting the local state. The
 * gateway is the thing that decided, and a refusal it returns — because the
 * link was revoked between loading the page and answering — has to be visible
 * rather than papered over with an optimistic pill.
 */
function Respond({
  token,
  viewer,
  onAnswered,
}: {
  token: string
  viewer: CrewLinkPayload['viewer']
  onAnswered: () => void
}) {
  const [busy, setBusy] = useState(false)

  if (viewer.response !== 'pending') {
    return (
      <View className="border-border bg-card mt-2 items-center rounded-xl border p-4">
        <Text>{viewer.response === 'confirmed' ? uk.youConfirmed : uk.youDeclined}</Text>
      </View>
    )
  }

  const answer = async (response: 'confirmed' | 'declined') => {
    setBusy(true)
    await respondToLink(token, response)
    setBusy(false)
    // Re-read either way. If it failed, the reader sees why on the next render.
    onAnswered()
  }

  return (
    <View className="mt-2 flex-row gap-2">
      <Button
        variant="secondary"
        className="flex-1"
        disabled={busy}
        onPress={() => void answer('declined')}
      >
        <Text>{uk.decline}</Text>
      </Button>
      <Button className="flex-1" disabled={busy} onPress={() => void answer('confirmed')}>
        <Text>{uk.confirm}</Text>
      </Button>
    </View>
  )
}

/**
 * US-018's location attachment, read by its recipient. An image opens
 * full-screen; a video opens in the platform's player, for the reason
 * docs/open-questions.md #19 records — S-4 has not run.
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
        className="bg-secondary border-border h-20 w-full items-center justify-center rounded-md border active:opacity-70"
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
      className="bg-secondary border-border h-40 w-full overflow-hidden rounded-md border active:opacity-70"
      onPress={() => onOpenImage(url)}
      role="button"
      accessibilityLabel={uk.locationSection}
    >
      <Image
        source={{ uri: url }}
        className="h-full w-full"
        resizeMode="cover"
        onError={onMediaError}
      />
    </Pressable>
  )
}

function ResponsePill({ value }: { value: LinkCrewMember['response'] }) {
  const tone =
    value === 'confirmed'
      ? 'bg-status-finished border-status-finished-border'
      : value === 'declined'
        ? 'bg-destructive/10 border-destructive/30'
        : 'bg-status-new border-status-new-border'
  const text =
    value === 'confirmed'
      ? 'text-status-finished-foreground'
      : value === 'declined'
        ? 'text-destructive'
        : 'text-status-new-foreground'
  const label =
    value === 'confirmed'
      ? uk.responseConfirmed
      : value === 'declined'
        ? uk.responseDeclined
        : uk.responsePending

  return (
    <View className={`rounded-full border px-2.5 py-1 ${tone}`}>
      <Text className={`text-xs font-bold ${text}`}>{label}</Text>
    </View>
  )
}
