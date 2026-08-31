import { Pressable, View } from 'react-native'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import AtSign from 'lucide-react-native/icons/at-sign'
import Send from 'lucide-react-native/icons/send'
import { Icon } from './ui/icon'
import { Avatar } from './Avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Sheet } from './ui/sheet'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { tapped } from '../lib/haptics'
import { openExternalUrl } from '../lib/openExternalUrl'

/**
 * Whoever the sheet is open on — a crew member or the client, flattened to the
 * fields it actually draws.
 *
 * Deliberately NOT `CrewMember | Client`. The sheet shows the same six things
 * for both, and a union would push a `'crew' | 'client'` check into every line
 * of the layout. `removable` is the one behavioural difference and it is stated
 * as a field: a client cannot be removed from a shoot (they are the shoot), and
 * `US-022` is about crew.
 */
export type SheetPerson = {
  id: string
  name: string
  /** «Фотограф», or the client's «Клієнт · Бачить команду, без нотаток». */
  role: string
  phone: string | null
  instagram: string | null
  telegram: string | null
  /** The response badge, already worded and toned by the caller. */
  badge: { label: string; variant: 'solid' | 'outline' } | null
  removable: boolean
}

/**
 * A person's full record, as a bottom sheet (the handoff's "Person sheet").
 *
 * **This is new on the creator's screen.** The previous pass recorded that
 * opening a person for their details "is what `US-023` gives the crew and
 * `US-026` the client, but which no story asks for on the creator's own
 * screen — they wrote the record". The handoff asks for it: the crew row's two
 * icon buttons are gone and the row itself is the affordance, so the sheet is
 * now the only place a phone number or a handle can be reached.
 *
 * The note is still not shown here, and that is unchanged: it is the field
 * `ADR-013` exists to keep away from clients, and the fewer surfaces render it
 * the better. The handoff draws no note either.
 */
