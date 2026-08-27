import { useState } from 'react'
import { Alert, Platform } from 'react-native'
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
export function DestructiveAction({ label, question, onConfirm, disabled, compact }: Props) {
  const t = useStrings()
  const [open, setOpen] = useState(false)

  const ask = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(question, undefined, [
        // `cancel` and `destructive` are what make iOS lay the buttons out the
        // way people already expect: cancel is the safe default, the red one is
        // the one that acts.
        { text: t.cancel, style: 'cancel' },
        { text: label, style: 'destructive', onPress: onConfirm },
      ])
      return
    }
    setOpen(true)
  }

  return (
    <>
      {compact ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onPress={ask}
          accessibilityLabel={label}
        >
          <Text className="text-destructive">✕</Text>
        </Button>
      ) : (
        <Button variant="destructive" disabled={disabled} onPress={ask}>
          <Text>{label}</Text>
        </Button>
      )}

      {/*
        Mounted on web only. On native the alert above is the whole interaction,
        and leaving a second, invisible confirmation mounted would put two
        things named «Скасувати» in the tree for a screen reader to find.
      */}
      {Platform.OS === 'web' ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{question}</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <Text>{t.cancel}</Text>
              </AlertDialogCancel>
              <AlertDialogAction onPress={onConfirm}>
                <Text>{label}</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}
