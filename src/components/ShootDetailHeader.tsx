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
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { Tabs, type TabItem } from './ui/tabs'
import { useStrings } from '../i18n/LanguageProvider'
import { tapped } from '../lib/haptics'

export type DetailTab = 'details' | 'people' | 'materials'

/**
 * The shoot-detail screen's own header.
 *
 * Hand-drawn rather than the navigator's. What makes a native header impossible
 * is the segmented Tabs control, which sits **below** the title inside the same
 * fixed block — not expressible through `screenOptions` at all.
 *
 * Two other reasons have since gone: the client-view banner that grew the block
 * (removed 2026-08-31) and the title's subline (removed 2026-09-03, below). The
 * Tabs row alone still settles it.
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
 * (owner) and took its banner with it, and narrower again on 2026-09-03 with the
 * subline. Measuring is still right; the range is just smaller.
 *
 * ── Second pass against `Shoot Detail v3.dc.html` (owner, 2026-09-03) ────────
 *
 * **The subline and the ⋯ menu are both gone.** v3 draws a back chevron, the
 * title, and nothing else — the title sits LEFT of centre in a `flex:1` slot
 * rather than centred between two buttons, because there is no longer a second
 * button to centre it against.
 *
 * Nothing was lost with the menu: its two items are now full-width buttons at
 * the foot of the «Деталі» tab, which is where v3 puts them. The date and time
 * the subline carried are the card's own «Дата» and «Час» rows.
 */
export function ShootDetailHeader({
  tab,
  onTabChange,
  tabCounts,
  onHeight,
}: {
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  tabCounts: { people: string; materials: string }
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
      <View className="flex-row items-center gap-1.5 px-2.5 pb-2 pt-1">
        <Pressable
          className="h-10 w-10 shrink-0 items-center justify-center rounded-lg active:bg-secondary"
          onPress={() => {
            tapped()
            // `canGoBack` first: arriving here from a deep link leaves an empty
            // stack, where `back` does nothing and the control looks broken.
            if (router.canGoBack()) router.back()
            else router.replace('/(app)/(tabs)/shoots')
          }}
          role="button"
          accessibilityLabel={t.cancel}
        >
          <Icon as={ChevronLeft} size={22} strokeWidth={1.9} className="text-foreground" />
        </Pressable>

        {/* Left of centre, in a `flex:1` slot — v3 has no second button for a
            centred title to balance against. */}
        <Text
          className="text-title-sm text-foreground min-w-0 flex-1 font-semibold"
          numberOfLines={1}
        >
          {t.shootDetailTitle}
        </Text>
      </View>

      <View className="mx-3 mb-2.5">
        <Tabs items={items} value={tab} onChange={onTabChange} />
      </View>

    </View>
  )
}