export function PersonSheet({
  person,
  onClose,
  onCopyLink,
  onRemove,
}: {
  person: SheetPerson | null
  onClose: () => void
  onCopyLink: (person: SheetPerson) => void
  onRemove: (person: SheetPerson) => void
}) {
  const t = useStrings()
  const messageTarget = person ? messageLink(person) : null

  return (
    <Sheet open={person !== null} onClose={onClose}>
      {person ? (
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <Avatar name={person.name} size={48} />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-title-sm text-foreground font-semibold" numberOfLines={1}>
                {person.name}
              </Text>
              <Text className="text-body-sm text-muted-foreground" numberOfLines={1}>
                {person.role}
              </Text>
            </View>
            {person.badge ? (
              <Badge variant={person.badge.variant} label={person.badge.label} />
            ) : null}
          </View>

          {/*
            The bordered list. Only the rows that have a value: the handoff draws
            both, and `crew_members` requires a phone OR an email (US-005 AC-2)
            while `instagram` is optional throughout — an «Інстаграм» row reading
            nothing would be a field that failed to load rather than one nobody
            filled in.
          */}
          {person.phone || person.instagram || person.telegram ? (
            <View className="border-border overflow-hidden rounded-xl border">
              {person.phone ? (
                <DetailRow
                  label={t.phone}
                  value={person.phone}
                  url={`tel:${person.phone}`}
                />
              ) : null}
              {person.instagram ? (
                <DetailRow
                  label={t.instagramLabel}
                  value={person.instagram}
                  url={handleUrl('instagram', person.instagram)}
                  divided={!!person.phone}
                />
              ) : null}
              {/* Telegram, collected on the add-crew form since 2026-08-31.
                  Read here because this is the only surface that shows a crew
                  member's contacts — a field nothing displays is a field nobody
                  would fill in. */}
              {person.telegram ? (
                <DetailRow
                  label={t.telegramLabel}
                  value={person.telegram}
                  url={handleUrl('telegram', person.telegram)}
                  divided={!!(person.phone || person.instagram)}
                />
              ) : null}
            </View>
          ) : null}

          <View className="gap-2">
            <View className="flex-row gap-2">
              {/*
                **The primary action follows what the person actually gave you**
                (owner, 2026-08-31): a handle means «Написати», and
                «Зателефонувати» is what is left when a phone number is all there
                is. Calling someone you only have an @handle for was never
                possible — the button was simply disabled, which said nothing
                about why.

                Telegram wins over Instagram when both are present: it is the
                one of the two that exists to be messaged.
              */}
              <Button
                className="h-[46px] flex-1"
                disabled={!messageTarget && !person.phone}
                onPress={() => {
                  if (messageTarget) return void openExternalUrl(messageTarget.url)
                  if (person.phone) void openExternalUrl(`tel:${person.phone}`)
                }}
              >
                {messageTarget ? (
                  <Icon
                    as={messageTarget.kind === 'telegram' ? Send : AtSign}
                    size={15}
                    strokeWidth={2}
                  />
                ) : null}
                <Text className="text-body-sm font-semibold">
                  {messageTarget ? t.writeTo : t.callPerson}
                </Text>
              </Button>
              <Button
                variant="outline"
                className="h-[46px] flex-1"
                onPress={() => onCopyLink(person)}
              >
                <Text className="text-body-sm font-semibold">{t.copyPersonLink}</Text>
              </Button>
            </View>

            {/*
              `US-022`'s remove, as the handoff's destructive-outline button.

              **No confirmation dialog here, unlike everywhere else in this app.**
              That is the handoff's design and it is a real change from
              `DestructiveAction`: the guarantee against an accidental tap is the
              4-second undo on the toast instead of a question before the fact.
              The undo is what makes it acceptable — see the deferred removal in
              the detail screen, which does not touch the database until the
              toast has gone.
            */}
            {person.removable ? (
              <Button
                variant="outline"
                className="border-destructive/60 h-[46px] active:bg-destructive/15"
                onPress={() => onRemove(person)}
              >
                <Text className="text-body-sm text-destructive font-semibold">
                  {t.removeFromCrew}
                </Text>
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}
    </Sheet>
  )
}

/**
 * Where «Написати» leads, or null when there is no handle to write to.
 *
 * Telegram before Instagram: both can be messaged, but Telegram is the one whose
 * purpose that is — an Instagram profile link is a page you then have to find
 * the DM button on.
 *
 * The handle is stored as the reader typed it («@nickname», per the field's own
 * placeholder), so the `@` is stripped for the URL and any accidental full URL
 * is passed through untouched rather than being nested inside another one.
 */
function messageLink(
  person: SheetPerson
): { kind: 'telegram' | 'instagram'; url: string } | null {
  const telegram = handleUrl('telegram', person.telegram)
  if (telegram) return { kind: 'telegram', url: telegram }
  const instagram = handleUrl('instagram', person.instagram)
  if (instagram) return { kind: 'instagram', url: instagram }
  return null
}

/**
 * The profile URL for a stored handle, or null when there is nothing to open.
 *
 * Handles are stored as the reader typed them («@nickname», per every field's
 * placeholder), so the `@` is stripped — and a handle someone pasted as a full
 * URL is passed through rather than nested inside another one.
 *
 * Shared by «Написати» and by the rows above it, so the button and the row for
 * the same handle cannot lead to different places.
 */
function handleUrl(kind: 'telegram' | 'instagram', raw: string | null): string | null {
  const handle = raw?.trim().replace(/^@/, '')
  if (!handle) return null
  if (/^https?:\/\//i.test(handle)) return handle
  return (kind === 'telegram' ? 'https://t.me/' : 'https://instagram.com/') + handle
}

/**
 * One contact row — and, where there is somewhere to go, a link to it.
 *
 * Tapping the row does what the «Написати» button does for the same handle, via
 * the same `handleUrl`: a phone dials, a handle opens its app. The row was inert
 * before, which made the value look copyable and behave like nothing at all.
 *
 * `url` is null when there is nothing to open, and the row is then a plain View
 * with no press feedback — an affordance that leads nowhere is worse than none.
 */
function DetailRow({
  label,
  value,
  url,
  divided = false,
}: {
  label: string
  value: string
  url?: string | null
  divided?: boolean
}) {
  const body = (
    <>
      <Text className="text-body-sm text-muted-foreground">{label}</Text>
      <Text className="text-body-sm text-foreground font-medium" numberOfLines={1}>
        {value}
      </Text>
    </>
  )

  const className = `flex-row items-center justify-between px-3.5 py-3 ${
    divided ? 'border-border border-t' : ''
  }`

  if (!url) return <View className={className}>{body}</View>

  return (
    <Pressable
      className={`${className} active:bg-secondary`}
      onPress={() => {
        tapped()
        void openExternalUrl(url)
      }}
      role="link"
      accessibilityLabel={`${label}: ${value}`}
    >
      {body}
    </Pressable>
  )
}
