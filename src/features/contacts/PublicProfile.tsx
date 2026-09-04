import { Image, Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import type { LucideIcon } from 'lucide-react-native'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Mail from 'lucide-react-native/icons/mail'
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

/**
 * «Публічний профіль» — `Public Profile.dc.html` (owner, 2026-09-04).
 *
 * One component, two readers, and the difference is not cosmetic:
 *
 * - **`self`** is the account holder previewing themselves, reached from the
 *   profile's «Переглянути публічний профіль». Read from `users`. No note,
 *   because there is nobody to have written one.
 * - **`contact`** is somebody in «Мої контакти», reached from a crew row's
 *   «Профіль учасника». Read from `contacts`, and it carries the creator's own
 *   note about that person.
 *
 * **Read-only** (owner, 2026-09-03). The artboard puts «Редагувати контакт» and
 * «Видалити контакт» here and points both at `Contacts.dc.html`; that screen is
 * not built, and managing a contact belongs with the list rather than with one
 * profile. Deferred to its own pass.
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
  /** Whose profile this is, which decides the subline and the note. */
  kind: 'self' | 'contact'
  /** «Профіль» when previewing yourself, «Команда» when arriving from a shoot. */
  backLabel: string
}

export function PublicProfile({ view }: { view: PublicProfileView }) {
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
              else router.replace('/(app)/profile')
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
          {view.kind === 'self' ? t.publicProfileSelfSubline : t.publicProfileOtherSubline}
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
              no studio column (P-3, L-4). */}
          <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
            {view.role}
          </Text>
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
        </View>
      </ScrollView>
    </View>
  )
}
