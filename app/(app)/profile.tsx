import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Pencil from 'lucide-react-native/icons/pencil'
import { Button } from '../../src/components/ui/button'
import { Card } from '../../src/components/ui/card'
import { Icon } from '../../src/components/ui/icon'
import { Input } from '../../src/components/ui/input'
import { Sheet } from '../../src/components/ui/sheet'
import { Text } from '../../src/components/ui/text'
import { Avatar } from '../../src/components/Avatar'
import { LanguageSwitcher } from '../../src/components/LanguageSwitcher'
import { SectionLabel } from '../../src/components/ShootFormFields'
import { Toast } from '../../src/components/Toast'
import { DestructiveAction } from '../../src/components/DestructiveAction'
import { ROLES_UK, uk } from '../../src/i18n/uk'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { failed, selected as tickSelection, succeeded, tapped } from '../../src/lib/haptics'
import { useProfile } from '../../src/features/auth/useProfile'
import {
  deleteOwnAccount,
  profileStats,
  signOut,
  signedAvatarUrl,
  updateProfile,
  uploadAvatar,
  type ProfileStats,
} from '../../src/features/auth/profile'

/** The editable half of the profile — everything the save button writes. */
type Draft = {
  name: string
  phone: string
  role: string
  customRole: string
  instagram: string
  telegram: string
  avatarUrl: string | null
}

/**
 * `US-016` — the account's own profile, rebuilt against `Edit Profile.dc.html`
 * (owner, 2026-08-31).
 *
 * **It was read-only.** `US-016` is viewing a profile and this screen showed
 * five fields, a language switcher and a logout button. The design makes it an
 * editing surface; `US-016` needs amending, and so do `US-001` (roles are no
 * longer a fixed set) and `US-015` (see the «Мова» row below).
 *
 * ── Three departures from the design ────────────────────────────────────────
 *
 * - **Email is read-only.** It is the login credential: changing it means
 *   `auth.updateUser`, `double_confirm_changes` mails both addresses, and
 *   `public.users.email` is the crew-matching key. Doing half of that would
 *   either show an address you cannot log in with, or leave crew matching on
 *   the old one. Owner's decision; the note in the row says so.
 * - **A «Мова» row exists**, which the design has none of. `US-015`'s switcher
 *   lives ONLY here — dropping it would make English selectable nowhere.
 * - **No «KULT Studio» and no version line.** There is no studio column, and
 *   the design's «версія 1.0» disagrees with `app.config.ts` (0.1.0) while
 *   spelling the product a fourth way (redesign-log A-6).
 */
