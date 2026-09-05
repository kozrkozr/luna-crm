import { Image, Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import type { LucideIcon } from 'lucide-react-native'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Mail from 'lucide-react-native/icons/mail'
import Pencil from 'lucide-react-native/icons/pencil'
import Send from 'lucide-react-native/icons/send'
import Smartphone from 'lucide-react-native/icons/smartphone'
import { Card } from '../../components/ui/card'
import { Icon } from '../../components/ui/icon'
import { InstagramIcon } from '../../components/ui/instagram-icon'
import { Text } from '../../components/ui/text'
import { Avatar } from '../../components/Avatar'
import { SectionLabel } from '../../components/ShootFormFields'
import { VisibilityNote } from '../../components/Visibility'
import { useStrings } from '../../i18n/LanguageProvider'
import { tapped } from '../../lib/haptics'
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
 * **No email row.** Not an omission: the artboard says «Email та налаштування
 * акаунту приховані від інших» and this screen exists to be what others see.
 * `users.email` is the login credential and the crew-matching key; it is shown
 * on the account holder's own profile and nowhere else.
 */
export type PublicProfileView = {
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
  /** Signed already — `users.avatar_url` is a Storage path. */
  avatarUri: string | null
  /**
   * The creator's private note about this person. `null` on `self`, and on a
   * contact who has none.
   */
  note: string | null
  /**
   * Whose profile this is, which decides the subline, the note and the email.
   *
   * **`client` is the third reader, added 2026-09-04** with «Мої контакти»:
   * that screen is one list over `clients` and `contacts`, and both halves open
   * here because `client/[id]` is still `US-028`'s stub. A client is not a
   * shoot participant, so it cannot borrow the participant subline.
   */
  kind: 'self' | 'contact' | 'client'
  /** «Профіль» previewing yourself, «Команда» from a shoot, «Контакти» from the list. */
  backLabel: string
}

export function PublicProfile({
  view,
  onEdit,
  onDelete,
}: {
  view: PublicProfileView
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

  const contacts: { label: string; value: string; icon: LucideIcon }[] = [
    view.phone ? { label: t.phoneField, value: view.phone, icon: Smartphone } : null,
    // Only ever on `self`. A contact's email is a match key, not a display
    // field, and the note under this card says the account's is hidden.
    view.kind === 'self' && view.email
      ? { label: t.email, value: view.email, icon: Mail }
      : null,
    view.instagram
      ? { label: t.instagramLabel, value: view.instagram, icon: InstagramIcon }
      : null,
    view.telegram ? { label: t.telegramLabel, value: view.telegram, icon: Send } : null,
  ].filter((row): row is { label: string; value: string; icon: LucideIcon } => row !== null)

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
          <Pressable
            className="active:bg-secondary min-h-11 w-[88px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
            onPress={() => {
              tapped()
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

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
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
            /* Initials for anyone who has uploaded nothing — F-4's rule, and a
               contact has no avatar column at all. */
            <Avatar name={view.name} size={72} />
          )}
          <Text className="text-title-sm text-foreground mt-3 font-semibold" numberOfLines={1}>
            {view.name}
          </Text>
          {/* The role alone: the artboard appends « · KULT Studio» and there is
              no studio column (P-3, L-4). **A client has none at all** — the
              line is dropped rather than filled with something invented. */}
          {view.role ? (
            <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
              {view.role}
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
              {contacts.map((row, index) => (
                <View
                  key={row.label}
                  className={`min-h-14 flex-row items-center gap-3 px-4 ${
                    index > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <View className="w-[18px] shrink-0 items-center">
                    <Icon
                      as={row.icon}
                      size={17}
                      strokeWidth={1.7}
                      className="text-muted-foreground"
                    />
                  </View>
                  <Text className="text-body-sm text-muted-foreground flex-1">{row.label}</Text>
                  <Text className="text-body text-foreground" numberOfLines={1}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </Card>
            <Text className="text-caption text-muted-foreground px-0.5 leading-4">
              {t.emailHiddenFromOthers}
            </Text>
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

        {/*
          ── «Редагувати контакт» · «Видалити контакт» ──

          At the foot of the scroll, as drawn, and each present only when the
          route passed a handler. The artboard gates both on `showNotes` — i.e.
          "not my own profile"; ours gates them on there being a row to act on,
          which is the same rule plus the two cases the artboard has no state
          for: a crew member with no contact behind them, and a client with
          shoots (see `deleteClient`).

          The delete does NOT confirm here. It asks the route, which owns
          `useDestructiveConfirm` — a real iOS alert rather than the artboard's
          in-page dialog, the same machinery `US-019` and `US-022` use. R-1's
          answer, applied again.
        */}
        {onEdit ? (
          <Pressable
            className="border-border active:bg-secondary min-h-12 flex-row items-center justify-center gap-2 rounded-lg border"
            onPress={() => {
              tapped()
              onEdit()
            }}
            role="button"
          >
            <Icon as={Pencil} size={15} strokeWidth={1.8} className="text-muted-foreground" />
            <Text className="text-body-sm text-muted-foreground font-medium">
              {t.editContactTitle}
            </Text>
          </Pressable>
        ) : null}

        {onDelete ? (
          <Pressable
            className="border-destructive/40 active:bg-destructive/10 min-h-12 items-center justify-center rounded-lg border"
            onPress={() => {
              tapped()
              onDelete()
            }}
            role="button"
          >
            <Text className="text-body-sm text-destructive font-medium">
              {t.deleteContactAction}
            </Text>
          </Pressable>
        ) : null}
        </View>
      </ScrollView>
    </View>
  )
}
