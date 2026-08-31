// Deep per-icon import — see the note in src/components/ui/select.tsx.
import Trash from 'lucide-react-native/icons/trash'
import { Icon } from './ui/icon'
import { useState } from 'react'
import { Alert, Platform, Pressable } from 'react-native'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'

type Props = {
  /** The button's own label, e.g. «Видалити зйомку». */
  label: string
  /** The question asked before anything happens. */
  question: string
  onConfirm: () => void
  disabled?: boolean
  /**
   * Render the trigger as a ✕ in a row rather than a full-width button.
   *
   * `US-022` puts remove beside a name, a role, a response and a link icon; a
   * destructive button the width of the row would dominate a list of people.
   * Only the trigger changes — the confirmation is the same one, so a compact
   * control is not a quieter one.
   */
  compact?: boolean
}

/**
 * A destructive button that asks first.
 *
 * `US-019` AC-2 and `US-022` AC-2 both require that an accidental tap cannot
 * destroy anything, so this exists once rather than twice.
 *
 * **On native it is a real iOS alert.** S-1 F-3 recorded that these two
 * confirmations should be indistinguishable from any other iOS app, and
 * React Native's `Alert` is `UIAlertController` itself — not an approximation
 * of one. That finding was made about the previous UI layer's `native` prop,
 * but the recommendation outlived the library.
 *
 * **On web it is a dialog**, because `react-native-web`'s `Alert.alert` is
 * literally an empty function: using it there would produce a delete button
 * that silently does nothing. The app surface on web is a development
 * convenience rather than a shipping target (the shipping web surface is the
 * anonymous link view), but "does nothing" is the wrong kind of convenience,
 * and it is also the surface these criteria are tested on.
 */
/**
 * The confirmation, without a trigger — `ask(subject)` raises it, `dialog` is
 * what the caller must render.
 *
 * Extracted from `DestructiveAction` on 2026-08-30 so a second caller could
 * reuse it: the shoot's «Матеріали» tab confirms removing a reference, and its
 * trigger is a ✕ drawn on a tile by `ReferenceGrid`, not a button this
 * component could own. Duplicating the Alert-on-native / dialog-on-web split
 * would have been two places to get `US-019` AC-2's guarantee wrong.
 *
 * Generic over the subject so one hook serves a list: `ask(reference)` carries
 * which one all the way to `onConfirm`, rather than the caller keeping a
 * parallel piece of state that could drift from what the dialog is asking
 * about.
 */
export function useDestructiveConfirm<T>({
  question,
  label,
  onConfirm,
}: {
  question: string
  label: string
  onConfirm: (subject: T) => void
}): { ask: (subject: T) => void; dialog: React.ReactNode } {
  const t = useStrings()
  const [pending, setPending] = useState<{ subject: T } | null>(null)

  const ask = (subject: T) => {
    if (Platform.OS !== 'web') {
      Alert.alert(question, undefined, [
        // `cancel` and `destructive` are what make iOS lay the buttons out the
        // way people already expect: cancel is the safe default, the red one is
        // the one that acts.
        { text: t.cancel, style: 'cancel' },
        { text: label, style: 'destructive', onPress: () => onConfirm(subject) },
      ])
      return
    }
    setPending({ subject })
  }

  /*
    Mounted on web only. On native the alert above is the whole interaction, and
    leaving a second, invisible confirmation mounted would put two things named
    «Скасувати» in the tree for a screen reader to find.
  */
  const dialog =
    Platform.OS === 'web' ? (
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{question}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t.cancel}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                if (pending) onConfirm(pending.subject)
                setPending(null)
              }}
            >
              <Text>{label}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ) : null

  return { ask, dialog }
}

export function DestructiveAction({ label, question, onConfirm, disabled, compact }: Props) {
  const { ask, dialog } = useDestructiveConfirm<null>({
    question,
    label,
    onConfirm: () => onConfirm(),
  })

  return (
    <>
      {compact ? (
        /*
          The Figma crew card's second icon button (node 1:99): a 32pt circle on
          `muted`, a 15px trash glyph inside — identified from the asset's own
          path data (a lid line, a handle and a tapered body, so `trash` rather
          than `trash-2`).
       
          **The glyph is `foreground`, not `destructive`.** The frame strokes it
          #FAFAFA, the same white as the copy icon beside it, so the row does not
          carry a red control. That is the frame's call and it is followed here,
          but it does cost something: colour was the only thing marking this
          button as the dangerous one at a glance. The confirmation is still the
          actual guarantee — see this component's own note that a compact trigger
          is not a quieter one.
        */
        <Pressable
          className="bg-muted h-8 w-8 shrink-0 items-center justify-center rounded-full active:opacity-60"
          disabled={disabled}
          onPress={() => ask(null)}
          role="button"
          accessibilityLabel={label}
        >
          <Icon as={Trash} size={15} strokeWidth={1.8} className="text-foreground" />
        </Pressable>
      ) : (
        <Button variant="destructive" disabled={disabled} onPress={() => ask(null)}>
          <Text>{label}</Text>
        </Button>
      )}

      {dialog}
    </>
  )
}
