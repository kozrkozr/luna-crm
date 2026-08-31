import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import CalendarIcon from 'lucide-react-native/icons/calendar'
import Check from 'lucide-react-native/icons/check'
import Lock from 'lucide-react-native/icons/lock'
import X from 'lucide-react-native/icons/x'
import { Avatar } from '../../../src/components/Avatar'
import { Badge } from '../../../src/components/ui/badge'
import { Button } from '../../../src/components/ui/button'
import { Card } from '../../../src/components/ui/card'
import { Icon } from '../../../src/components/ui/icon'
import { Sheet } from '../../../src/components/ui/sheet'
import { Text } from '../../../src/components/ui/text'
import { Toast } from '../../../src/components/Toast'
import { LinkReferenceGrid } from '../../../src/components/LinkReferenceGrid'
import { SectionLabel } from '../../../src/components/ShootFormFields'
import { uk } from '../../../src/i18n/uk'
import { openExternalUrl } from '../../../src/lib/openExternalUrl'
import {
  formatDayMonthWeekday,
  formatDuration,
  formatTimeRange,
} from '../../../src/features/shoots/date'
import { daysUntil, distanceLabel } from '../../../src/features/shoots/home'
import {
  calendarEvent,
  googleCalendarUrl,
  icsDataUri,
} from '../../../src/features/links/calendar'
import {
  resolveLink,
  respondToLink,
  type ClientLinkPayload,
  type CrewLinkPayload,
  type LinkOrganizer,
  type LinkPayload,
} from '../../../src/features/links/gateway'

type Resolution =
  | { phase: 'resolving' }
  | { phase: 'invalid' }
  | { phase: 'ready'; payload: LinkPayload }

/**
 * The anonymous link view — `US-007` (crew) and `US-010` (client), rebuilt
 * against `Shoot Link Preview.dc.html` (owner, 2026-08-31).
 *
 * **One screen, two audiences, and the split is not made here.** The gateway
 * builds a `CrewLinkPayload` or a `ClientLinkPayload` from explicit column
 * lists, and the two are separate TypeScript types — so a crew-only field
 * cannot be read off a client payload without the compiler objecting. This
 * screen renders what it was given and filters nothing (`ADR-013`, CLAUDE.md
 * rule 2).
 *
 * Ukrainian only, reading `uk` directly: link views sit outside the language
 * provider (`EP-05`, `US-014`).
 */
