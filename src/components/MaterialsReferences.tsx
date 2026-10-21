import { useEffect, useState, type ReactNode } from 'react'
import { Alert, Platform, Pressable, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Check from 'lucide-react-native/icons/check'
import LinkIcon from 'lucide-react-native/icons/link'
import Plus from 'lucide-react-native/icons/plus'
import X from 'lucide-react-native/icons/x'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { Input } from './ui/input'
import { Text } from './ui/text'
import { ReferenceGrid, hostOf } from './ReferenceGrid'
import { FilterChip } from './ReferencesEditor'
import { ReferencePhotoViewer } from './ReferencePhotoViewer'
import { SectionLabel } from './ShootFormFields'
import { useDestructiveConfirm } from './DestructiveAction'
import { useStrings } from '../i18n/LanguageProvider'
import { CATEGORY_KEYS, categoryKeyOf, categoryLabel } from '../i18n/vocabulary'
import { openExternalUrl } from '../lib/openExternalUrl'
import { succeeded, tapped } from '../lib/haptics'
import { useAccess, useGuard } from '../features/subscription/access'
import {
  addImageReference,
  addLinkReference,
  removeReference,
  setReferenceShot,
  type AddReferenceResult,
  type Reference,
} from '../features/references/api'

type Props = {
  shootId: string
  references: Reference[]
  onAdded: (reference: Reference) => void
  onRemoved: (id: string) => void
  /** A reference came back changed — `US-068`'s «Знято» mark. */
  onChanged: (reference: Reference) => void
  /**
   * `US-057` — given on a desktop browser: the tab's «Файли» block, drawn
   * above «Посилання» in the left column while the chips, «Референси» and
   * «Знято» take the right, four photos to a row (the draft canvas). Absent,
   * one column, as on the phone.
   */
  leading?: ReactNode
}

/**
 * `US-068` — the «Матеріали» tab's references: photos and links apart, and a
 * photo marked «Знято» on set (`Materials-Refs.dc.html`, `Materials-Empty.dc.html`).
 *
 * **Not `ReferencesEditor`.** That block stays on the «Нова зйомка» form exactly
 * as it was (`US-043`, amended 2026-10-18), so this tab got its own component
 * rather than a mode switch inside the shared one. The add paths below repeat
 * `ReferencesEditor`'s — gallery, several at once, one at a time; iOS's prompt
 * for a link — and its comments explain why each is the way it is.
 *
 * The category chips filter all three sections at once (AC-1); what is added is
 * filed under the active chip, as before.
 */
export function MaterialsReferences({
  shootId,
  references,
  onAdded,
  onRemoved,
  onChanged,
  leading,
}: Props) {
  const desktop = leading !== undefined
  const t = useStrings()
  const guard = useGuard()
  const [category, setCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // The web fallback for iOS's link prompt — see `askForLink`.
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  // Photos whose mark is being written, so a second tap cannot race the first.
  const [marking, setMarking] = useState<ReadonlySet<string>>(new Set())
  /*
    `US-069` — the preview. The order is taken when it opens and held while it
    is open (AC-3): a photo marked there stays on its page, and the tab re-sorts
    once it closes. Only a removal changes what is in it (AC-4).
  */
  const [viewer, setViewer] = useState<{ ids: string[]; index: number } | null>(null)
  const { hasAccess } = useAccess()

  const shown =
    category === null
      ? references
      : references.filter((r) => categoryKeyOf(r.category) === category)
  const photos = shown.filter((r) => r.kind === 'image')
  // AC-2 — the order they were added in, which is the order they arrive in.
  const toShoot = photos.filter((r) => !r.shotAt)
  // AC-4 — the order they were marked in.
  const shot = photos
    .filter((r) => r.shotAt)
    .sort((a, b) => (a.shotAt! < b.shotAt! ? -1 : a.shotAt! > b.shotAt! ? 1 : 0))
  const links = shown.filter((r) => r.kind === 'link')

  const viewerPhotos = viewer
    ? viewer.ids.flatMap((id) => references.filter((r) => r.id === id))
    : []
  // AC-4 — after a removal: the next photo, the previous one if it was the
  // last, and nothing left closes the preview.
  useEffect(() => {
    if (!viewer) return
    if (viewerPhotos.length === 0) setViewer(null)
    else if (viewer.index > viewerPhotos.length - 1)
      setViewer({ ...viewer, index: viewerPhotos.length - 1 })
  }, [viewer, viewerPhotos.length])
  // AC-1 — every photo of the active chip, in the tab's order.
  const openViewer = (reference: Reference) => {
    const ids = [...toShoot, ...shot].map((r) => r.id)
    setError(null)
    setViewer({ ids, index: Math.max(0, ids.indexOf(reference.id)) })
  }
  // AC-5 — without access the paywall is a screen, and the modal would sit on it.
  const fromViewer = (action: (reference: Reference) => void) => (reference: Reference) => {
    if (hasAccess === false) setViewer(null)
    guard(action)(reference)
  }

  const photosCounter =
    photos.length === 0
      ? `0 ${t.photosWord}`
      : toShoot.length > 0
        ? t.toShootTemplate.replace('{n}', String(toShoot.length))
        : t.allShot

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

  /** AC-8 — straight to the gallery; no image-or-link sheet on this tab. */
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
      const result = await addImageReference(shootId, asset, category)
      if (result.ok) onAdded(result.reference)
      else if (!firstFailure) firstFailure = result
    }
    if (firstFailure) handle(firstFailure)
    setBusy(false)
  }

  const submitLink = async (raw: string) => {
    const value = raw.trim()
    if (!value) return
    setBusy(true)
    const result = await addLinkReference(shootId, value, category)
    handle(result)
    setBusy(false)
    if (result.ok) setLinkDraft(null)
  }

  /** AC-7 — asked for as the «+» tile's «Посилання» always has been. */
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

  /** AC-3, AC-5 — saved at once; AC-10 — on failure the photo stays put. */
  const toggleShot = async (reference: Reference) => {
    if (marking.has(reference.id)) return
    tapped()
    setMarking((current) => new Set(current).add(reference.id))
    const updated = await setReferenceShot(reference.id, !reference.shotAt)
    setMarking((current) => {
      const next = new Set(current)
      next.delete(reference.id)
      return next
    })
    if (updated) {
      setError(null)
      onChanged(updated)
    } else {
      setError(t.shotSaveFailed)
    }
  }

  // Removing asks first, for a photo and a link alike — see `ReferencesEditor`.
  const removeNow = async (reference: Reference) => {
    if (await removeReference(reference.id)) {
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

  const categoryClause = (reference: Reference) => {
    const key = categoryKeyOf(reference.category)
    return key ? ` — ${categoryLabel(key, t)}` : ''
  }

  const shotLabel = (reference: Reference) =>
    `${reference.shotAt ? t.unmarkShotLabel : t.markShotLabel}${categoryClause(reference)}`

  const shotButton = (reference: Reference) => {
    const on = !!reference.shotAt
    return (
      <Pressable
        className={`h-8 flex-row items-center justify-center gap-1.5 rounded-full ${
          on ? 'bg-success' : 'border-border-strong bg-secondary border active:opacity-70'
        }`}
        disabled={marking.has(reference.id)}
        onPress={guard(() => void toggleShot(reference))}
        role="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={shotLabel(reference)}
      >
        <Icon
          as={Check}
          size={12}
          strokeWidth={3}
          className={on ? 'text-success-foreground' : 'text-muted-foreground'}
        />
        <Text
          className={`text-xs font-semibold ${on ? 'text-success-foreground' : 'text-muted-foreground'}`}
        >
          {t.shotMark}
        </Text>
      </Pressable>
    )
  }

  const chips = (
    <>
      {/* AC-1 — the chips, unchanged; they count every reference in the group. */}
      <View className="flex-row flex-wrap gap-2">
        <FilterChip
          label={`${t.allFilter} ${references.length}`}
          active={category === null}
          onPress={() => setCategory(null)}
        />
        {CATEGORY_KEYS.map((key) => (
          <FilterChip
            key={key}
            label={`${categoryLabel(key, t)} ${
              references.filter((r) => categoryKeyOf(r.category) === key).length
            }`}
            active={category === key}
            onPress={() => setCategory(key)}
          />
        ))}
      </View>
    </>
  )
  const photoSection = (
    <>
      {/*
        ── «Референси» — the photos still to shoot (AC-2, AC-6, AC-9) ──

        With every photo shot, only the «+» is left and the counter reads «усе
        знято» — no note under the grid saying it twice (owner, 2026-10-18).
      */}
      <View className="gap-2.5">
        <SectionHeader label={t.references} counter={photosCounter} />
        {photos.length === 0 ? (
          <View className="border-border-strong bg-secondary/50 items-center rounded-2xl border border-dashed px-4 pb-4 pt-5">
            <Text className="text-foreground text-base font-semibold">{t.noReferencesTitle}</Text>
            <Text className="text-muted-foreground mt-1.5 max-w-[270px] text-center text-sm leading-5">
              {t.noReferencesBody}
            </Text>
            <Button
              variant="cta"
              className="mt-4 h-11 flex-row gap-2 rounded-full px-5"
              disabled={busy}
              onPress={guard(() => void pickFromGallery())}
            >
              <Icon as={Plus} size={16} strokeWidth={2.4} className="text-primary-foreground" />
              <Text className="text-body-sm font-semibold">{t.addPhotos}</Text>
            </Button>
          </View>
        ) : (
          <ReferenceGrid
            references={toShoot}
            onRemove={guard(askToRemove)}
            onOpen={openViewer}
            footer={shotButton}
            columns={desktop ? 4 : 3}
            trailing={
              <Pressable
                className="border-border-strong aspect-square w-full items-center justify-center rounded-[10px] border border-dashed active:bg-secondary"
                disabled={busy}
                onPress={guard(() => {
                  tapped()
                  void pickFromGallery()
                })}
                role="button"
                accessibilityLabel={t.addPhotos}
              >
                <Icon as={Plus} size={20} strokeWidth={2} className="text-muted-foreground" />
              </Pressable>
            }
          />
        )}
      </View>
    </>
  )
  const linkSection = (
    <>
      {/* ── «Посилання» (AC-7, AC-9) ── */}
      <View className="gap-2.5">
        <SectionHeader label={t.linksSection} counter={String(links.length)} />
        <View className="gap-2">
          {links.map((link) => (
            <View
              key={link.id}
              className="bg-secondary border-border flex-row items-center gap-3 rounded-xl border p-2"
            >
              <Pressable
                className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
                onPress={() => void openExternalUrl(link.urlOrPath)}
                role="link"
                accessibilityLabel={hostOf(link.urlOrPath)}
              >
                <View className="bg-background h-12 w-12 items-center justify-center rounded-[10px]">
                  <Icon as={LinkIcon} size={20} strokeWidth={1.7} className="text-muted-foreground" />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-foreground text-sm font-semibold" numberOfLines={1}>
                    {hostOf(link.urlOrPath)}
                  </Text>
                  <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                    {link.urlOrPath}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                className="h-11 w-11 items-center justify-center active:opacity-70"
                onPress={guard(() => askToRemove(link))}
                role="button"
                accessibilityLabel={`${t.remove}: ${hostOf(link.urlOrPath)}`}
              >
                <View className="bg-background border-border h-6 w-6 items-center justify-center rounded-full border">
                  <Icon as={X} size={12} strokeWidth={2.6} className="text-foreground" />
                </View>
              </Pressable>
            </View>
          ))}

          {links.length === 0 ? (
            <Pressable
              className="border-border-strong min-h-16 flex-row items-center gap-3 rounded-xl border border-dashed px-3.5 py-2.5 active:bg-secondary"
              disabled={busy}
              onPress={guard(() => {
                tapped()
                askForLink()
              })}
              role="button"
            >
              <View className="bg-secondary border-border h-10 w-10 items-center justify-center rounded-[10px] border">
                <Icon as={LinkIcon} size={17} strokeWidth={2} className="text-muted-foreground" />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-foreground text-sm font-semibold">{t.addLink}</Text>
                <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                  {t.addLinkHint}
                </Text>
              </View>
              <Icon as={Plus} size={16} strokeWidth={2.2} className="text-muted-foreground" />
            </Pressable>
          ) : (
            <Pressable
              className="border-border-strong min-h-11 flex-row items-center justify-center gap-2 rounded-xl border border-dashed active:bg-secondary"
              disabled={busy}
              onPress={guard(() => {
                tapped()
                askForLink()
              })}
              role="button"
            >
              <Icon as={Plus} size={14} strokeWidth={2.2} className="text-muted-foreground" />
              <Text className="text-muted-foreground text-sm font-medium">{t.addLink}</Text>
            </Pressable>
          )}
        </View>

        {/* The in-app card where there is no `Alert.prompt` (web) — as before. */}
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
      </View>
    </>
  )
  const errorLine = (
    <>
      {/* `US-003` AC-2, `US-068` AC-10 — one line, the list left as it was. */}
      {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
    </>
  )
  const shotSection = (
    <>
      {/* ── «Знято» — the marked photos, in the order they were marked (AC-4) ── */}
      {shot.length > 0 ? (
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2">
            <View className="bg-success h-[18px] w-[18px] items-center justify-center rounded-full">
              <Icon as={Check} size={10} strokeWidth={3.4} className="text-success-foreground" />
            </View>
            <Text className="text-label text-success font-semibold uppercase" style={{ letterSpacing: 0.48 }}>
              {t.shotSectionTemplate.replace('{n}', String(shot.length))}
            </Text>
          </View>
          <ReferenceGrid
            references={shot}
            onRemove={guard(askToRemove)}
            onOpen={openViewer}
            footer={shotButton}
            columns={desktop ? 4 : 3}
            dimmed
          />
          <Text className="text-muted-foreground text-xs">{t.shotHint}</Text>
        </View>
      ) : null}
    </>
  )

  return (
    <>
      {desktop ? (
        <View className="flex-row flex-wrap items-start gap-6">
          <View className="flex-1 gap-6" style={{ flexBasis: 380, minWidth: 380 }}>
            {leading}
            {linkSection}
          </View>
          <View className="flex-1 gap-3" style={{ flexBasis: 380, minWidth: 380 }}>
            {chips}
            {photoSection}
            {errorLine}
            {shotSection}
          </View>
        </View>
      ) : (
        <>
          {chips}
          {photoSection}
          {linkSection}
          {errorLine}
          {shotSection}
        </>
      )}

      <ReferencePhotoViewer
        photos={viewerPhotos}
        index={viewer ? viewer.index : null}
        onIndexChange={(index) => setViewer((current) => (current ? { ...current, index } : current))}
        onClose={() => setViewer(null)}
        chipLabel={category ? categoryLabel(category, t) : null}
        onToggleShot={fromViewer((reference) => void toggleShot(reference))}
        shotLabel={shotLabel}
        onRemove={fromViewer(askToRemove)}
        marking={marking}
        error={error}
      >
        {/* The web confirmation renders in the tree; inside the modal while it is open. */}
        {viewer ? removeDialog : null}
      </ReferencePhotoViewer>
      {viewer ? null : removeDialog}
    </>
  )
}

function SectionHeader({ label, counter }: { label: string; counter: string }) {
  return (
    <View className="flex-row items-baseline justify-between">
      <SectionLabel label={label} />
      <Text className="text-label text-muted-foreground">{counter}</Text>
    </View>
  )
}
