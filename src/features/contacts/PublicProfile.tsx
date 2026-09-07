import { Image, Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import type { LucideIcon } from 'lucide-react-native'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Pencil from 'lucide-react-native/icons/pencil'
import Send from 'lucide-react-native/icons/send'
import Smartphone from 'lucide-react-native/icons/smartphone'
import Trash from 'lucide-react-native/icons/trash'
import { Card } from '../../components/ui/card'
import { Icon } from '../../components/ui/icon'
import { InstagramIcon } from '../../components/ui/instagram-icon'
import { Text } from '../../components/ui/text'
import { Avatar } from '../../components/Avatar'
import { SectionLabel } from '../../components/ShootFormFields'
import { VisibilityNote } from '../../components/Visibility'
import { useStrings } from '../../i18n/LanguageProvider'
import { roleWithEmoji } from '../../i18n/uk'
import { handleLabel, handleUrl } from '../../lib/socialHandle'
import type { AvatarTint } from '../auth/avatar'
import { tapped } from '../../lib/haptics'
import { openExternalUrl } from '../../lib/openExternalUrl'
import { Starfield } from '../../components/Starfield'

/**
 * «Публічний профіль» — `Public Profile.dc.html` (owner, 2026-09-04).
 *
 * One component, three readers, and the differences are not cosmetic:
 *
 * - **`self`** is the account holder previewing themselves, reached from the
 *   profile's «Переглянути публічний профіль». Read from `users`. No note,
 *   because there is nobody to have written one, and no management: you do not
 *   delete yourself from your own address book.
 * - **`contact`** is somebody in «Команда», reached from a crew row's «Профіль
 *   учасника» or from «Мої контакти». Read from `contacts`, and it carries the
 *   creator's own note about that person.
 * - **`client`** is somebody in «Клієнти», reached from «Мої контакти» only
 *   (2026-09-04). Read from `clients`, whose `notes` are `US-028`'s
 *   between-shoots notes and land in the same card.
 *
 * **It was read-only until 2026-09-04.** The artboard always put «Редагувати
 * контакт» and «Видалити контакт» here, pointing both at `Contacts.dc.html`;
 * that screen now exists, so the two controls arrive with it. They are
 * callbacks rather than routes — whether a given profile may be edited or
 * deleted is the route's decision, not this component's.
 *
 * ── Two things the artboard draws that this does not ────────────────────────
 *
 * **No «KULT Studio».** The role line is the role. There is no studio column
 * anywhere — the same gap as P-3 on the profile and L-4 on the link view.
 *
 * **No email row, for any reader.** Not an omission: the artboard says «Email
 * та налаштування акаунту приховані від інших» and this screen exists to be
 * what others see. `users.email` is the login credential and the crew-matching
 * key; it is shown on `/profile`, which is about the account, and nowhere else.
 *
 * **The `self` preview showed one until 2026-09-05.** The reasoning was that
 * the reader and the subject are the same person there, so a login discloses
 * nothing — true, and beside the point. The screen's own subline promises «Так
 * вас бачать інші учасники зйомок», and a preview that adds a field the
 * audience never gets is not a preview of anything. The note under the card is
 * the artboard's explanation for the row's ABSENCE, which is how it reads now
 * and could not while the row was above it. Owner's call, reversing the
 * 2026-09-04 decision in docs/redesign-log.md.
 */
export type PublicProfileView = {
  name: string
  role: string
  phone: string | null
  instagram: string | null
  telegram: string | null
  /** Signed already — `users.avatar_url` is a Storage path. */
  avatarUri: string | null
  /**
   * The account holder's chosen emoji — `self` only, and null everywhere else.
   *
   * A contact and a client have no such columns and never will: redesign-log
   * F-4 rules out putting a face on somebody who did not choose one, and an
   * emoji *you* pick for *someone else* is exactly the invention it objected
   * to. Only the person themselves can supply this.
   */
  avatarEmoji: { char: string; tint: AvatarTint } | null
  /**
   * The creator's private note about this person. `null` on `self`, and on a
   * contact who has none.
   */
  note: string | null
  /**
   * Whose profile this is, which decides the subline and the note.
   *
   * **`client` is the third reader, added 2026-09-04** with «Мої контакти»:
   * that screen is one list over `clients` and `contacts`, and both halves open
   * here because `client/[id]` is still `US-028`'s stub. A client is not a
   * shoot participant, so it cannot borrow the participant subline.
   */
  kind: 'self' | 'contact' | 'client'
  /** «Профіль» previewing yourself, «Команда» from a shoot, «Контакти» from the list. */
  /**
   * The back control's word, or **null for no back control at all**.
   *
   * Null since 2026-09-06, when the profile tab began rendering this as its own
   * default view: a tab root has nothing to pop, and the fallback below would
   * have replaced the route with itself — a control that looks like one and is
   * not.
   */
  backLabel: string | null
}

export function PublicProfile({
  view,
  onBack,
  onEdit,
  onDelete,
  aboveTabBar = false,
}: {
  view: PublicProfileView
  /**
   * What the back control does, when the caller owns the answer.
   *
   * The profile tab needs it: since 2026-09-07 the public view is a MODE of
   * that screen rather than its root, so "back" means "show the form again" and
   * `router.back()` would pop the reader out of the tab entirely. A pushed
   * screen passes nothing and keeps the router behaviour below.
   */
  onBack?: () => void
  /**
   * True when this renders inside `(tabs)`, where `BottomNav` sits below and
   * owns the bottom safe area.
   *
   * It has to be told rather than guessed. The same component is the profile
   * TAB and a PUSHED contact screen, and the bar is mounted once by the tabs
   * layout — a pushed screen covers it and owns the inset itself. So
   * `insets.bottom` belongs in exactly one of the two, and adding it in the
   * other floats the pinned row 34pt up the page.
   *
   * Defaults to false, which is the safe way round: a screen that forgets to
   * pass it gets a footer clear of the home indicator rather than one under it.
   */
  aboveTabBar?: boolean
  /**
   * «Редагувати контакт». Absent when there is nothing to edit — your own
   * profile, or a crew member with no contact row behind them.
   */
  onEdit?: () => void
  /**
   * «Видалити контакт». Absent for the same reasons, and for a client who has
   * shoots — the route owns that policy, because the reason is about `clients`
   * rather than about this screen. See `deleteClient`.
   */
  onDelete?: () => void
}) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  /*
    `url` since 2026-09-05 — the rows open the service rather than asking to be
    read and retyped, and `handleLabel` shows «@nickname» whatever form the
    field was filled in with. A profile URL pasted from Instagram's own «Copy
    link» is the case that motivated it.

    A phone dials. Everything goes through `src/lib/socialHandle.ts`, so this
    screen and the person sheet cannot disagree about where one handle leads.
  */
  type Row = {
    label: string
    value: string
    url: string | null
    /** The link colour. Handles only — a phone dials and keeps its own. */
    linkTone?: boolean
    icon: LucideIcon
  }
  const rows: (Row | null)[] = [
    view.phone
      ? {
          label: t.phoneField,
          value: view.phone,
          url: `tel:${view.phone.replace(/[^+\d]/g, '')}`,
          icon: Smartphone,
        }
      : null,
    // No email, for anybody — see this component's note. An email reaches this
    // screen as a crew-matching key, never as something to display.
    view.instagram
      ? {
          label: t.instagramLabel,
          value: handleLabel('instagram', view.instagram),
          url: handleUrl('instagram', view.instagram),
          linkTone: true,
          icon: InstagramIcon,
        }
      : null,
    view.telegram
      ? {
          label: t.telegramLabel,
          value: handleLabel('telegram', view.telegram),
          url: handleUrl('telegram', view.telegram),
          linkTone: true,
          icon: Send,
        }
      : null,
  ]
  const contacts = rows.filter((row): row is Row => row !== null)

  return (
    <View className="bg-background flex-1">
      <Starfield />
      {/*
        «‹ Профіль · Публічний профіль», with a subline naming what the reader is
        looking at. The right-hand spacer matches the back control's width so the
        title is centred on the screen rather than on what is left of it.
      */}
      <View
        className="bg-background border-border border-b"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center gap-1.5 px-2 pb-2 pt-1">
          {/* The spacer stays when the control does not, so the title is centred
              on the SCREEN either way rather than on what is left beside it. */}
          {view.backLabel === null ? (
            <View className="min-h-11 w-[88px] shrink-0" />
          ) : (
          <Pressable
            className="active:bg-secondary min-h-11 w-[88px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
            onPress={() => {
              tapped()
              // A caller-owned destination wins: see `onBack`.
              if (onBack) return onBack()
              if (router.canGoBack()) router.back()
              else router.replace('/(app)/(tabs)/profile')
            }}
            role="button"
            accessibilityLabel={view.backLabel}
          >
            <Icon as={ChevronLeft} size={16} strokeWidth={1.9} className="text-muted-foreground" />
            <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
              {view.backLabel}
            </Text>
          </Pressable>
          )}
          <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
            {t.publicProfileTitle}
          </Text>
          <View className="w-[88px] shrink-0" />
        </View>
        <Text className="text-caption text-muted-foreground px-4 pb-2.5 text-center">
          {view.kind === 'self'
            ? t.publicProfileSelfSubline
            : view.kind === 'client'
              ? t.publicProfileClientSubline
              : t.publicProfileOtherSubline}
        </Text>
      </View>

      {/*
        Room for the pinned actions when there are any — 96 clears the 48pt row
        and the footer's own padding. With no handlers there is no footer, and
        the original 32 is still right.
      */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: (aboveTabBar ? 0 : insets.bottom) + (onEdit || onDelete ? 96 : 32),
        }}
      >
        <View className="gap-5 p-4">
        {/* ── Identity ── */}
        <Card variant="flat" className="items-center px-4 pb-[18px] pt-[22px]">
          {view.avatarUri ? (
            <Image
              source={{ uri: view.avatarUri }}
              className="h-[72px] w-[72px] rounded-full"
              resizeMode="cover"
            />
          ) : (
            /* An emoji when the account holder chose one; initials for everyone
               who supplied nothing — F-4's rule, and a contact has no avatar
               column of any kind. */
            <Avatar name={view.name} size={72} emoji={view.avatarEmoji} />
          )}
          <Text className="text-title-sm text-foreground mt-3 font-semibold" numberOfLines={1}>
            {view.name}
          </Text>
          {/* The role alone: the artboard appends « · KULT Studio» and there is
              no studio column (P-3, L-4). **A client has none at all** — the
              line is dropped rather than filled with something invented. */}
          {view.role ? (
            <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
              {roleWithEmoji(view.role)}
            </Text>
          ) : null}
        </Card>

        {/*
          ── Контакти ──

          Dropped entirely when there is nothing in it. A contact can
          legitimately have no phone, no email and no handles since 2026-09-03,
          when the crew form's contact field became optional — and an empty card
          under a heading would need a sentence explaining itself that nobody
          has written.
        */}
        {contacts.length > 0 ? (
          <View className="gap-2">
            <SectionLabel label={t.contactsSection} />
            <Card variant="flat" className="gap-0 p-0">
              {contacts.map((row, index) => {
                const rowClass = `min-h-14 flex-row items-center gap-3 px-4 ${
                  index > 0 ? 'border-border border-t' : ''
                }`
                const body = (
                  <>
                    <View className="w-[18px] shrink-0 items-center">
                      <Icon
                        as={row.icon}
                        size={17}
                        strokeWidth={1.7}
                        className="text-muted-foreground"
                      />
                    </View>
                    <Text className="text-body-sm text-muted-foreground flex-1">{row.label}</Text>
                    {/* Handles are blue; a phone dials and is not — the same
                        rule `PersonSheet`'s `DetailRow` follows for the same
                        rows on the shoot screen. */}
                    <Text
                      className={`text-body ${row.linkTone ? 'text-link' : 'text-foreground'}`}
                      numberOfLines={1}
                    >
                      {row.value}
                    </Text>
                  </>
                )
                /* Inert when there is nowhere to go — free text in an Instagram
                   field gets no press state rather than a link that 404s. */
                return row.url ? (
                  <Pressable
                    key={row.label}
                    className={`${rowClass} active:bg-muted`}
                    onPress={() => {
                      tapped()
                      void openExternalUrl(row.url as string)
                    }}
                    role="link"
                    accessibilityLabel={`${row.label}: ${row.value}`}
                  >
                    {body}
                  </Pressable>
                ) : (
                  <View key={row.label} className={rowClass}>
                    {body}
                  </View>
                )
              })}
            </Card>
            {/*
              **`self` only**, and it explains why there is no email row above.

              The sentence is about the reader's own account — «Email та
              налаштування акаунту приховані від інших» — and it was rendering
              under every profile, so opening a crew member's card explained the
              privacy of an email that is not theirs and account settings they
              do not have. No copy exists for the other two readers, and none is
              invented: they simply do not get a note.

              It goes with the card when the card goes. Someone with no phone
              and no handles has nothing to show a crew member, so the preview
              is right to say nothing at all rather than explain an absence
              inside an absence.
            */}
            {view.kind === 'self' ? (
              <Text className="text-caption text-muted-foreground px-0.5 leading-4">
                {t.emailHiddenFromOthers}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Нотатки ── the creator's own, never this person's to see. */}
        {view.note ? (
          <View className="gap-2">
            <SectionLabel label={t.notesSection} />
            <Card variant="flat" className="gap-3">
              <Text className="text-body-sm text-foreground/90 leading-6">{view.note}</Text>
              {/*
                True by construction: `contacts` is `creator_id = auth.uid()` on
                every policy and is in no link payload (`ADR-013`, CLAUDE.md
                rule 2). Unlike the crew form's note, `US-023` cannot falsify
                this one — that story shares a shoot's crew notes, and this note
                belongs to an address book no story shares.
              */}
              <VisibilityNote label={t.crewNotesPrivate} />
            </Card>
          </View>
        ) : null}
        </View>
      </ScrollView>

      {/*
        ── Pinned to the bottom (owner, 2026-09-06) ────────────────────────────

        The row sat at the foot of the scroll, so on a profile with notes and
        three contact rows the edit button was below them. Pinned, it is where
        every other primary action in the app is — «+ Нова зйомка» on both tabs,
        «Редагувати зйомку» on the shoot.

        `aboveTabBar` decides the inset, and it has to be told rather than
        guessed: this component renders on the profile TAB, where the bar owns
        the safe area, and on a pushed contact screen, which covers the bar and
        owns it itself. `BottomNav` is mounted once by the tabs layout, so
        `insets.bottom` is right in exactly one of the two places.
      */}
      {/*
        ── «Редагувати контакт» · «Видалити контакт» ──

        Pinned to the bottom since 2026-09-06, and each present only when the
        route passed a handler. The artboard gates both on `showNotes` — i.e.
        "not my own profile"; ours gates them on there being a row to act on,
        which is the same rule plus the two cases the artboard has no state
        for: a crew member with no contact behind them, and a client with
        shoots (see `deleteClient`).

        The delete does NOT confirm here. It asks the route, which owns
        `useDestructiveConfirm` — a real iOS alert rather than the artboard's
        in-page dialog, the same machinery `US-019` and `US-022` use. R-1's
        answer, applied again.

        ── Drawn as the shoot's two actions are (owner, 2026-09-05) ──────────

        A filled pill taking the width that is left, and a 48pt circle holding
        a trash glyph and no words — the row `Shoot Detail v3.dc.html` gives
        «Редагувати зйомку», reused here so the two screens that offer the
        same pair of actions offer them in the same shape.

        **This is a deliberate departure from `Public Profile.dc.html`**,
        which draws two stacked outlined pills and keeps edit quiet. The owner
        chose the shoot screen's arrangement on 2026-09-05, which promotes
        editing to the primary action here as well. Logged in
        docs/redesign-log.md; the artboard is the older of the two drawings.

        Tokens are the shoot row's, and the same trap applies: the artboards'
        `--accent` is this app's `--primary` (see `Badge`'s note and the theme
        handoff), while `--danger-bg`/`--danger-border`/`--danger-soft` cross
        unchanged. The press state on the circle is `active:opacity-80`
        because no `--danger` fill token exists here.

        «Видалити контакт» moves to `accessibilityLabel`: the control has no
        text now, and this is the only place the words exist before the
        confirmation the route puts up.
      */}
      {onEdit || onDelete ? (
        <View
          className={`bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 ${
            aboveTabBar ? 'py-2.5' : 'pt-2.5'
          }`}
          style={aboveTabBar ? undefined : { paddingBottom: insets.bottom + 10 }}
        >
          <View className="flex-row items-center gap-2.5">
          {/*
            `onDelete` without `onEdit` cannot happen — the route sets `onEdit`
            whenever there is a subject and `onDelete` only when that subject
            is `deletable`. The pill is `flex-1`, so an edit-only profile still
            fills the row.
          */}
          {onEdit ? (
            <Pressable
              className="bg-primary active:bg-primary/90 h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full"
              onPress={() => {
                tapped()
                onEdit()
              }}
              role="button"
            >
              <Icon as={Pencil} size={16} strokeWidth={1.9} className="text-primary-foreground" />
              <Text className="text-body-sm text-primary-foreground font-semibold">
                {/* «Редагувати профіль» on your own, «Редагувати контакт» on
                    somebody else's — the same control, and the word that is
                    true of what it opens. */}
                {view.kind === 'self' ? t.editProfileAction : t.editContactTitle}
              </Text>
            </Pressable>
          ) : null}

          {onDelete ? (
            <Pressable
              className="border-danger-border bg-danger-bg h-12 w-12 shrink-0 items-center justify-center rounded-full border active:opacity-80"
              onPress={() => {
                tapped()
                onDelete()
              }}
              role="button"
              accessibilityLabel={t.deleteContactAction}
            >
              <Icon as={Trash} size={18} strokeWidth={1.9} className="text-danger-soft" />
            </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  )
}
