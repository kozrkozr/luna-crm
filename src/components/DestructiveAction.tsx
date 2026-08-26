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
import { uk } from '../i18n/uk'

type Props = {
  /** The button's own label, e.g. «Видалити зйомку». */
  label: string
  /** The question asked before anything happens. */
  question: string
  onConfirm: () => void
  disabled?: boolean
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
export function DestructiveAction({ label, question, onConfirm, disabled }: Props) {
  const [open, setOpen] = useState(false)

  const ask = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(question, undefined, [
        // `cancel` and `destructive` are what make iOS lay the buttons out the
        // way people already expect: cancel is the safe default, the red one is
        // the one that acts.
        { text: uk.cancel, style: 'cancel' },
        { text: label, style: 'destructive', onPress: onConfirm },
      ])
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Button variant="destructive" disabled={disabled} onPress={ask}>
        <Text>{label}</Text>
      </Button>

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
                <Text>{uk.cancel}</Text>
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
