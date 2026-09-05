import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '../../components/ui/button'
import { FormScrollView } from '../../components/ui/form-scroll-view'
import { Input } from '../../components/ui/input'
import { Text } from '../../components/ui/text'
import { Textarea } from '../../components/ui/textarea'
import { FieldLabel } from '../../components/ShootFormFields'
import { RoleChip } from '../../components/RoleChip'
import { VisibilityNote } from '../../components/Visibility'
import { ROLES_UK, uk } from '../../i18n/uk'
import { useStrings } from '../../i18n/LanguageProvider'
import { succeeded, tapped } from '../../lib/haptics'
import { toastOnNextScreen } from '../../lib/nextScreenToast'
import type { DirectoryKind } from './directory'
import { createContact, updateContact } from './api'
import { createClient, updateClientProfile } from '../clients/api'
import { Starfield } from '../../components/Starfield'

/** What the form starts from: empty for «Новий контакт», a row for an edit. */
export type ContactDraft = {
  name: string
  /** Only ever read for `crew` — a client has no role column (`ADR-018`). */
  role: string
  phone: string
  instagram: string
  note: string
}

export const EMPTY_DRAFT: ContactDraft = {
  name: '',
  role: ROLES_UK[0],
  phone: '',
  instagram: '',
  note: '',
}

/**
 * «Новий контакт» / «Редагувати контакт» — `Contacts.dc.html`'s second state.
 *
 * The artboard draws it as a mode of the list screen; here it is two pushed
 * routes over one component, the arrangement the shoot form already uses
 * (`new-shoot` and `shoot/[id]/edit`). Pushed rather than a mode because the
 * artboard's form covers the whole frame including the tab bar — which a pushed
 * screen does by sitting in the parent stack.
 *
 * ── What it writes, and where ───────────────────────────────────────────────
 *
 * «Тип контакту» chooses a TABLE, not a column (see `directory.ts`): «Команда»
 * is a `contacts` row, «Клієнт» a `clients` row. Both are the creator's own and
 * carry a name, a phone, an Instagram handle and a private note; only crew have
 * a role, which is why the artboard hides the chips for a client and why this
 * form does too.
 *
 * ── Three departures, all in docs/redesign-log.md ───────────────────────────
 *
 * **The type cannot be changed on an edit.** The artboard offers the toggle in
 * both modes. Moving a saved person between «Клієнт» and «Команда» is moving a
 * row between tables — a delete and an insert — and deleting a client blanks
 * their name on every shoot they are on (`deleteClient`). So the toggle is
 * shown, and disabled, when editing.
 *
 * **Role chips are `ROLES_UK`'s nine**, not the artboard's six. They are values
 * written to a `role` column and read back on the Ukrainian-only link views;
 * the owner took `Edit Profile.dc.html`'s list verbatim on 2026-09-03 and this
 * follows it. «Оператор» is therefore not offerable — the list has «Відеограф»
 * — and «Інша роль» is here for exactly that gap.
 *
 * **No email and no telegram field**, as drawn. Both columns exist; a contact
 * created here simply has neither, and editing never clears an email that was
 * backfilled from a shoot (see `updateContact`).
 */