export default function ProfileScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const state = useProfile()

  const [saved, setSaved] = useState<Draft | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; phone?: string; role?: string }>({})
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Seeded once the profile arrives. Not on every render: the reader may
  // already be typing by the time a refetch lands.
  useEffect(() => {
    if (state.status !== 'loaded' || saved) return
    const known = ROLES_UK.includes(state.profile.role as (typeof ROLES_UK)[number])
    const loaded: Draft = {
      name: state.profile.name,
      phone: state.profile.phone ?? '',
      // A role saved through «Інша роль» is not one of the chips, so the chip
      // set opens on «Інша роль» with the stored text beside it.
      role: known ? state.profile.role : uk.otherRole,
      customRole: known ? '' : state.profile.role,
      instagram: state.profile.socialHandle ?? '',
      telegram: state.profile.telegram ?? '',
      avatarUrl: state.profile.avatarUrl,
    }
    setSaved(loaded)
    setDraft(loaded)
  }, [state, saved])

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const counts = await profileStats()
        // Not fatal: the three numbers are decoration on an editing form.
        if (active && counts) setStats(counts)
      })()
      return () => {
        active = false
      }
    }, [])
  )

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

  if (state.status === 'loading' || !draft || !saved) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4" style={{ paddingTop: insets.top + 16 }}>
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
    draft.avatarUrl !== saved.avatarUrl && t.changePhoto,
  ].filter((label): label is string => typeof label === 'string')
  const dirty = changed.length > 0

  const resolvedRole = draft.role === uk.otherRole ? draft.customRole.trim() : draft.role

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
    set('avatarUrl', path)
  }

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
    })
    setBusy(false)

    if (!ok) return setToast(t.somethingWentWrong)
    succeeded()
    setSaved(draft)
    setToast(t.profileSaved)
  }

  const leave = () => {
    if (dirty) return setConfirmDiscard(true)
    router.back()
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="bg-background border-border flex-row items-center border-b px-3 pb-2"
        style={{ paddingTop: insets.top }}
      >
        <Pressable
          className="active:bg-secondary min-h-11 shrink-0 justify-center rounded-lg px-2"
          onPress={() => {
            tapped()
            leave()
          }}
          role="button"
        >
          <Text className="text-body-sm text-muted-foreground font-medium">{t.cancel}</Text>
        </Pressable>
        <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
          {t.myProfileTitle}
        </Text>
        {/* A spacer the width of the control opposite, so the title is centred
            on the screen rather than on what is left of it. */}
        <View className="w-[74px] shrink-0" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-5 p-4">
          {/* ── Identity ── */}
          <Card variant="flat" className="items-center px-4 pb-4 pt-5">
            <Pressable
              className="mb-3 active:opacity-70"
              disabled={busy}
              onPress={() => void pickPhoto()}
              role="button"
              accessibilityLabel={t.changePhoto}
            >
              {/*
                A photo the account holder uploaded of themselves — which is why
                this does not contradict redesign-log F-4. That objection was to
                GENERATING a likeness by hashing a name; crew and clients still
                get initials, because nobody uploaded anything for them.
              */}
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="h-[72px] w-[72px] rounded-full"
                  resizeMode="cover"
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
            <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
              {resolvedRole}
            </Text>

            {/* Derived counts — see `profileStats`. «У команді» counts PEOPLE,
                not crew rows: ADR-003 makes one colleague three rows across
                three shoots. */}
            {stats ? (
              <View className="border-border mt-4 w-full flex-row border-t pt-4">
                <Stat value={stats.shoots} label={t.statShoots} />
                <Stat value={stats.clients} label={t.statClients} />
                <Stat value={stats.crew} label={t.statCrew} />
              </View>
            ) : null}
          </Card>

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
                Read-only (owner, 2026-08-31). Changing the login is
                `auth.updateUser` with a double confirmation, and
                `public.users.email` is the crew-matching key — see the note on
                this screen and on `updateProfile`.
              */}
              <ProfileRow
                label={t.email}
                value={state.profile.email}
                readOnly
                note={t.emailIsLogin}
                divided
              />

              <ProfileRow
                label={t.phone}
                value={draft.phone}
                onChangeText={(value) => {
                  set('phone', value)
                  setErrors((e) => ({ ...e, phone: undefined }))
                }}
                placeholder={t.phonePlaceholder}
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
                <Text className="text-body-sm text-muted-foreground flex-1">{t.password}</Text>
                <Text className="text-body-sm text-foreground">{t.changePassword}</Text>
                <Icon
                  as={ChevronRight}
                  size={15}
                  strokeWidth={2}
                  className="text-muted-foreground shrink-0"
                />
              </Pressable>

              {/*
                «Мова» — NOT in the design, and kept because `US-015`'s switcher
                exists nowhere else. Dropping it to match the drawing would make
                English unreachable, which is a story regression rather than a
                restyle.
              */}
              <View className="border-border min-h-14 flex-row items-center gap-3 border-t px-4 py-2">
                <Text className="text-body-sm text-muted-foreground flex-1">{t.language}</Text>
                <LanguageSwitcher />
              </View>
            </Card>
          </View>

          {/* ── Ваша роль ── */}
          <View className="gap-2">
            <SectionLabel label={t.yourRoleSection} />
            <View className="flex-row flex-wrap gap-1.5">
              {[...ROLES_UK, uk.otherRole].map((option) => {
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
            {draft.role === uk.otherRole ? (
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
                label={t.instagramLabel}
                value={draft.instagram}
                onChangeText={(value) => set('instagram', value)}
                placeholder={t.crewInstagramPlaceholder}
                autoCapitalize="none"
                changed={draft.instagram.trim() !== saved.instagram}
              />
              <ProfileRow
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
              True as built: the gateway sends crew the shoot's crew list with
              contacts. It does NOT send a client anything from `users` — that
              is a shape built from named fields (ADR-013), and this row is not
              among them.
            */}
            <Text className="text-label text-muted-foreground px-0.5">{t.socialSeenByCrew}</Text>
          </View>

          {/* ── Account actions ── */}
          <View className="gap-1 pt-1">
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
              <Text className="text-body text-destructive font-semibold">{t.logoutAction}</Text>
            </Button>

            {/*
              The one irreversible action in the product: `auth.users` cascades
              to every shoot, client, crew member and access link. It uses the
              same confirmation `US-019` and `US-022` use — a real iOS alert on
              device — and the question names what goes.
            */}
            <DestructiveAction
              label={t.deleteAccount}
              question={t.confirmDeleteAccount}
              onConfirm={() => {
                void (async () => {
                  if (await deleteOwnAccount()) router.replace('/(auth)/login')
                  else setToast(t.somethingWentWrong)
                })()
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky save, in the design's three states. */}
      <View
        className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          variant={dirty ? 'cta' : 'secondary'}
          size="cta"
          disabled={busy}
          onPress={() => dirty && void save()}
        >
          <Text className={dirty ? undefined : 'text-muted-foreground'}>
            {busy ? t.savingProfile : dirty ? t.saveChanges : t.noChanges}
          </Text>
        </Button>
      </View>

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

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1">
      <Text className="text-title-sm text-foreground text-center font-semibold">
        {String(value)}
      </Text>
      <Text className="text-caption text-muted-foreground mt-0.5 text-center">{label}</Text>
    </View>
  )
}

/**
 * One row of the account card: a label on the left, the value editable in place
 * on the right, and a dot when it differs from what was saved.
 *
 * The input carries no border or fill of its own — the row IS the field, which
 * is what makes a list of these read as a settings table rather than a stack of
 * form controls.
 */
function ProfileRow({
  label,
  value,
  onChangeText,
  placeholder,
  changed = false,
  error,
  note,
  readOnly = false,
  divided = false,
  autoCapitalize,
  keyboardType,
}: {
  label: string
  value: string
  onChangeText?: (value: string) => void
  placeholder?: string
  changed?: boolean
  error?: string
  note?: string
  readOnly?: boolean
  divided?: boolean
  autoCapitalize?: 'none' | 'words'
  keyboardType?: 'phone-pad'
}) {
  return (
    <View className={divided ? 'border-border border-t' : ''}>
      <View className="min-h-14 flex-row items-center gap-3 px-4">
        <Text className="text-body-sm text-muted-foreground w-24 shrink-0">{label}</Text>
        {readOnly ? (
          <Text
            className="text-body text-muted-foreground flex-1 text-right"
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : (
          <Input
            value={value}
            onChangeText={onChangeText}
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
      {note ? (
        <Text className="text-label text-muted-foreground px-4 pb-2.5 text-right leading-4">
          {note}
        </Text>
      ) : null}
    </View>
  )
}
