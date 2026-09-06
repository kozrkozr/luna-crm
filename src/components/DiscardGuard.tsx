import { useState } from 'react'
import { Alert, Platform, View } from 'react-native'
import { Button } from './ui/button'
import { Sheet } from './ui/sheet'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'

/**
 * «Скасувати» on a form with unsaved changes — ask before losing them.
 *
 * Owner, 2026-09-06. The shoot form and both crew forms left on the first tap,
 * discarding whatever had been typed with nothing said. The profile screen has
 * asked since 2026-09-04, so the behaviour existed; it was on one screen out of
 * four.
 *
 * ── Shaped like `useDestructiveConfirm` ─────────────────────────────────────
 *
 * Same `{ ask, dialog }` pair, for the same reason: the caller decides where the
 * sheet mounts, and the hook owns whether there is anything to ask about.
 * `ask()` on a clean form leaves immediately — a confirmation for a form nobody
 * has touched is a dialog that only ever says yes.
 *
 * **The platform's own alert on device** (owner, 2026-09-06), the sheet on web.
 * Exactly the split `useDestructiveConfirm` makes, and for the same reason: iOS
 * has a shape for "are you sure" and imitating it is worse than using it, while
 * react-native-web has no `Alert` worth the name — and the acceptance suites
 * drive every one of these forms in a browser, so a native-only dialog would
 * make «Скасувати» untestable and silently inert there.
 *
 * It was a `Sheet` on both platforms for an hour, on the reasoning that
 * `Edit Profile.dc.html` draws one and the profile screen had rendered it that
 * way since it was built. The owner asked for the system dialog instead.
 *
 * `cancel` first and `destructive` second is what makes iOS lay the buttons out
 * the way people expect: staying is the safe default, leaving is the one that
 * acts.
 *
 * ── What counts as dirty is the caller's problem ────────────────────────────
 *
 * Deliberately: a form knows what its own emptiness means. The shoot form
 * compares against a snapshot taken when the shoot loaded, and against "all
 * fields empty" when creating; the contact form has an `initial` draft to
 * compare with. Passing that in keeps this from guessing.
 *
 * The profile screen keeps its own copy of this sheet rather than adopting the
 * hook, because its body names the fields that changed
 * (`changedFieldsTemplate`) and it toasts «Зміни відхилено» afterwards. Worth
 * unifying if a second caller ever wants either; unifying now would mean
 * threading two options through for one user.
 */
export function useDiscardGuard({
  dirty,
  onLeave,
}: {
  dirty: boolean
  /** Where «Скасувати» goes — usually `router.back()`. */
  onLeave: () => void
}): { ask: () => void; dialog: React.ReactNode } {
  const t = useStrings()
  const [open, setOpen] = useState(false)

  const ask = () => {
    if (!dirty) return onLeave()
    if (Platform.OS !== 'web') {
      Alert.alert(t.discardChangesQuestion, t.discardChangesBody, [
        { text: t.keepEditingAction, style: 'cancel' },
        { text: t.discardChangesAction, style: 'destructive', onPress: onLeave },
      ])
      return
    }
    setOpen(true)
  }

  /*
    Mounted on web only. On device the alert above is the whole interaction, and
    a second, invisible confirmation left in the tree would give a screen reader
    two things named «Продовжити редагування» to find — the note
    `useDestructiveConfirm` already carries about its own.
  */
  const dialog = Platform.OS !== 'web' ? null : (
    <Sheet open={open} onClose={() => setOpen(false)}>
      <View className="gap-2 pb-2">
        <Text className="text-title-sm text-foreground font-semibold">
          {t.discardChangesQuestion}
        </Text>
        <Text className="text-body-sm text-muted-foreground leading-5">
          {t.discardChangesBody}
        </Text>
        <View className="mt-4 gap-2">
          {/*
            Leaving is the CTA and staying is the outline, which is the
            arrangement the profile's sheet already uses. It reads oddly written
            down — the safe choice is not the prominent one — but the reader
            arrived here by tapping «Скасувати», so leaving is what they asked
            for and the sheet exists to make sure rather than to argue.
          */}
          <Button
            variant="cta"
            size="cta"
            onPress={() => {
              setOpen(false)
              onLeave()
            }}
          >
            <Text>{t.discardChangesAction}</Text>
          </Button>
          <Button
            variant="outline"
            size="cta"
            className="h-11 py-0"
            onPress={() => setOpen(false)}
          >
            <Text className="text-body-sm font-medium">{t.keepEditingAction}</Text>
          </Button>
        </View>
      </View>
    </Sheet>
  )

  return { ask, dialog }
}
