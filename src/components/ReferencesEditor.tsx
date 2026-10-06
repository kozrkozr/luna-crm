import { useState } from 'react'
import { Alert, Platform, Pressable, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import ImageIcon from 'lucide-react-native/icons/image'
import LinkIcon from 'lucide-react-native/icons/link'
import Plus from 'lucide-react-native/icons/plus'
import { ActionSheet } from './ui/action-sheet'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { Input } from './ui/input'
import { Text } from './ui/text'
import { ReferenceGrid } from './ReferenceGrid'
import { useDestructiveConfirm } from './DestructiveAction'
import { useStrings } from '../i18n/LanguageProvider'
import { succeeded, tapped } from '../lib/haptics'
import type { AddReferenceResult, Reference } from '../features/references/api'

type Props = {
  references: Reference[]
  /** Add one image under `category`. The «Матеріали» tab saves it; the form holds it. */
  addImage: (
    asset: ImagePicker.ImagePickerAsset,
    category: string | null
  ) => Promise<AddReferenceResult>
  /** Add one link under `category`. Same split as `addImage`. */
  addLink: (link: string, category: string | null) => Promise<AddReferenceResult>
  onAdded: (reference: Reference) => void
  /** Take one away; false when that failed. */
  remove: (reference: Reference) => Promise<boolean>
  onRemoved: (id: string) => void
  /**
   * Ask before removing. True on «Матеріали», where a removal is final; false on
   * the new-shoot form, where nothing has been saved yet (`US-043` AC-4).
   */
  confirmRemove: boolean
  /** How an image tile finds its picture — see `ReferenceGrid`. */
  resolveImage?: (reference: Reference) => Promise<string | null>
}

/**
 * The «Референси» block — filter chips, the grid with its «+», the
 * image-or-link sheet, the link card and the messages — everything below the
 * section's heading.
 *
 * Lifted out of the «Матеріали» tab for `US-043`, which puts the same block on
 * the «Нова зйомка» form "one to one". One component rather than a copy, so the
 * two cannot drift apart. What differs is only where a reference goes: the tab
 * saves it at once, the form holds it until the shoot exists — so the caller
 * supplies `addImage`, `addLink` and `remove`, and this decides nothing about
 * the database.
 */
export function ReferencesEditor({
  references,
  addImage,
  addLink,
  onAdded,
  remove,
  onRemoved,
  confirmRemove,
  resolveImage,
}: Props) {
  const t = useStrings()
  const [category, setCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /*
    ── «Додати референс» (owner, 2026-09-06) ─────────────────────────────────

    The grid's «+» opened the gallery straight away, so a reference could only
    ever be an image. `US-003` is "attach a reference by link OR gallery image",
    and `addLinkReference` has been callable and uncalled since `4a8d8bf` took
    the link form off this screen — the tile the story's AC-1 describes could
    still be *seen*, having been seeded, but not made.

    `Shoot Detail v3.dc.html` puts the artboard's own answer behind the «+»: an
    action sheet asking which kind, and an inline card for the link.
  */
  const [kindSheetOpen, setKindSheetOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState<string | null>(null)

  const shown = category === null ? references : references.filter((r) => r.category === category)

  const handle = (result: AddReferenceResult) => {
    if (result.ok) {
      onAdded(result.reference)
      setError(null)
      return
    }
    setError(
      result.reason === 'invalidLink'
        ? t.referenceLinkInvalid
        : result.reason === 'unsupportedType'
          ? t.referenceTypeUnsupported
          : t.referenceAddFailed
    )
  }

  /**
   * «Зображення» — the gallery, **many at once** (owner, 2026-09-06).
   *
   * It took `assets[0]` and dropped the rest, so a moodboard of twelve was
   * twelve trips through the picker. `allowsMultipleSelection` is the whole of
   * the change on the picker's side; the rest is what to do with more than one
   * result.
   *
   * ── One at a time, deliberately ─────────────────────────────────────────────
   *
   * `addImageReference` uploads to Storage and then inserts a row, and this
   * awaits each before starting the next. `Promise.all` would be faster and
   * wrong twice over: the list is ordered by `created_at`, so parallel inserts
   * would land the reader's selection in an arbitrary order, and a dozen
   * simultaneous uploads on a phone's connection is how one of them fails for
   * reasons nothing here can report usefully.
   *
   * Each success is handed up as it lands, so the grid fills in as the upload
   * runs rather than staying empty until the last one finishes.
   *
   * ── When one of them fails ─────────────────────────────────────────────────
   *
   * The successes are kept — `US-003` AC-2's "the list is unchanged" is about a
   * rejected reference, not about the ones beside it — and the FIRST failure's
   * message is shown. It is not reported per file: saying "3 of 12 failed" needs
   * copy nobody has written, and the alternative of showing the last message
   * would let a later success blank the error entirely. Recorded in
   * docs/redesign-log.md as wanting the owner rather than invented here.
   *
   * **No selection limit.** `selectionLimit` is left unset (unlimited), because
   * no story gives a number and picking one would be inventing a rule. Worth
   * knowing that a reader who selects fifty will wait for fifty uploads with
   * only the «+» tile disabled to say so.
   */
  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: true,
    })
    if (picked.canceled || picked.assets.length === 0) return

    setBusy(true)
    setError(null)
    let firstFailure: AddReferenceResult | null = null
    for (const asset of picked.assets) {
      // Into the chip that is currently active — the handoff's filter doubles as
      // the destination, which is the same idea the previous pass's per-group «+»
      // had: the group you add into IS the choice, so no picker and no new copy.
      const result = await addImage(asset, category)
      if (result.ok) onAdded(result.reference)
      else if (!firstFailure) firstFailure = result
    }
    if (firstFailure) handle(firstFailure)
    setBusy(false)
  }

  /**
   * `US-003` AC-1 and AC-2, reachable again.
   *
   * The validation is `addLinkReference`'s, not this function's — it refuses
   * anything that is not http(s) before the insert, so AC-2's "the list is
   * unchanged" is true of the database and not merely of the screen. `handle`
   * already maps `invalidLink` onto `referenceLinkInvalid`.
   *
   * The card stays open on a rejection, holding what was typed: the reader has
   * to edit the link, and a card that closed would make them paste it again.
   */
  const submitLink = async (raw: string) => {
    const value = raw.trim()
    if (!value) return
    setBusy(true)
    const result = await addLink(value, category)
    handle(result)
    setBusy(false)
    if (result.ok) setLinkDraft(null)
  }

  /**
   * Ask for the link — **iOS's own prompt where there is one** (owner,
   * 2026-09-06), the in-app card everywhere else.
   *
   * `Alert.prompt` exists on iOS alone: react-native-web has no such method and
   * Android's `Alert` has no text field. This is the split `useDestructiveConfirm`
   * already makes for the same reason — the platform's own dialog when it has
   * one, and something built when it does not — and it matters more than usual
   * here, because the acceptance suites drive this screen in a browser. Without
   * the fallback, adding a link would be untestable and the web build would
   * silently do nothing.
   *
   * `'url'` as the keyboard type, so iOS offers «.com» and no autocorrect.
   *
   * The rejection message still renders under the grid rather than in a second
   * alert: `US-003` AC-2 asks for a message, `handle` already writes one, and a
   * modal that reopens itself to complain is a worse way to read it than a line
   * that stays put while you tap «+» again.
   */
  const askForLink = () => {
    setError(null)
    if (Platform.OS === 'ios') {
      Alert.prompt(
        t.newReferenceLink,
        undefined,
        [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.addReferenceLinkAction,
            onPress: (value?: string) => void submitLink(value ?? ''),
          },
        ],
        'plain-text',
        '',
        'url'
      )
      return
    }
    setLinkDraft('')
  }

  /*
    Removing a reference asks first (owner, 2026-08-30).

    Unlike the crew removal on the «Команда» tab, which the handoff gives a 4-second
    undo instead of a question, and unlike the edit screen's location ✕, which is
    only a draft change until «Зберегти» — a ✕ here writes immediately and
    `soft_remove_reference` has no inverse. So it takes the same guarantee
    `US-019` and `US-022` use, through the same component.
  */
  const removeNow = async (reference: Reference) => {
    // Removed from view only once the write succeeded. There is no undo to
    // fall back on here, so an optimistic hide that silently failed would
    // leave the reference on the shoot with nothing saying so.
    if (await remove(reference)) {
      succeeded()
      onRemoved(reference.id)
    } else {
      setError(t.referenceAddFailed)
    }
  }
  const { ask: askToRemove, dialog: removeDialog } = useDestructiveConfirm<Reference>({
    question: t.confirmRemoveReference,
    label: t.remove,
    onConfirm: (reference) => void removeNow(reference),
  })
  // `US-043` AC-4 — on the new-shoot form nothing is saved yet, so it goes at once.
  const askRemove = confirmRemove
    ? askToRemove
    : (reference: Reference) => void removeNow(reference)

  return (
    <>
      {/*
          The filter chips. «Всі» plus the three categories the previous pass
          took from the Figma frame (`referenceCategories`) — no story supplies
          them, which redesign-log S-7 already records. A category with nothing in
          it still gets a chip, as the handoff draws: the chips are the shape of
          the collection, not a summary of it.
        */}
      {/*
          Wrapping rather than a horizontal ScrollView. There are four chips at
          most — «Всі» plus `referenceCategories` — and a nested scroll view
          inside the screen's own would fight it for the gesture on a row that
          rarely needs to scroll at all.
        */}
      <View className="flex-row flex-wrap gap-2">
        <FilterChip
          label={`${t.allFilter} ${references.length}`}
          active={category === null}
          onPress={() => setCategory(null)}
        />
        {t.referenceCategories.map((name) => (
          <FilterChip
            key={name}
            label={`${name} ${references.filter((r) => r.category === name).length}`}
            active={category === name}
            onPress={() => setCategory(name)}
          />
        ))}
      </View>

      <ReferenceGrid
        references={shown}
        onRemove={askRemove}
        resolveImage={resolveImage}
        trailing={
          <Pressable
            className="border-border aspect-square w-full items-center justify-center rounded-[10px] border active:bg-secondary"
            disabled={busy}
            onPress={() => {
              tapped()
              setKindSheetOpen(true)
            }}
            role="button"
            accessibilityLabel={t.addReferenceOrFile}
          >
            <Icon as={Plus} size={20} strokeWidth={2} className="text-muted-foreground" />
          </Pressable>
        }
      />

      {/*
          «Нове посилання» — the card the sheet's «Посилання» opens, as the
          artboard draws it: a heading, the field, «Додати» and «Скасувати».

          Below the grid rather than in place of it, so the reference being
          added sits under the ones already there. `autoFocus` because the sheet
          that opened this card was itself a deliberate choice — asking for a
          second tap to reach the field it exists to offer would be a tap too
          many.
        */}
      {linkDraft !== null ? (
        <View className="border-border-strong bg-secondary gap-2 rounded-xl border p-3.5">
          <Text className="text-body-sm text-foreground font-semibold">{t.newReferenceLink}</Text>
          <Input
            value={linkDraft}
            onChangeText={setLinkDraft}
            placeholder={t.newReferenceLinkPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            keyboardType="url"
            onSubmitEditing={() => void submitLink(linkDraft)}
          />
          <View className="flex-row items-center gap-2">
            <Button
              variant="cta"
              className="h-10 flex-1"
              disabled={busy || !linkDraft.trim()}
              onPress={() => void submitLink(linkDraft)}
            >
              <Text className="text-body-sm font-semibold">{t.addReferenceLinkAction}</Text>
            </Button>
            <Pressable
              className="active:bg-muted h-10 shrink-0 items-center justify-center rounded-lg px-3.5"
              onPress={() => {
                tapped()
                setLinkDraft(null)
                setError(null)
              }}
              role="button"
            >
              <Text className="text-body-sm text-muted-foreground font-semibold">{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* `US-003` AC-2 — an unsupported file, a failed upload or a link that
            is not one says so, and the list is left exactly as it was. */}
      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
      {removeDialog}

      {/*
          Which kind of reference — the artboard's own sheet, through the same
          `ActionSheet` the avatar picker uses.

          The title names the active chip, because that chip is also the
          destination: whichever group is filtered to is the one the reference
          is filed under, for a link exactly as for an image. «Всі» has no group
          to name, so the title drops the clause rather than printing «Всі» as
          though it were one.
        */}
      <ActionSheet
        open={kindSheetOpen}
        title={
          category
            ? t.addReferenceSheetTitle.replace('{category}', category)
            : t.addReferenceSheetTitleAll
        }
        cancelLabel={t.cancel}
        onClose={() => setKindSheetOpen(false)}
        items={[
          {
            // A glyph on each row, as the artboard draws them — a picture and
            // a chain. `ImageIcon` is aliased because `Image` here is React
            // Native's.
            icon: ImageIcon,
            label: t.referenceKindImage,
            onPress: () => {
              setKindSheetOpen(false)
              void pickFromGallery()
            },
          },
          {
            icon: LinkIcon,
            label: t.referenceKindLink,
            onPress: () => {
              setKindSheetOpen(false)
              askForLink()
            },
          },
        ]}
      />
    </>
  )
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`min-h-[34px] shrink-0 justify-center rounded-lg border px-3 ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-body-sm font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
