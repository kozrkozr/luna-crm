import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
/*
 * Deep per-icon imports, never the barrel — see the note in
 * src/components/ui/select.tsx.
 *
 * `ellipsis`, not `more-horizontal`. Lucide's deprecated aliases still ship a
 * `.d.ts` but no runtime module, so `more-horizontal` **typechecks and then
 * fails to bundle** — `tsc --noEmit` is clean and Metro cannot resolve it. If a
 * deep icon import ever passes typecheck and breaks the build, this is why.
 */
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Ellipsis from 'lucide-react-native/icons/ellipsis'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { Tabs, type TabItem } from './ui/tabs'
import { useStrings } from '../i18n/LanguageProvider'
import { tapped } from '../lib/haptics'

export type DetailTab = 'details' | 'people' | 'materials'

/**
 * The shoot-detail screen's own header.
 *
 * Hand-drawn rather than the navigator's, which is a change from the previous
 * pass — that one kept `Stack.Screen`'s native header and put a pencil in
 * `headerRight`. Three things in the handoff make a native header impossible
 * here: the title carries a **subline** («19 вересня · 09:00»), the segmented
 * Tabs control sits **below** the title inside the same fixed block, and a
 * banner **grows** the whole thing by ~53px in client view. None of the three is
 * expressible through `screenOptions`.
 *
 * It is the same trade `app/(app)/index.tsx` already makes and for the same
 * reason (see the note in app/(app)/_layout.tsx): iOS centres a native title as
 * soon as a headerLeft exists, so any arrangement other than the stock one has
 * to be drawn.
 *
 * **`onHeight` is why this is a component and not markup.** The content below
 * scrolls under a fixed header, so it needs the header's height as top padding —
 * and that height is not a constant: it changes with the device's status-bar
 * inset and with a two-line title on a narrow screen. The handoff says so
 * outright: "measure, don't hardcode".
 *
 * It varied by more until 2026-08-31, when «Дивитись як клієнт» was removed
 * (owner) and took its banner with it. Measuring is still right; the range is
 * just narrower.
 */
export function ShootDetailHeader({
  subtitle,
  tab,
  onTabChange,
  tabCounts,
  menuOpen,
  onToggleMenu,
  onHeight,
}: {
  /** «19 вересня · 09:00» — null for a shoot with no times (`US-030` AC-6). */
  subtitle: string | null
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  tabCounts: { people: string; materials: string }
  menuOpen: boolean
  onToggleMenu: () => void
  onHeight: (height: number) => void
}) {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const items: TabItem<DetailTab>[] = [
    { value: 'details', label: t.tabDetails },
    { value: 'people', label: t.tabPeople, count: tabCounts.people },
    { value: 'materials', label: t.tabMaterials, count: tabCounts.materials },
  ]

  return (
    <View
      className="bg-background border-border absolute inset-x-0 top-0 z-10 border-b"
      style={{ paddingTop: insets.top }}
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
    >
      <View className="flex-row items-center px-2">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-lg active:bg-secondary"
          onPress={() => {
            tapped()
            // `canGoBack` first: arriving here from a deep link leaves an empty
            // stack, where `back` does nothing and the control looks broken.
            if (router.canGoBack()) router.back()
            else router.replace('/(app)/shoots')
          }}
          role="button"
          accessibilityLabel={t.cancel}
        >
          <Icon as={ChevronLeft} size={22} strokeWidth={1.9} className="text-foreground" />
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-title-sm text-foreground font-semibold" numberOfLines={1}>
            {t.shootDetailTitle}
          </Text>
          {subtitle ? (
            <Text className="text-caption text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          className={`h-10 w-10 items-center justify-center rounded-lg active:bg-secondary ${
            menuOpen ? 'bg-secondary' : ''
          }`}
          onPress={() => {
            tapped()
            onToggleMenu()
          }}
          role="button"
          accessibilityState={{ expanded: menuOpen }}
          accessibilityLabel={t.edit}
        >
          <Icon as={Ellipsis} size={20} strokeWidth={2} className="text-foreground" />
        </Pressable>
      </View>

      <View className="px-4 pb-2.5 pt-1.5">
        <Tabs items={items} value={tab} onChange={onTabChange} />
      </View>

    </View>
  )
}
