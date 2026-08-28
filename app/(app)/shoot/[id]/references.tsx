import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Text } from '../../../../src/components/ui/text'
import { ReferenceGrid } from '../../../../src/components/ReferenceGrid'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { listReferences, type Reference } from '../../../../src/features/references/api'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; references: Reference[] }

/**
 * US-021 — every reference on the shoot, on its own page.
 *
 * AC-1 says this is for "anyone viewing that shoot (creator, crew, or client)".
 * Only the creator can reach it today: the crew and client link views are
 * US-007 and US-010 and do not exist yet. It reads through the same
 * `ReferenceGrid` those will use, so the three surfaces cannot drift into
 * showing references differently.
 *
 * Deliberately just a list. US-021's Out of scope rules out reordering,
 * filtering and search, and adding a reference stays on the shoot's own page
 * where US-003 put it.
 */
export default function AllReferencesScreen() {
  const t = useStrings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [state, setState] = useState<State>({ status: 'loading' })

  useFocusEffect(
    useCallback(() => {
      let active = true
      void (async () => {
        const references = await listReferences(id)
        if (!active) return
        setState(references ? { status: 'loaded', references } : { status: 'error' })
      })()
      return () => {
        active = false
      }
    }, [id])
  )

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4">
        <Text className="text-body text-onDark-muted">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        <ReferenceGrid references={state.references} />
      </View>
    </ScrollView>
  )
}
