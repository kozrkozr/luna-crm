import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, View, Linking } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import * as ImagePicker from 'expo-image-picker'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import type { LucideIcon } from 'lucide-react-native'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Eye from 'lucide-react-native/icons/eye'
import Lock from 'lucide-react-native/icons/lock'
import Mail from 'lucide-react-native/icons/mail'
import Pencil from 'lucide-react-native/icons/pencil'
import Send from 'lucide-react-native/icons/send'
import Smartphone from 'lucide-react-native/icons/smartphone'
import User from 'lucide-react-native/icons/user'
import { Button } from '../../../src/components/ui/button'
import { FormScrollView } from '../../../src/components/ui/form-scroll-view'
import { Card } from '../../../src/components/ui/card'
import { Icon } from '../../../src/components/ui/icon'
import { InstagramIcon } from '../../../src/components/ui/instagram-icon'
import { Input } from '../../../src/components/ui/input'
import { Sheet } from '../../../src/components/ui/sheet'
import { Text } from '../../../src/components/ui/text'
import { Avatar } from '../../../src/components/Avatar'
import { bottomNavHeight } from '../../../src/components/BottomNav'
import { LanguageSwitcher } from '../../../src/components/LanguageSwitcher'
import { SectionLabel } from '../../../src/components/ShootFormFields'
import { Toast } from '../../../src/components/Toast'
import { useDestructiveConfirm } from '../../../src/components/DestructiveAction'
import {
  OTHER_ROLE,
  ROLE_KEYS,
  roleKeyOf,
  roleLabel,
  roleWithEmoji,
} from '../../../src/i18n/vocabulary'
import { useLanguage, useStrings } from '../../../src/i18n/LanguageProvider'
import { phoneExample } from '../../../src/i18n/device'
import { useCurrency } from '../../../src/features/account/currency'
import { currencySymbol } from '../../../src/features/shoots/money'
import { formatDayMonth, toIsoDate } from '../../../src/features/shoots/date'
import { failed, selected as tickSelection, succeeded, tapped } from '../../../src/lib/haptics'
import { useProfile } from '../../../src/features/auth/useProfile'
import { isAvatarTint, resolveAvatar, type AvatarTint } from '../../../src/features/auth/avatar'
import { PublicProfile } from '../../../src/features/contacts/PublicProfile'
import { EmojiAvatarPicker } from '../../../src/features/auth/EmojiAvatarPicker'
import { useAvatarSheet } from '../../../src/features/auth/useAvatarSheet'
import {
  deleteOwnAccount,
  signOut,
  signedAvatarUrl,
  updateProfile,
  uploadAvatar,
} from '../../../src/features/auth/profile'
import { Starfield } from '../../../src/components/Starfield'
import { useAccess } from '../../../src/features/subscription/access'
import { openManageSubscriptions } from '../../../src/features/subscription/purchases'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../../../src/components/ui/alert-dialog'
import { SUPPORT_EMAIL } from '../../../src/lib/support'

/** The editable half of the profile — everything the save button writes. */
type Draft = {
  name: string
  phone: string
  role: string
  customRole: string
  instagram: string
  telegram: string
  /*
    The three avatar columns travel together through the draft for the same
    reason they travel together into `updateProfile`: the states are exclusive
    (`users_avatar_one_of`), so «фото» and «емоджі» are one decision with three
    outcomes, not three independent fields.
  */
  avatarUrl: string | null
  avatarEmoji: string | null
  avatarTint: AvatarTint | null
}

/**
 * `US-016` — the account's own profile, rebuilt against `Edit Profile.dc.html`
 * (owner, 2026-08-31), then against its **second pass** (owner, 2026-09-02).
 *
 * **It was read-only.** `US-016` is viewing a profile and this screen showed
 * five fields, a language switcher and a logout button. The design makes it an
 * editing surface; `US-016` needs amending, and so do `US-001` (roles are no
 * longer a fixed set) and `US-015` (see the «Мова застосунку» row below).
 *
 * ── The second pass, in short ───────────────────────────────────────────────
 *
 * - **Save moved into the header** (P-5). The artboard renders no save button
 *   at all — its `onSave` is computed and consumed by nothing — and its scroll
 *   padding shrank from 104px to 40px, which is the sticky bar's space being
 *   deliberately reclaimed. A screen that cannot save is not a design, so the
 *   button went to the one slot the header leaves empty.
 * - **The stats row is gone** (P-8), and `profileStats()` with it.
 * - **Four sections were added that nothing backs**: «Підписка», «Сповіщення»,
 *   «Написати в підтримку» and a button to a public profile screen that does
 *   not exist. All four are **UI-only stubs** (owner, 2026-09-02) — each is
 *   marked below, and none of them writes anything or navigates anywhere.
 *
 * ── Departures that still stand ─────────────────────────────────────────────
 *
 * - **Email is read-only** (P-1, reaffirmed as P-6). It is the login
 *   credential: changing it means `auth.updateUser`, `double_confirm_changes`
 *   mails both addresses, and `public.users.email` is the crew-matching key.
 *   The second pass makes the field editable with a re-confirmation notice;
 *   that is a story with a migration, not a restyle.
 * - **«KULT Studio» is still not in the subtitle** (P-3) — there is no studio
 *   column — and the role chips are still `ROLE_KEYS`' five rather than the
 *   artboard's nine, which are stored values the glossary confirms.
 */
