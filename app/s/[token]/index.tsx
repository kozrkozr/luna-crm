import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { Button } from '../../../src/components/ui/button'
import { Separator } from '../../../src/components/ui/separator'
import { Text, TextClassContext } from '../../../src/components/ui/text'
import { LinkReferenceGrid } from '../../../src/components/LinkReferenceGrid'
import { REFERENCE_DISPLAY_LIMIT } from '../../../src/components/ReferenceGrid'
import { uk } from '../../../src/i18n/uk'
import { LinkShootHeader } from '../../../src/components/LinkShootHeader'
import { FileSection } from '../../../src/components/FileSection'
import { ResponsePill as SharedResponsePill } from '../../../src/components/ResponsePill'
import {
  resolveLink,
  respondToLink,
  type ClientLinkPayload,
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
  | { phase: 'ready'; payload: CrewLinkPayload | ClientLinkPayload }

export default function LinkView() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })

  const load = useCallback(async () => {
    if (token === undefined) return
    const payload = await resolveLink(token)
    setResolution(payload ? { phase: 'ready', payload } : { phase: 'invalid' })
  }, [token])

  useEffect(() => {
    // Undefined during prerender and on the first client paint; wait for it.
    if (token === undefined) return
    let cancelled = false
    void (async () => {
      const payload = await resolveLink(token)
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

  // One URL shape, two audiences. Which view a token gets is the gateway's
  // answer, not a guess made here — the payloads are different objects and the
  // types make mixing them up a compile error.
  return resolution.payload.audience === 'crew' ? (
    <CrewView token={token!} payload={resolution.payload} onReload={load} />
  ) : (
    <ClientView token={token!} payload={resolution.payload} onReload={load} />
  )
}

/**
 * US-010 — the client's read-only view of their shoot.
 *
 * AC-1: date, location, the team, and the references. "with no edit controls
 * anywhere" is why there is nothing else on this screen — no confirm/decline
 * (that is the crew's, US-008), no reactions (US-011, retired by ADR-009), and
 * no response pills, which the prototype's client row also omits.
 *
 * The team rows are links. US-026 is the screen behind them, and it shows a
 * client the same person US-023 shows a crew member, minus the notes.
 */
function ClientView({
  token,
  payload,
  onReload,
}: {
  token: string
  payload: ClientLinkPayload
  onReload: () => void
}) {
  const { shoot, references, crew, rawFilesUrl, finishedPhotosUrl } = payload

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <LinkShootHeader shoot={shoot} onReload={onReload} />

        {references.length > 0 ? (
          <View className="gap-2 pt-2">
            <Text variant="h4">{uk.references}</Text>
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
                {/* US-026 AC-1 — each person opens their own details. Same
                    route as the crew audience uses; what it shows is decided by
                    the token, not by the URL. No response pill: the prototype's
                    client row omits it, and whether someone has answered is the
                    photographer's business (US-010 AC-1 lists team, not status). */}
                <Link href={`/s/${token}/crew/${member.id}`} asChild>
                  <Pressable className="active:bg-secondary flex-row items-center gap-3 px-4 py-3">
                    <Text className="flex-1">
                      <Text className="font-medium">{member.name}</Text>
                      <Text className="text-muted-foreground">{` · ${member.role}`}</Text>
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>
        </View>

        {/*
          US-024 — last on the screen, as in the prototype's client view, and
          shown whether or not there is a link: AC-1 asks for a placeholder
          rather than a missing section, so a client can see where files will
          appear before any exist. Not hosting (ADR-008).
        */}
        <FileSection label={uk.rawFiles} url={rawFilesUrl} />
        {/* US-025 — the same section for finished photos, in the prototype's
            order: raw files first, finished photos below. */}
        <FileSection label={uk.finishedPhotos} url={finishedPhotosUrl} />
      </View>
    </ScrollView>
  )
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

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <LinkShootHeader shoot={shoot} onReload={onReload} />
        {/*
          The reader is named. The prototype does this, and on a surface with no
          account it is the only thing that says whose link this is — which
          matters most where a phone is shared or a link forwarded. The client
          has no equivalent: their link names no person.
        */}
        <Text className="text-muted-foreground">
          {`${uk.youAre}: ${viewer.name} (${viewer.role})`}
        </Text>

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
                {/* US-007 AC-1 — each person is clickable through to their
                    own details, which US-023 now provides. */}
                <Link href={`/s/${token}/crew/${member.id}`} asChild>
                  <Pressable className="active:bg-secondary flex-row items-center gap-3 px-4 py-3">
                    <Text className="flex-1">
                      <Text className="font-medium">{member.name}</Text>
                      <Text className="text-muted-foreground">{` · ${member.role}`}</Text>
                    </Text>
                    <ResponsePill value={member.response} />
                  </Pressable>
                </Link>
              </View>
            ))}
          </View>
        </View>

        <Respond token={token} viewer={viewer} onAnswered={onReload} />
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
      <TextClassContext.Provider value="text-card-foreground">
        <View className="border-border bg-card mt-2 items-center rounded-xl border p-4">
          <Text>{viewer.response === 'confirmed' ? uk.youConfirmed : uk.youDeclined}</Text>
        </View>
      </TextClassContext.Provider>
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
 * The pill is shared with the creator's screen (src/components/ResponsePill).
 * Only the label lookup stays here: this surface is Ukrainian-only with no
 * switcher (`US-014`/`US-015`), so it reads `uk` directly rather than through
 * the provider the app group mounts.
 */
function ResponsePill({ value }: { value: LinkCrewMember['response'] }) {
  const label =
    value === 'confirmed'
      ? uk.responseConfirmed
      : value === 'declined'
        ? uk.responseDeclined
        : uk.responsePending

  return <SharedResponsePill value={value} label={label} />
}
