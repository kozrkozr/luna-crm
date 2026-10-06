import { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Text } from '../../../../src/components/ui/text'
import { ReferenceGrid } from '../../../../src/components/ReferenceGrid'
import { useStrings } from '../../../../src/i18n/LanguageProvider'
import { listReferences, type Reference } from '../../../../src/features/references/api'
import { categoryKeyOf, categoryLabel } from '../../../../src/i18n/vocabulary'
import { Starfield } from '../../../../src/components/Starfield'

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
 * Deliberately just a list. US-021's Out of scope rules out reordering and
 * search, and adding a reference stays on the shoot's own page where US-003 put
 * it.
 *
 * **One filter, and it is not a feature.** A `category` param narrows the page
 * to one group, because the shoot's own page draws each group with a chevron
 * (the Figma frame does) and a chevron that led to the unfiltered list would be
 * telling the reader something untrue. There is no filter UI here and none is
 * reachable except through that chevron.
 */
export default function AllReferencesScreen() {
  const t = useStrings()
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>()
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
        <Starfield />
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4">
        <Starfield />
        <Text className="text-body text-muted-foreground">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const shown = category
    ? state.references.filter((reference) => categoryKeyOf(reference.category) === categoryKeyOf(category))
    : state.references

  return (
    <>
      {/* The group's own name as the title when the page is narrowed to it —
          «Усі референси» would contradict the list underneath. */}
      {category ? <Stack.Screen options={{ title: categoryLabel(category, t) }} /> : null}
      <View className="bg-background flex-1">
        <Starfield />
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View className="gap-3 p-4">
            <ReferenceGrid references={shown} />
          </View>
        </ScrollView>
      </View>
    </>
  )
}
