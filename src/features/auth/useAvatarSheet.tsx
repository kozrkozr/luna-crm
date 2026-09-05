import { useState } from 'react'
import { ActionSheet } from '../../components/ui/action-sheet'
import { useStrings } from '../../i18n/LanguageProvider'
import { tapped } from '../../lib/haptics'

/**
 * «Фото профілю» — the three-way choice behind the profile avatar.
 *
 * `Edit Profile.dc.html` draws an iOS action sheet: «Встановити нове фото»,
 * «Емоджі», «Прибрати фото» in red, and «Скасувати» detached below. Tapping the
 * avatar used to open the gallery directly; it opens this now.
 *
 * **One implementation, both platforms.** This was `ActionSheetIOS` on native
 * and the app's `Sheet` on web — the split `DestructiveAction` makes, on the
 * argument that the system control is the real thing rather than a copy of it.
 * On iOS 26 the real thing floats in the middle of the screen, which is not
 * what the artboard draws, so `ActionSheet` draws it instead and the platform
 * fork is gone with it. The reasoning is in that component.
 *
 * `onRemove` is offered unconditionally, matching the artboard — it draws
 * «Прибрати фото» whether or not there is anything to remove. Clearing an
 * already-empty avatar writes three nulls over three nulls, which is harmless,
 * and hiding the row would make the sheet's height depend on state in a way
 * nothing drew.
 */
export function useAvatarSheet({
  onPickPhoto,
  onPickEmoji,
  onRemove,
}: {
  onPickPhoto: () => void
  onPickEmoji: () => void
  onRemove: () => void
}): { open: () => void; sheet: React.ReactNode } {
  const t = useStrings()
  const [open, setOpen] = useState(false)

  return {
    open: () => {
      tapped()
      setOpen(true)
    },
    sheet: (
      <ActionSheet
        open={open}
        title={t.photoSheetTitle}
        cancelLabel={t.cancel}
        onClose={() => setOpen(false)}
        items={[
          { label: t.setNewPhoto, onPress: onPickPhoto },
          { label: t.emojiOption, onPress: onPickEmoji },
          // Red, and last before cancel — the position iOS reserves for the
          // choice you are least likely to want by accident.
          { label: t.removePhoto, onPress: onRemove, destructive: true },
        ]}
      />
    ),
  }
}