export default function ProfileScreen() {
  const t = useStrings()
  // `US-053` — the profile row's status, and AC-6's warning before deleting.
  const { subscription } = useAccess()
  const [deleteSubOpen, setDeleteSubOpen] = useState(false)
  const language = useLanguage()
  const currency = useCurrency()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const state = useProfile()

  const [saved, setSaved] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; phone?: string; role?: string }>({})
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  /*
    ── The tab opens as the FORM again (owner, 2026-09-07) ───────────────────

    It opened as the form until 2026-09-06, then as `PublicProfile` for a day —
    the reasoning being that the common visit is a look, not an edit. The owner
    has reversed it: **edit mode is the default.**

    That was the risk this file's own log entry named on the day: the form holds
    «Підписка», «Акаунт», the language switcher, «Сповіщення», «Вийти» and
    «Видалити акаунт», and one day of use put all of it behind a button labelled
    «Редагувати профіль». Settings that cannot be found are the worse of the two
    complaints.

    **Both views survive; only the default moved.** The public view is still a
    mode of this tab rather than a route of its own — `Edit Profile.dc.html`
    reaches it through «Переглянути публічний профіль» in the identity card, and
    its back control returns here. Keeping it modal is what keeps
    `app/(app)/public-profile.tsx` deleted: a second URL onto the same view is
    the shape of the crew-page bug found on 2026-09-06.
  */
  const [editing, setEditing] = useState(true)
  const [toast, setToast] = useState<string | null>(null)


  // Seeded once the profile arrives. Not on every render: the reader may
  // already be typing by the time a refetch lands.
  useEffect(() => {
    if (state.status !== 'loaded' || saved) return
    // `US-044` — a key, or a label from a row written before keys.
    const known = roleKeyOf(state.profile.role)
    const loaded: Draft = {
      name: state.profile.name,
      phone: state.profile.phone ?? '',
      // A role saved through «Інша роль» is not one of the chips, so the chip
      // set opens on «Інша роль» with the stored text beside it.
      role: known ?? OTHER_ROLE,
      customRole: known ? '' : state.profile.role,
      instagram: state.profile.socialHandle ?? '',
      telegram: state.profile.telegram ?? '',
      avatarUrl: state.profile.avatarUrl,
      avatarEmoji: state.profile.avatarEmoji,
      avatarTint: isAvatarTint(state.profile.avatarTint) ? state.profile.avatarTint : null,
    }
    setSaved(loaded)
    setDraft(loaded)
  }, [state, saved])

  // Re-signed whenever the stored path changes, including right after an upload.
  useEffect(() => {
    if (!draft?.avatarUrl) return setAvatarUri(null)
    let active = true
    void (async () => {
      const signed = await signedAvatarUrl(draft.avatarUrl as string)
      if (active) setAvatarUri(signed)
    })()
    return () => {
      active = false
    }
  }, [draft?.avatarUrl])

  /*
    The one irreversible action in the product: `auth.users` cascades to every
    shoot, client, crew member and access link. `useDestructiveConfirm` rather
    than `DestructiveAction`, because the second pass moves delete into the
    «Налаштування» card as a row — the hook exists for exactly this, so the
    Alert-on-native / dialog-on-web split is not written twice.
  */
  const { ask: askDelete, dialog: deleteDialog } = useDestructiveConfirm<null>({
    label: t.deleteAccount,
    question: t.confirmDeleteAccount,
    onConfirm: () => {
      void (async () => {
        if (await deleteOwnAccount()) router.replace('/(auth)/login')
        else setToast(t.somethingWentWrong)
      })()
    },
  })

  /*
    ── The avatar: a photo, an emoji, or neither ──────────────────────────────

    **All of this sits above the loading and error returns**, because
    `useAvatarSheet` and `useState` are hooks and the early returns below would
    otherwise skip them on the first render — the same "Rendered more hooks than
    during the previous render" crash the shoot screen's own note records. The
    two plain functions come with them so the hook's callbacks can close over
    something already defined.
  */
  const [emojiOpen, setEmojiOpen] = useState(false)

  /** The one writer for all three columns, so a partial state cannot be built. */
  const setAvatar = (next: Pick<Draft, 'avatarUrl' | 'avatarEmoji' | 'avatarTint'>) =>
    setDraft((current) => (current ? { ...current, ...next } : current))

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (picked.canceled) return

    setBusy(true)
    const path = await uploadAvatar(picked.assets[0])
    setBusy(false)
    if (!path) return setToast(t.attachmentTypeUnsupported)
    // Clears the emoji pair with it: the constraint allows a photo OR an emoji,
    // and the artboard's sheet offers them as one choice with three outcomes
    // rather than as two independent settings.
    setAvatar({ avatarUrl: path, avatarEmoji: null, avatarTint: null })
  }

  const { open: openAvatarSheet, sheet: avatarSheet } = useAvatarSheet({
    onPickPhoto: () => void pickPhoto(),
    onPickEmoji: () => setEmojiOpen(true),
    /*
      «Прибрати фото» clears all three, which is the third legal state and the
      one that renders initials again. Not saved here — it is a draft edit like
      the rest of the screen, so «Скасувати» puts the photo back.

      The Storage object is left where it is. There is no DELETE grant anywhere
      in v1 (`20260831120000_profile_editing.sql`: "No UPDATE and no DELETE
      policy … the old one is unreachable and stays"), and nothing specifies
      cleanup. Raised with the owner rather than decided here.
    */
    onRemove: () => setAvatar({ avatarUrl: null, avatarEmoji: null, avatarTint: null }),
  })

  if (state.status === 'loading' || !draft || !saved) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
        <Starfield />
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current))

  /* Which fields differ, by their labels — the design names them in both the
     counter and the discard sheet, rather than just counting. */
  const changed: string[] = [
    draft.name.trim() !== saved.name && t.name,
    draft.phone.trim() !== saved.phone && t.phone,
    (draft.role !== saved.role || draft.customRole.trim() !== saved.customRole) && t.role,
    draft.instagram.trim() !== saved.instagram && t.instagramLabel,
    draft.telegram.trim() !== saved.telegram && t.telegramLabel,
    (draft.avatarUrl !== saved.avatarUrl ||
      draft.avatarEmoji !== saved.avatarEmoji ||
      draft.avatarTint !== saved.avatarTint) &&
      t.changePhoto,
  ].filter((label): label is string => typeof label === 'string')
  const dirty = changed.length > 0

  const resolvedRole = draft.role === OTHER_ROLE ? draft.customRole.trim() : draft.role

  /*
    «Українська · 19 вересня» — the design's sample line under «Мова
    застосунку», showing what the choice actually changes.

    Today's date through the app's own formatter, rather than the artboard's
    fixed «19 вересня, 09:00»: a sample that is not the real format teaches the
    wrong thing. The time is dropped because the app writes times as 24-hour in
    both languages, so «09:00» would sit in the sample unchanged and imply a
    difference that is not there.
  */
  const languageSample = `${language === 'uk' ? 'Українська' : 'English'} · ${formatDayMonth(
    toIsoDate(new Date()),
    t.monthsGenitive
  )}`

  const version = Constants.expoConfig?.version

  /*
    What the draft currently means. Read from the DRAFT rather than from
    `state.profile`, so the card shows the emoji the moment it is picked and
    «Змінити фото» appears in the changed list — the avatar is an unsaved edit
    like every other field on this screen, and «Скасувати» discards it with the
    rest.
  */
  const avatar = resolveAvatar(draft)

  const save = async () => {
    const next: typeof errors = {}
    if (!draft.name.trim()) next.name = t.nameRequired
    // Optional, but a number that is present should look like one — the same
    // 9-digit floor `normalise_phone` uses.
    if (draft.phone.trim() && draft.phone.replace(/\D/g, '').length < 9) {
      next.phone = t.phoneFormatInvalid
    }
    if (!resolvedRole) next.role = t.otherRoleRequired

    setErrors(next)
    if (Object.keys(next).length > 0) {
      failed()
      setToast(t.checkHighlightedFields)
      return
    }

    setBusy(true)
    const ok = await updateProfile({
      name: draft.name,
      phone: draft.phone,
      role: resolvedRole,
      socialHandle: draft.instagram,
      telegram: draft.telegram,
      avatarUrl: draft.avatarUrl,
      avatarEmoji: draft.avatarEmoji,
      avatarTint: draft.avatarTint,
    })
    setBusy(false)

    if (!ok) return setToast(t.somethingWentWrong)
    succeeded()
    setSaved(draft)
    /*
      Stays on the form, with the toast as the whole of the feedback — which is
      what `Edit Profile.dc.html` does. It used to drop to the public view,
      because that view was the tab and saving was a visit to the form; now the
      form is the tab and saving is not a reason to leave it.
    */
    setToast(t.profileSaved)
  }

  /*
    «Скасувати» — and since 2026-09-07 it is **drawn only while there is
    something to cancel**, which is `Edit Profile.dc.html`'s own
    `sc-if isDirty`.

    The three arrangements this control has had, because the reasoning only
    makes sense as a sequence: on 2026-09-04 it left for the Головна tab (the
    form was the tab root); on 2026-09-06 it stopped editing and dropped to the
    public view (the form had become a mode). The form is the root again, so
    "stop editing" has no destination and "leave the profile section entirely"
    is a strange thing for a form's cancel to do — the tab bar is right there.

    What is left is the half that was always real work: with unsaved changes it
    opens the «Скасувати зміни?» sheet. With none, there is nothing to draw, so
    the artboard's condition is now the control's condition.
  */
  const leave = () => {
    if (dirty) return setConfirmDiscard(true)
  }

  /*
    The public view, and the tab's default.

    Built from `draft` rather than `saved`, so opening the form, typing, and
    cancelling out shows the reader what they actually have — `leave` restores
    `saved` into `draft` on the way out, and `save` writes it, so the two agree
    at every point where this is on screen.

    `backLabel: null` — a tab root has nothing to pop. `note: null` because a
    note is what somebody else wrote about a person, and `email` is absent for
    the reason it always was: this is what OTHERS see, and they never receive it.
  */
  if (!editing) {
    const resolved = resolveAvatar(draft)
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <PublicProfile
          view={{
            name: draft.name,
            role: resolvedRole,
            phone: draft.phone,
            instagram: draft.instagram,
            telegram: draft.telegram,
            avatarUri,
            avatarEmoji:
              resolved.kind === 'emoji' ? { char: resolved.emoji, tint: resolved.tint } : null,
            note: null,
            kind: 'self',
            /*
              A back control again, and it goes to the FORM — the public view is
              no longer the tab root, so there is something behind it. `onBack`
              rather than the component's own `router.back()`: this is a mode of
              this screen, and popping the router would leave the tab.
            */
            backLabel: t.myProfileTitle,
          }}
          onBack={() => setEditing(true)}
          onEdit={() => setEditing(true)}
          /* This is a tab: `BottomNav` sits below and owns the bottom safe
             area, so the pinned row must not add it a second time. The contact
             screen is pushed, covers the bar, and passes nothing. */
          aboveTabBar
        />
      </>
    )
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      {/*
        «Скасувати · Мій профіль · Зберегти». Both sides are the same fixed
        width so the title is centred on the SCREEN rather than on whatever is
        left between two labels of different lengths.
      */}
      <View
        className="bg-background border-border flex-row items-center border-b px-3 pb-2"
        style={{ paddingTop: insets.top }}
      >
        {/* `sc-if isDirty` — the spacer stays when the control does not, so the
            title is centred on the SCREEN either way. See `leave`. */}
        {dirty ? (
          <Pressable
            className="active:bg-secondary min-h-11 w-[92px] shrink-0 justify-center rounded-lg px-2"
            onPress={() => {
              tapped()
              leave()
            }}
            role="button"
          >
            <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
              {t.cancel}
            </Text>
          </Pressable>
        ) : (
          <View className="min-h-11 w-[92px] shrink-0" />
        )}

        <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
          {t.myProfileTitle}
        </Text>

        {/*
          P-5 — save lives here now. It keeps the design's own three labels
          («Зберегти» / «Зберігаємо…»), dimmed rather than relabelled when
          there is nothing to save: «Немає змін» reads as a button in a bar, not
          as a word in a header.
        */}
        <Pressable
          className="active:bg-secondary min-h-11 w-[92px] shrink-0 items-end justify-center rounded-lg px-2"
          disabled={!dirty || busy}
          onPress={() => void save()}
          role="button"
          accessibilityState={{ disabled: !dirty || busy }}
        >
          <Text
            className={`text-body-sm font-semibold ${
              dirty && !busy ? 'text-foreground' : 'text-muted-foreground/50'
            }`}
            numberOfLines={1}
          >
            {busy ? t.savingProfile : t.save}
          </Text>
        </Pressable>
      </View>

      {/*
        40, and **no bottom inset** (2026-09-04): the artboard's `padding-bottom:114`
        less the 75px bar the navigator reserves, and the bar owns the safe area
        now — `insets.bottom` here would add 34pt of dead space above it.
      */}
      <FormScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="gap-5 p-4">
          {/* ── Identity ── */}
          <Card variant="flat" className="items-center px-4 pb-4 pt-5">
            <Pressable
              className="mb-3 active:opacity-70"
              disabled={busy}
              onPress={openAvatarSheet}
              role="button"
              accessibilityLabel={t.changePhoto}
            >
              {/*
                A photo the account holder uploaded of themselves — which is why
                this does not contradict redesign-log F-4. That objection was to
                GENERATING a likeness by hashing a name; crew and clients still
                get initials, because nobody uploaded anything for them.
              */}
              {/*
                The three states of `users_avatar_one_of`, resolved once by
                `resolveAvatar` so this screen cannot invent a fourth. `emoji`
                needs no signed URL and so has no loading state — it renders on
                the frame the draft changes, which is why applying one feels
                immediate where a photo does not.
              */}
              {avatar.kind === 'photo' && avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="h-[72px] w-[72px] rounded-full"
                  resizeMode="cover"
                />
              ) : avatar.kind === 'emoji' ? (
                <Avatar
                  name={draft.name || state.profile.email}
                  size={72}
                  emoji={{ char: avatar.emoji, tint: avatar.tint }}
                />
              ) : (
                <Avatar name={draft.name || state.profile.email} size={72} />
              )}
              <View className="bg-primary border-background absolute -bottom-0.5 -right-0.5 h-[26px] w-[26px] items-center justify-center rounded-full border-2">
                <Icon as={Pencil} size={12} strokeWidth={2} className="text-primary-foreground" />
              </View>
            </Pressable>

            <Text className="text-title-sm text-foreground font-semibold" numberOfLines={1}>
              {draft.name.trim() || state.profile.email}
            </Text>
            {/* Role alone — the design appends « · KULT Studio», and there is
                no studio column to append (P-3). */}
            <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
              {roleLabel(resolvedRole, t)}
            </Text>

            {/*
              «Переглянути публічний профіль», as `Edit Profile.dc.html` draws
              it — the way into the public view now that the form is the tab
              root again (owner, 2026-09-07).

              It **switches mode rather than pushing a route**, which is the one
              difference from the pill this replaces: that one opened
              `app/(app)/public-profile.tsx`, deleted on 2026-09-06, and a route
              recreated for one button would be a second URL onto a view this
              screen already renders.
            */}
            <Pressable
              className="border-border active:bg-secondary mt-3.5 min-h-10 flex-row items-center justify-center gap-[7px] rounded-lg border px-3.5"
              onPress={() => {
                tapped()
                setEditing(false)
              }}
              role="button"
            >
              <Icon as={Eye} size={15} strokeWidth={1.7} className="text-muted-foreground" />
              <Text className="text-body-sm text-foreground font-medium">
                {t.viewPublicProfile}
              </Text>
            </Pressable>

            {/* «Переглянути публічний профіль» stood here, pushing a route that
                showed what others see. Both are gone (owner, 2026-09-06): the
                tab now OPENS as that view, so the button would have led from a
                thing to itself. */}
          </Card>

          {/* ── Підписка ── `US-053`: the status on the right, the screen behind
              it (`Subscription.dc.html`, «Рядок у профілі»). */}
          <View className="gap-2">
            <SectionLabel label={t.subscriptionSection} />
            <Card variant="flat" className="gap-0 p-0">
              <Pressable
                className="active:bg-secondary min-h-14 flex-row items-center gap-3 px-4"
                onPress={() => {
                  tapped()
                  router.push('/(app)/subscription')
                }}
                role="button"
              >
                <Text className="text-body-sm text-muted-foreground flex-1">
                  {t.subscriptionTitle}
                </Text>
                {subscription ? (
                  <View className="flex-row items-center gap-[7px]">
                    <View
                      className={`h-[7px] w-[7px] rounded-full ${
                        subscription.kind === 'trial'
                          ? 'bg-link'
                          : subscription.kind === 'active'
                            ? 'bg-success'
                            : subscription.kind === 'wontRenew' || subscription.kind === 'beta'
                              ? 'bg-warn'
                              : 'bg-muted-foreground'
                      }`}
                    />
                    <Text className="text-body-sm text-foreground">
                      {subscription.kind === 'trial'
                        ? t.subscriptionStatusTrial
                        : subscription.kind === 'active'
                          ? t.subscriptionStatusActive
                          : subscription.kind === 'wontRenew' || subscription.kind === 'beta'
                            ? t.subscriptionStatusWontRenew
                            : t.subscriptionStatusNone}
                    </Text>
                  </View>
                ) : null}
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
              </Pressable>
            </Card>
          </View>

          {/* ── Акаунт ── */}
          <View className="gap-2">
            <View className="flex-row items-baseline justify-between px-0.5">
              <SectionLabel label={t.accountSection} />
              {dirty ? (
                <Text className="text-caption text-muted-foreground">
                  {t.unsavedCountTemplate.replace('{count}', String(changed.length))}
                </Text>
              ) : null}
            </View>

            <Card variant="flat" className="gap-0 p-0">
              <ProfileRow
                icon={User}
                label={t.name}
                value={draft.name}
                onChangeText={(value) => {
                  set('name', value)
                  setErrors((e) => ({ ...e, name: undefined }))
                }}
                placeholder={t.namePlaceholder}
                autoCapitalize="words"
                changed={draft.name.trim() !== saved.name}
                error={errors.name}
              />

              {/*
                Read-only (owner, 2026-08-31, reaffirmed 2026-09-02). Changing
                the login is `auth.updateUser` with a double confirmation, and
                `public.users.email` is the crew-matching key — see the note on
                this screen and on `updateProfile`.
              */}
              <ProfileRow
                icon={Mail}
                label={t.email}
                value={state.profile.email}
                readOnly
                divided
              />

              <ProfileRow
                icon={Smartphone}
                label={t.phone}
                value={draft.phone}
                onChangeText={(value) => {
                  set('phone', value)
                  setErrors((e) => ({ ...e, phone: undefined }))
                }}
                placeholder={phoneExample()}
                keyboardType="phone-pad"
                changed={draft.phone.trim() !== saved.phone}
                error={errors.phone}
                divided
              />

              {/* «Пароль — Змінити ›». `US-013` covers login, not changing a
                  password; built at the owner's request. */}
              <Pressable
                className="active:bg-secondary border-border min-h-14 flex-row items-center gap-3 border-t px-4"
                onPress={() => {
                  tapped()
                  router.push('/(app)/password')
                }}
                role="button"
              >
                <View className="w-[18px] shrink-0 items-center">
                  <Icon as={Lock} size={17} strokeWidth={1.7} className="text-muted-foreground" />
                </View>
                <Text className="text-body-sm text-muted-foreground flex-1">{t.password}</Text>
                <Text className="text-body-sm text-foreground">{t.changePassword}</Text>
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
              </Pressable>
            </Card>
          </View>

          {/* ── Ваша роль ── */}
          <View className="gap-2">
            <SectionLabel label={t.yourRoleSection} />
            <View className="flex-row flex-wrap gap-1.5">
              {[...ROLE_KEYS, OTHER_ROLE].map((option) => {
                const active = draft.role === option
                return (
                  <Pressable
                    key={option}
                    className={`min-h-[38px] justify-center rounded-lg border px-3 ${
                      active
                        ? 'bg-primary border-primary'
                        : 'bg-background border-border active:bg-secondary'
                    }`}
                    onPress={() => {
                      tickSelection()
                      set('role', option)
                      setErrors((e) => ({ ...e, role: undefined }))
                    }}
                    role="radio"
                    accessibilityState={{ selected: active }}
                  >
                    {/* Label only — `set('role', option)` above stores the
                        bare key, which is what `roleKeyOf` reads back. */}
                    <Text
                      className={`text-body-sm font-medium ${
                        active ? 'text-primary-foreground' : 'text-foreground/85'
                      }`}
                    >
                      {roleWithEmoji(option, t)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {draft.role === OTHER_ROLE ? (
              <Input
                value={draft.customRole}
                onChangeText={(value) => {
                  set('customRole', value)
                  setErrors((e) => ({ ...e, role: undefined }))
                }}
                placeholder={t.otherRolePlaceholder}
              />
            ) : null}
            {errors.role ? (
              <Text className="text-label text-destructive">{errors.role}</Text>
            ) : null}
          </View>

          {/* ── Соцмережі ── */}
          <View className="gap-2">
            <SectionLabel label={t.socialSection} />
            <Card variant="flat" className="gap-0 p-0">
              <ProfileRow
                icon={InstagramIcon}
                label={t.instagramLabel}
                value={draft.instagram}
                onChangeText={(value) => set('instagram', value)}
                placeholder={t.crewInstagramPlaceholder}
                autoCapitalize="none"
                changed={draft.instagram.trim() !== saved.instagram}
              />
              <ProfileRow
                icon={Send}
                label={t.telegramLabel}
                value={draft.telegram}
                onChangeText={(value) => set('telegram', value)}
                placeholder={t.telegramPlaceholder}
                autoCapitalize="none"
                changed={draft.telegram.trim() !== saved.telegram}
                divided
              />
            </Card>
            {/*
              Kept, though the second pass drops it: it is the only place the UI
              says who sees these handles, which is an ADR-013 fact rather than
              decoration.

              **The sentence is now wrong and the copy has not been changed.**
              «Команда бачить ці контакти» was true until 2026-09-03, when the
              organizer card reached the client link (owner) — a client receives
              the same name, role, phone and handles a crew member does. Saying
              «Команда» to the photographer under-reports who sees them, which is
              the wrong direction for a visibility label to be wrong in.

              Not reworded here because the replacement is a copy decision:
              «Команда й клієнт бачать…» reads differently from the promise this
              made. **Needs the owner** — logged in docs/redesign-log.md.
            */}
            <Text className="text-label text-muted-foreground px-0.5">{t.socialSeenByCrew}</Text>
          </View>


          {/* ── Налаштування ── */}
          <View className="gap-2">
            <SectionLabel label={t.settingsSection} />
            <Card variant="flat" className="gap-0 p-0">
              {/*
                «Мова застосунку» — NOT in the first artboard, and moved here by
                the second. `US-015`'s switcher lives ONLY on this screen, so it
                survives wherever the design puts it: dropping it would make
                English unreachable, which is a story regression rather than a
                restyle (P-2).
              */}
              <View className="min-h-14 flex-row items-center gap-3 py-2 pl-4 pr-3">
                <View className="flex-1">
                  <Text className="text-body-sm text-muted-foreground">{t.appLanguage}</Text>
                  <Text className="text-caption text-muted-foreground/70 mt-0.5">
                    {languageSample}
                  </Text>
                </View>
                <LanguageSwitcher />
              </View>

              {/* `US-047` AC-4 — «Валюта», right under the language, drawn
                  like «Сповіщення» with the current currency on the right. */}
              <Pressable
                className="active:bg-secondary border-border min-h-14 flex-row items-center gap-3 border-t px-4"
                onPress={() => {
                  tapped()
                  router.push('/(app)/currency')
                }}
                role="button"
              >
                <Text className="text-body-sm text-muted-foreground flex-1">{t.currencyTitle}</Text>
                <Text className="text-body-sm text-muted-foreground">
                  {`${currencySymbol(currency)} ${currency}`}
                </Text>
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
              </Pressable>

              {/* US-041 AC-9 — «Сповіщення», between the language and support,
                  drawn like the support row (owner, 2026-10-05). The canvas's
                  own «Сповіщення» section in `Edit Profile.dc.html` is not
                  built: the owner kept this screen as it is. */}
              <Pressable
                className="active:bg-secondary border-border min-h-14 flex-row items-center gap-3 border-t px-4"
                onPress={() => {
                  tapped()
                  router.push('/(app)/notifications')
                }}
                role="button"
              >
                <Text className="text-body-sm text-muted-foreground flex-1">
                  {t.notificationsRow}
                </Text>
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
              </Pressable>

              {/* «Написати в підтримку» — a new email to support@lunashoots.com
                  (owner, 2026-10-10), the address the support page and the legal
                  pages give. A stub since 2026-09-02, when no address existed. */}
              <Pressable
                className="active:bg-secondary border-border min-h-14 flex-row items-center gap-3 border-t px-4"
                onPress={() => {
                  tapped()
                  void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
                    // No mail account on the phone: nothing is specified, and the
                    // address is on the support page for anyone who looks.
                  })
                }}
                role="button"
              >
                <Text className="text-body-sm text-muted-foreground flex-1">
                  {t.contactSupport}
                </Text>
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
              </Pressable>

              {/*
                The one irreversible action, moved into this card by the second
                pass. Only the trigger changed — the confirmation is the same
                one `US-019` and `US-022` use, and the question names what goes.
              */}
              <Pressable
                className="active:bg-destructive/10 border-border min-h-14 flex-row items-center gap-3 border-t px-4"
                onPress={() => {
                  tapped()
                  /*
                    `US-053` AC-6 — a trial or subscription that will renew keeps
                    charging after the account is gone: Apple bills the Apple ID,
                    not Luna. Warn first; «Все одно видалити» goes on to the
                    usual confirmation (`Edit Profile.dc.html`).
                  */
                  if (subscription?.kind === 'trial' || subscription?.kind === 'active') {
                    setDeleteSubOpen(true)
                  } else askDelete(null)
                }}
                role="button"
              >
                <Text className="text-body-sm text-destructive flex-1">{t.deleteAccount}</Text>
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-destructive/60 shrink-0"
                />
              </Pressable>
            </Card>
          </View>

          {/* Muted, not destructive — the second pass makes delete the one red
              thing on the screen, and two competing reds was the weaker read. */}
          <Button
            variant="ghost"
            size="block"
            onPress={() => {
              void (async () => {
                await signOut()
                router.replace('/(auth)/login')
              })()
            }}
          >
            <Text className="text-body text-muted-foreground font-semibold">{t.logoutAction}</Text>
          </Button>

          {/*
            The design says «версія 1.0»; `app.config.ts` says 0.1.0. Read from
            `expo-constants` so the two cannot drift again — but the wordmark is
            still unsettled (redesign-log A-6: the handoffs spell the product
            five ways).
          */}
          {version ? (
            <Text className="text-caption text-muted-foreground/70 text-center">
              {t.versionTemplate.replace('{version}', version)}
            </Text>
          ) : null}
        </View>
      </FormScrollView>

      {/*
        The discard confirmation, as a bottom SHEET — the design draws one here,
        where the shoot's edit screen uses an alert dialog for the same question.
        Followed as drawn; the inconsistency is logged rather than resolved by
        guessing which of the two should move.
      */}
      <Sheet open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <View className="gap-2 pb-2">
          <Text className="text-title-sm text-foreground font-semibold">
            {t.discardChangesQuestion}
          </Text>
          <Text className="text-body-sm text-muted-foreground leading-5">
            {t.changedFieldsTemplate.replace('{fields}', changed.join(', '))}
          </Text>
          <View className="mt-4 gap-2">
            <Button
              variant="cta"
              size="cta"
              onPress={() => {
                setDraft(saved)
                setErrors({})
                setConfirmDiscard(false)
                /*
                  Out of the changes, not out of the form: «Скасувати» meant
                  "stop editing" for one day (2026-09-06) and the sheet left
                  with it. The form is the tab again, so discarding restores
                  `saved` and stays put — «Продовжити редагування» beside it
                  would otherwise be the only button that did not leave.
                */
                setToast(t.changesDiscarded)
              }}
            >
              <Text>{t.discardChangesAction}</Text>
            </Button>
            <Button
              variant="outline"
              size="cta"
              className="h-11 py-0"
              onPress={() => setConfirmDiscard(false)}
            >
              <Text className="text-body-sm font-medium">{t.keepEditingAction}</Text>
            </Button>
          </View>
        </View>
      </Sheet>

      {deleteDialog}
      <AlertDialog open={deleteSubOpen} onOpenChange={setDeleteSubOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t.deleteSubTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.deleteSubBody}</AlertDialogDescription>
          <View className="mt-1.5 gap-2">
            <Button
              variant="cta"
              size="cta"
              className="min-h-[46px] py-0"
              onPress={() => {
                setDeleteSubOpen(false)
                void openManageSubscriptions()
              }}
            >
              <Text className="font-semibold" style={{ fontSize: 14 }}>
                {t.deleteSubOpenApple}
              </Text>
            </Button>
            <Pressable
              className="border-danger-border min-h-[46px] items-center justify-center rounded-full border active:bg-danger-bg"
              onPress={() => {
                setDeleteSubOpen(false)
                askDelete(null)
              }}
              role="button"
            >
              <Text className="text-destructive font-semibold" style={{ fontSize: 14 }}>
                {t.deleteSubAnyway}
              </Text>
            </Pressable>
            <Pressable
              className="min-h-[46px] items-center justify-center rounded-full active:bg-secondary"
              onPress={() => setDeleteSubOpen(false)}
              role="button"
            >
              <Text className="text-foreground/85 font-medium" style={{ fontSize: 14 }}>
                {t.deleteSubCancel}
              </Text>
            </Pressable>
          </View>
        </AlertDialogContent>
      </AlertDialog>
      {/* «Фото профілю» — native on device, the app's own Sheet on web. */}
      {avatarSheet}
      {/*
        The emoji picker. Mounted always and shown by `visible`, so its
        selection state survives a cancel — reopening lands on what was last
        looked at rather than resetting to 📷. It commits nothing until
        «Встановити як фото профілю»; the draft is untouched until then.
      */}
      <EmojiAvatarPicker
        visible={emojiOpen}
        initial={avatar.kind === 'emoji' ? { emoji: avatar.emoji, tint: avatar.tint } : null}
        onCancel={() => setEmojiOpen(false)}
        onApply={(choice) => {
          setEmojiOpen(false)
          // Clears `avatarUrl` with it — a photo and an emoji cannot coexist.
          setAvatar({ avatarUrl: null, avatarEmoji: choice.emoji, avatarTint: choice.tint })
          setToast(t.profilePhotoUpdatedTemplate.replace('{emoji}', choice.emoji))
        }}
      />
      {/*
        Raised clear of the bottom bar. The toast portals to the root host, so
        it knows nothing about the navigator it was fired from — 21px above the
        bar is the artboards' `bottom:96` over a 75px one.
      */}
      <Toast
        message={toast}
        onDone={() => setToast(null)}
        bottom={bottomNavHeight(insets.bottom) + 21}
      />
    </View>
  )
}


/**
 * One row of the account card: an icon, a label on the left, the value editable
 * in place on the right, and a dot when it differs from what was saved.
 *
 * The input carries no border or fill of its own — the row IS the field, which
 * is what makes a list of these read as a settings table rather than a stack of
 * form controls. The second pass adds the leading icon and tints the whole row
 * while it is focused, so the active field is legible without giving the input
 * a box back.
 */
function ProfileRow({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  changed = false,
  error,
  readOnly = false,
  divided = false,
  autoCapitalize,
  keyboardType,
}: {
  icon: LucideIcon
  label: string
  value: string
  onChangeText?: (value: string) => void
  placeholder?: string
  changed?: boolean
  error?: string
  readOnly?: boolean
  divided?: boolean
  autoCapitalize?: 'none' | 'words'
  keyboardType?: 'phone-pad'
}) {
  const [focused, setFocused] = useState(false)

  return (
    <View
      className={`${divided ? 'border-border border-t' : ''} ${
        error ? 'bg-destructive/10' : focused ? 'bg-secondary/40' : ''
      }`}
    >
      <View className="min-h-14 flex-row items-center gap-3 px-4">
        <View className="w-[18px] shrink-0 items-center">
          <Icon as={icon} size={17} strokeWidth={1.7} className="text-muted-foreground" />
        </View>
        <Text className="text-body-sm text-muted-foreground w-[78px] shrink-0">{label}</Text>
        {readOnly ? (
          <Text className="text-body text-muted-foreground flex-1 text-right" numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <Input
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            className="h-10 flex-1 border-0 bg-transparent px-0 text-right shadow-none"
          />
        )}
        {/* The change dot. `foreground`, as drawn — it marks "this differs",
            not "this is wrong", so it is not destructive. */}
        {changed ? <View className="bg-foreground h-1.5 w-1.5 shrink-0 rounded-full" /> : null}
      </View>
      {error ? (
        <Text className="text-label text-destructive px-4 pb-2.5 text-right">{error}</Text>
      ) : null}
    </View>
  )
}