export default function LinkView() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })
  const [toast, setToast] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (token === undefined) return
    const payload = await resolveLink(token)
    setResolution(payload ? { phase: 'ready', payload } : { phase: 'invalid' })
  }, [token])

  useEffect(() => {
    // Undefined during prerender and on the first client paint; wait for it.
    if (token === undefined) return
    void load()
  }, [token, load])

  if (resolution.phase === 'resolving') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (resolution.phase === 'invalid') {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-2 p-8">
        <Text className="text-title-sm text-foreground text-center font-semibold">
          {uk.linkInvalidTitle}
        </Text>
        <Text className="text-body-sm text-muted-foreground text-center leading-5">
          {uk.linkInvalidSub}
        </Text>
      </View>
    )
  }

  const { payload } = resolution
  const isCrew = payload.audience === 'crew'
  const shoot = payload.shoot
  const answered = isCrew && payload.viewer.response !== 'pending'
  const confirmed = isCrew && payload.viewer.response === 'confirmed'

  const answer = async (response: 'confirmed' | 'declined', why: string | null) => {
    if (token === undefined) return
    setBusy(true)
    const ok = await respondToLink(token, response, why)
    setBusy(false)
    setDeclineOpen(false)
    if (!ok) return setToast(uk.somethingWentWrong)
    setToast(response === 'confirmed' ? uk.confirmedThanks : uk.declineSent)
    // Refetch rather than patching local state: the answer is the server's now,
    // and the status card should report what it actually holds.
    await load()
  }

  const event = calendarEvent(payload, `${uk.shootFor} · ${shoot.locationAddress ?? ''}`.trim())
  const range = formatTimeRange(shoot.startTime, shoot.endTime)
  const duration = formatDuration(shoot.startTime, shoot.endTime, {
    hours: uk.hoursShort,
    minutes: uk.minutesShort,
  })
  const days = daysUntil(shoot.date)

  return (
    <View className="bg-background flex-1">
      {/* The product mark, and the one thing this page says about itself: the
          link is private. No expiry line — `ADR-014` has no expiry column, and
          the design's «Діє до…» would be untrue on every link. */}
      <View className="bg-background border-border flex-row items-center gap-2.5 border-b px-4 py-3">
        <View className="bg-secondary h-[26px] w-[26px] items-center justify-center rounded-md">
          <Text className="text-caption text-foreground font-semibold">
            {uk.appName.slice(0, 1)}
          </Text>
        </View>
        <Text className="text-body text-foreground flex-1 font-semibold">{uk.appName}</Text>
        <Icon as={Lock} size={12} strokeWidth={2} className="text-muted-foreground" />
        <Text className="text-caption text-muted-foreground">{uk.privateLink}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: isCrew && !answered ? 168 : 40 }}>
        <View className="gap-5 p-4">
          {/* Who the reader is, and why they got this. */}
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              <Badge
                variant="muted"
                label={
                  isCrew
                    ? uk.yourRoleTemplate.replace('{role}', payload.viewer.role)
                    : uk.youAreTheClient
                }
              />
              <Text className="text-label text-muted-foreground shrink" numberOfLines={1}>
                {isCrew && payload.organizer
                  ? uk.inviteFromTemplate.replace('{name}', payload.organizer.name)
                  : uk.yourShootDetails}
              </Text>
            </View>

            {/* The hero: when, where, and how to get in. */}
            <Card variant="flat" className="border-border-strong gap-0 p-0">
              <View className="p-4">
                <View className="flex-row items-start justify-between gap-2.5">
                  <Text className="text-label text-muted-foreground flex-1 font-medium">
                    {formatDayMonthWeekday(shoot.date, uk.monthsGenitive, uk.weekdaysFull)}
                  </Text>
                  <Badge variant="solid" label={distanceLabel(days, uk)} />
                </View>
                {/* `US-030` AC-6 — a shoot created before that story has no
                    range, and the date above is then the whole answer. */}
                {range ? (
                  <Text
                    className="text-display text-foreground mt-2 font-semibold"
                    style={{ letterSpacing: -0.5 }}
                  >
                    {range}
                  </Text>
                ) : null}
                {duration ? (
                  <Text className="text-body-sm text-muted-foreground mt-1">{duration}</Text>
                ) : null}
              </View>

              {shoot.locationAddress ? (
                <View className="border-border border-t p-4">
                  <Text className="text-body text-foreground font-semibold">
                    {shoot.locationAddress}
                  </Text>
                  <View className="mt-3 flex-row gap-2">
                    <Button
                      className="h-10 flex-1"
                      onPress={() =>
                        void openExternalUrl(
                          `https://maps.google.com/?q=${encodeURIComponent(shoot.locationAddress ?? '')}`
                        )
                      }
                    >
                      <Text className="text-body-sm font-medium">{uk.route}</Text>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 flex-1"
                      onPress={() => {
                        void (async () => {
                          await Clipboard.setStringAsync(shoot.locationAddress ?? '')
                          setToast(uk.addressCopied)
                        })()
                      }}
                    >
                      <Text className="text-body-sm font-medium">{uk.copyAddress}</Text>
                    </Button>
                  </View>
                </View>
              ) : null}

              {/* «Як потрапити» — the access note. The design bolds the door code
                  and the guard's number inside the sentence; those are not
                  separate columns (redesign-log H-2), so it renders as written. */}
              {shoot.locationNote ? (
                <View className="border-border gap-2 border-t p-4">
                  <SectionLabel label={uk.howToGetIn} />
                  <Text className="text-body-sm text-foreground/90 leading-5">
                    {shoot.locationNote}
                  </Text>
                </View>
              ) : null}
            </Card>
          </View>

          {/* The answer, once there is one. «Змінити» reopens it — see the
              gateway's `respond`, and note this reverses `US-008`'s "a submitted
              response is final". */}
          {answered ? (
            <View className="bg-secondary border-border-strong flex-row items-center gap-3 rounded-xl border p-4">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  confirmed ? 'bg-primary' : 'bg-border-strong'
                }`}
              >
                <Icon
                  as={confirmed ? Check : X}
                  size={15}
                  strokeWidth={2.4}
                  className={confirmed ? 'text-primary-foreground' : 'text-foreground'}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-body text-foreground font-semibold">
                  {confirmed ? uk.youConfirmed : uk.youDeclined}
                </Text>
                <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={2}>
                  {confirmed
                    ? uk.confirmedSub
                    : [uk.declinedSub, isCrew ? payload.viewer.declineReason : null]
                        .filter(Boolean)
                        .join(' · ')}
                </Text>
              </View>
              <Button
                variant="outline"
                className="h-9 shrink-0 px-3"
                disabled={busy}
                onPress={() => void answer('confirmed', null)}
              >
                <Text className="text-label font-medium">{uk.changeAnswer}</Text>
              </Button>
            </View>
          ) : null}

          <Button variant="outline" size="cta" className="h-11 py-0" onPress={() => setCalendarOpen(true)}>
            <Icon as={CalendarIcon} size={15} strokeWidth={1.7} />
            <Text className="text-body-sm font-medium">{uk.addToCalendar}</Text>
          </Button>

          {/* Хто на зйомці. The client sees this list too — `US-026` gives them
              the crew, minus notes. */}
          <View className="gap-2">
            <View className="flex-row items-baseline justify-between px-0.5">
              <SectionLabel label={uk.whoIsOnTheShoot} />
              <Text className="text-label text-muted-foreground">
                {String(payload.crew.length)}
              </Text>
            </View>
            <Card variant="flat" className="gap-0 p-0">
              {payload.crew.map((member, index) => {
                const isYou = isCrew && member.id === payload.crewMemberId
                return (
                  <View
                    key={member.id}
                    className={`min-h-16 flex-row items-center gap-3 px-4 py-3 ${
                      index > 0 ? 'border-border border-t' : ''
                    } ${isYou ? 'bg-secondary/40' : ''}`}
                  >
                    <Avatar name={member.name} size={38} />
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-body text-foreground shrink font-semibold"
                          numberOfLines={1}
                        >
                          {member.name}
                        </Text>
                        {isYou ? <Badge variant="solid" label={uk.youBadge} /> : null}
                      </View>
                      <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={1}>
                        {member.role}
                      </Text>
                    </View>
                    {/*
                      Response badges on the CREW link only. A client is not shown
                      who has and has not answered — `US-026` gives them the crew
                      list, and nothing says an internal confirmation state is
                      theirs to read.
                    */}
                    {isCrew && 'response' in member ? (
                      <Badge
                        variant={member.response === 'confirmed' ? 'solid' : 'outline'}
                        label={
                          member.response === 'confirmed'
                            ? uk.responseConfirmed
                            : member.response === 'declined'
                              ? uk.responseDeclined
                              : uk.responsePending
                        }
                      />
                    ) : null}
                  </View>
                )
              })}
            </Card>
          </View>

          {payload.references.length > 0 ? (
            <View className="gap-2">
              <SectionLabel label={uk.references} />
              <LinkReferenceGrid references={payload.references} />
            </View>
          ) : null}

          {/*
            «Нотатки від організатора» — CREW ONLY, and the guarantee is not this
            condition. `shoots.notes` is selected in the gateway's `crewPayload`
            and in no other query, so a client's payload has no such field for
            this screen to render (`US-026`: absent, "not even an empty one").
            The `isCrew` check is what satisfies TypeScript; the SELECT is what
            satisfies `ADR-013`.
          */}
          {isCrew && payload.shoot.notes ? (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <SectionLabel label={uk.organizerNotes} />
                </View>
                <Badge variant="outline" label={uk.clientCannotSee} />
              </View>
              <Card variant="flat">
                <Text className="text-body-sm text-foreground/90 leading-6">
                  {payload.shoot.notes}
                </Text>
              </Card>
            </View>
          ) : null}

          {/* `US-024` / `US-025` — the client's two file links. The crew payload
              carries none, which is why this is inside the client branch. */}
          {!isCrew && (payload.rawFilesUrl || payload.finishedPhotosUrl) ? (
            <View className="gap-2">
              <SectionLabel label={uk.filesAndLinks} />
              <Card variant="flat" className="gap-0 p-0">
                {(
                  [
                    { title: uk.sourceFilesSection as string, url: payload.rawFilesUrl },
                    { title: uk.finishedFilesSection as string, url: payload.finishedPhotosUrl },
                  ] as { title: string; url: string | null }[]
                )
                  .filter((file): file is { title: string; url: string } => !!file.url)
                  .map((file, index) => (
                    <View
                      key={file.title}
                      className={`min-h-[60px] flex-row items-center gap-3 p-3.5 ${
                        index > 0 ? 'border-border border-t' : ''
                      }`}
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-body-sm text-foreground font-semibold">
                          {file.title}
                        </Text>
                        <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={1}>
                          {file.url.replace(/^https?:\/\//, '')}
                        </Text>
                      </View>
                      <Button
                        variant="outline"
                        className="h-9 shrink-0 px-3"
                        onPress={() => void openExternalUrl(file.url)}
                      >
                        <Text className="text-label font-medium">{uk.openWord}</Text>
                      </Button>
                    </View>
                  ))}
              </Card>
            </View>
          ) : null}

          {payload.organizer ? <OrganizerCard organizer={payload.organizer} /> : null}

          <View className="items-center gap-3 pt-2">
            <Text className="text-caption text-muted-foreground/70 text-center leading-4">
              {uk.privateLinkWarning}
            </Text>
            <Text className="text-caption text-muted-foreground border-border w-full border-t pt-3.5 text-center">
              {uk.organisedIn}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* `US-008` — the answer, pinned, while there is one to give. */}
      {isCrew && !answered ? (
        <View className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pb-8 pt-3">
          <Button variant="cta" size="cta" disabled={busy} onPress={() => void answer('confirmed', null)}>
            <Text>{uk.confirmParticipation}</Text>
          </Button>
          <Pressable
            className="mt-1 min-h-11 items-center justify-center"
            onPress={() => setDeclineOpen(true)}
            role="button"
          >
            <Text className="text-body-sm text-muted-foreground font-medium">{uk.cannotCome}</Text>
          </Pressable>
        </View>
      ) : null}

      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)}>
        <View className="gap-2 pb-2">
          <Text className="text-subtitle text-foreground mb-2 font-semibold">
            {uk.addToCalendar}
          </Text>
          <Button
            variant="outline"
            size="cta"
            className="h-12 justify-start px-3.5 py-0"
            onPress={() => {
              setCalendarOpen(false)
              void openExternalUrl(googleCalendarUrl(event))
            }}
          >
            <Text className="text-body font-medium">{uk.googleCalendar}</Text>
          </Button>
          <Button
            variant="outline"
            size="cta"
            className="h-12 justify-start px-3.5 py-0"
            onPress={() => {
              setCalendarOpen(false)
              void openExternalUrl(icsDataUri(event))
            }}
          >
            <Text className="text-body font-medium">{uk.appleOutlookIcs}</Text>
          </Button>
        </View>
      </Sheet>

      <Sheet open={declineOpen} onClose={() => setDeclineOpen(false)}>
        <View className="gap-2 pb-2">
          <Text className="text-title-sm text-foreground font-semibold">{uk.cannotComeTitle}</Text>
          <Text className="text-body-sm text-muted-foreground leading-5">{uk.cannotComeBody}</Text>

          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {uk.declineReasons.map((option) => {
              const active = reason === option
              return (
                <Pressable
                  key={option}
                  className={`min-h-[38px] justify-center rounded-lg border px-3 ${
                    active
                      ? 'bg-primary border-primary'
                      : 'border-border-strong active:bg-secondary'
                  }`}
                  onPress={() => setReason(active ? null : option)}
                  role="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    className={`text-body-sm font-medium ${
                      active ? 'text-primary-foreground' : 'text-foreground/85'
                    }`}
                  >
                    {option}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View className="mt-4 gap-2">
            <Button
              variant="cta"
              size="cta"
              disabled={busy}
              onPress={() => void answer('declined', reason)}
            >
              <Text>{uk.sendDecline}</Text>
            </Button>
            <Button
              variant="outline"
              size="cta"
              className="h-11 py-0"
              onPress={() => setDeclineOpen(false)}
            >
              <Text className="text-body-sm font-medium">{uk.backWord}</Text>
            </Button>
          </View>
        </View>
      </Sheet>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/**
 * «Організатор» — who to reach when something changes on the day.
 *
 * The first thing from `users` to reach an anonymous audience (owner,
 * 2026-08-31). `email` is never among it — see the gateway's `organizer`.
 */
function OrganizerCard({ organizer }: { organizer: LinkOrganizer }) {
  const handle = organizer.telegram ?? organizer.instagram
  const handleUrl = handle
    ? `${organizer.telegram ? 'https://t.me/' : 'https://instagram.com/'}${handle.replace(/^@/, '')}`
    : null

  return (
    <View className="gap-2">
      <SectionLabel label={uk.organizerSection} />
      <Card variant="flat">
        <View className="flex-row items-center gap-3">
          <Avatar name={organizer.name} size={40} />
          <View className="min-w-0 flex-1">
            <Text className="text-body text-foreground font-semibold" numberOfLines={1}>
              {organizer.name}
            </Text>
            <Text className="text-label text-muted-foreground mt-0.5" numberOfLines={1}>
              {organizer.role}
            </Text>
          </View>
        </View>
        {organizer.phone || handleUrl ? (
          <View className="mt-3 flex-row gap-2">
            {organizer.phone ? (
              <Button
                variant="secondary"
                className="h-10 flex-1"
                onPress={() => void openExternalUrl(`tel:${organizer.phone}`)}
              >
                <Text className="text-body-sm font-medium">{uk.callOrganizer}</Text>
              </Button>
            ) : null}
            {handleUrl ? (
              <Button
                variant="outline"
                className="h-10 flex-1"
                onPress={() => void openExternalUrl(handleUrl)}
              >
                <Text className="text-body-sm font-medium">{uk.writeTo}</Text>
              </Button>
            ) : null}
          </View>
        ) : null}
      </Card>
    </View>
  )
}