export function ContactForm({
  mode,
  kind,
  initial,
  id,
}: {
  mode: 'create' | 'edit'
  kind: DirectoryKind
  initial: ContactDraft
  /** The row being edited. Absent when creating. */
  id?: string
}) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [draft, setDraft] = useState<ContactDraft>(initial)
  /*
    A role outside the chip list opens on «Інша роль» with the stored value
    beside it — the same resolution the add-crew form and the profile use for a
    column that is plain `text`.
  */
  const known = (ROLES_UK as readonly string[]).includes(initial.role)
  const [role, setRole] = useState<string>(known || !initial.role ? initial.role : uk.otherRole)
  const [customRole, setCustomRole] = useState(known ? '' : initial.role)
  const [chosenKind, setChosenKind] = useState<DirectoryKind>(kind)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  /*
    The artboard's own rule: `f.name.trim().length > 1`. Until then the button
    reads «Вкажіть імʼя» and does nothing — the same dimmed-CTA pair every other
    form on this frame uses, rather than an error message after the fact.
  */
  const nameOk = draft.name.trim().length > 1
  const resolvedRole = role === uk.otherRole ? customRole.trim() : role

  const save = async () => {
    if (!nameOk || busy) return
    setBusy(true)
    setFailed(false)

    const name = draft.name.trim()
    const ok =
      chosenKind === 'crew'
        ? mode === 'create'
          ? (await createContact({
              name,
              role: resolvedRole,
              phone: draft.phone,
              instagram: draft.instagram,
              note: draft.note,
            })) !== null
          : await updateContact(id as string, {
              name,
              role: resolvedRole,
              phone: draft.phone,
              instagram: draft.instagram,
              note: draft.note,
            })
        : mode === 'create'
          ? (await createClient({
              name,
              phone: draft.phone.trim() || null,
              instagram: draft.instagram.trim() || null,
              notes: draft.note.trim() || null,
            })) !== null
          : await updateClientProfile(id as string, {
              name,
              phone: draft.phone,
              instagram: draft.instagram,
              notes: draft.note,
            })

    if (!ok) {
      setBusy(false)
      setFailed(true)
      return
    }

    succeeded()
    /*
      The toast belongs to the screen we are going BACK to — this one unmounts
      on the pop, and a toast rendered here would flash for a frame at most.
    */
    toastOnNextScreen(
      mode === 'create' ? t.contactAddedTemplate.replace('{name}', name) : t.changesSaved
    )
    router.back()
  }

  return (
    <View className="bg-background flex-1">
      <Starfield />
      {/*
        «Скасувати · Новий контакт», with a spacer matching the control opposite
        so the title is centred on the screen. The artboard leaves the right
        slot empty and pins the save to the bottom — unlike the profile, whose
        artboard renders no save at all and so put one in the header.
      */}
      <View
        className="bg-background border-border flex-row items-center border-b px-3 pb-2.5"
        style={{ paddingTop: insets.top }}
      >
        <Pressable
          className="active:bg-secondary min-h-11 w-16 shrink-0 justify-center rounded-lg px-1"
          onPress={() => {
            tapped()
            router.back()
          }}
          role="button"
        >
          <Text className="text-body text-muted-foreground" numberOfLines={1}>
            {t.cancel}
          </Text>
        </Pressable>
        <Text className="text-title-sm text-foreground flex-1 text-center font-semibold">
          {mode === 'create' ? t.newContactTitle : t.editContactTitle}
        </Text>
        <View className="w-16 shrink-0" />
      </View>

      <FormScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
      >
        <View className="gap-3.5 p-4">
          {/* ── Тип контакту ── two segments, and fixed once saved. */}
          <View className="gap-2">
            <FieldLabel label={t.contactKindLabel} />
            <View className="flex-row gap-1.5">
              {(
                [
                  { value: 'crew', label: t.crew },
                  { value: 'client', label: t.clientRole },
                ] as const
              ).map((option) => (
                <KindSegment
                  key={option.value}
                  label={option.label}
                  active={option.value === chosenKind}
                  disabled={mode === 'edit'}
                  onPress={() => setChosenKind(option.value)}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <FieldLabel label={t.name} />
            <Input
              id="contact-name"
              value={draft.name}
              onChangeText={(value) => set('name', value)}
              placeholder={t.contactNamePlaceholder}
            />
          </View>

          <View className="gap-2">
            <FieldLabel label={t.phoneField} optional />
            <Input
              id="contact-phone"
              value={draft.phone}
              onChangeText={(value) => set('phone', value)}
              placeholder={t.crewPhonePlaceholder}
              keyboardType="phone-pad"
            />
          </View>

          <View className="gap-2">
            <FieldLabel label={t.instagramLabel} optional />
            <Input
              id="contact-insta"
              value={draft.instagram}
              onChangeText={(value) => set('instagram', value)}
              placeholder={t.crewInstagramPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* ── Роль на зйомці ── crew only, exactly as the artboard gates it. */}
          {chosenKind === 'crew' ? (
            <View className="gap-2">
              <FieldLabel label={t.crewRoleOnShoot} />
              <View className="flex-row flex-wrap gap-1.5">
                {[...ROLES_UK, uk.otherRole].map((option) => (
                  <RoleChip
                    key={option}
                    label={option}
                    active={option === role}
                    onPress={() => setRole(option)}
                  />
                ))}
              </View>
              {role === uk.otherRole ? (
                <Input
                  value={customRole}
                  onChangeText={setCustomRole}
                  placeholder={uk.otherRolePlaceholder}
                />
              ) : null}
            </View>
          ) : null}

          <View className="gap-2">
            <FieldLabel label={t.notesSection} optional />
            <Textarea
              id="contact-notes"
              value={draft.note}
              onChangeText={(value) => set('note', value)}
              placeholder={t.contactNotesPlaceholder}
              className="min-h-[88px]"
            />
            {/*
              True by construction for both tables: `contacts` and `clients` are
              `creator_id = auth.uid()` on every policy, and the link gateway
              selects neither note (`ADR-013`, CLAUDE.md rule 2).
            */}
            <VisibilityNote label={t.crewNotesPrivate} />
          </View>

          <Text className="text-label text-muted-foreground leading-5">
            {mode === 'create' ? t.contactWillBeSaved : t.editContactHint}
          </Text>

          {failed ? <Text className="text-destructive text-sm">{t.somethingWentWrong}</Text> : null}
        </View>
      </FormScrollView>

      {/*
        The save, pinned — the artboard's `bottom:0` block, and its three states
        in one control: white when the form would save, flat `secondary` while it
        would not, with «Вкажіть імʼя» standing in for the label until a name is
        typed.
      */}
      <View
        className="bg-background border-border absolute inset-x-0 bottom-0 border-t px-4 pt-2.5"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          variant={nameOk ? 'cta' : 'secondary'}
          size="cta"
          disabled={busy}
          onPress={() => void save()}
          accessibilityState={{ disabled: !nameOk || busy }}
        >
          <Text className={nameOk ? undefined : 'text-muted-foreground'}>
            {!nameOk ? t.nameRequired : mode === 'create' ? t.saveContact : t.saveChanges}
          </Text>
        </Button>
      </View>
    </View>
  )
}

/**
 * One half of «Тип контакту».
 *
 * Not `Tabs`: that control is a raised segment inside a filled track, and the
 * artboard draws these as the same fill-vs-outline pair as the role chips —
 * full width, 40pt, radius 8.
 *
 * `disabled` is how an edit keeps the type visible without letting it move. The
 * unselected half dims; the selected one does not, because it is still telling
 * the reader which kind of contact they are editing.
 */
function KindSegment({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string
  active: boolean
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`min-h-10 flex-1 items-center justify-center rounded-lg border ${
        active ? 'bg-primary border-primary' : 'bg-background border-border'
      } ${disabled && !active ? 'opacity-40' : ''} ${disabled ? '' : 'active:opacity-70'}`}
      disabled={disabled}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="radio"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text
        className={`text-body-sm font-medium ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
