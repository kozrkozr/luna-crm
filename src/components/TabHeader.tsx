import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from './ui/text'

/**
 * The header every tab root draws — one component, because the four artboards
 * draw one header (owner, 2026-09-07).
 *
 * `Home.dc.html`, `Calendar.dc.html`, `Contacts.dc.html` and
 * `Statistics.dc.html` all open with the same block, to the pixel:
 *
 *     padding:54px 0 0                     ← the safe area, which no drawing has
 *     border-bottom:1px solid var(--border)
 *     row: display:flex; align-items:center; gap:6px; padding:4px 14px 8px
 *       flex:1  → 16px/600 title
 *               → 11.5px `--text-dim` meta line, margin-top:1px
 *       flex:none → whatever that screen puts on the right
 *
 * The four had drifted apart while each was built against its own artboard:
 * the home screen's greeting was 22px and bold with no hairline under it, the
 * calendar and «Мої контакти» both carried a back control, and «Мої контакти»
 * centred its title and had no meta line at all. Same block, four
 * interpretations — which is what a shared component is for.
 *
 * ── The numbers ─────────────────────────────────────────────────────────────
 *
 * `px-3.5` is the artboard's 14. `pt-1` + `pb-2` is its `4px … 8px`, and the
 * safe-area inset replaces the 54 — on a 402×874 frame that is 59pt, and the
 * drawing has no notion of safe areas.
 *
 * **The title is `text-title-sm` (16px) and the meta `text-caption` (11px).**
 * The scale has no 11.5 step and the earlier passes rounded down, which is what
 * `BottomNav` did with the bar's 10.5px label.
 *
 * ── What is NOT here ────────────────────────────────────────────────────────
 *
 * **No back control.** Every one of the four is a tab root: there is nothing to
 * pop, and the bar that reaches all four is 46pt below. The calendar and
 * «Мої контакти» each grew one on 2026-09-04 because the artboards then drew
 * one; the current artboards draw neither, and a control that navigates
 * sideways to a tab already one tap away was the weakest of the two readings
 * anyway.
 *
 * `title` and `meta` are single-line: a wrapped title would move the meta and
 * the four headers would stop being the same height.
 */
export function TabHeader({
  title,
  meta,
  right,
  children,
}: {
  title: string
  /** The 11px line under the title. Omitted rather than empty when there is
      nothing to say — «Статистика» has no line on an account with no shoots. */
  meta?: string | null
  /** The right-hand slot: the home screen's bell and avatar, and nothing else
      so far. `flex:none` in the artboards, so it keeps its own width. */
  right?: ReactNode
  /**
   * A second block under the row, inside the same bordered container — which
   * is how `Contacts.dc.html` draws its search field and filter chips
   * (`padding:0 12px 10px`). They belong to the header, not to the list: they
   * stay put while the list scrolls under them.
   */
  children?: ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <View className="bg-background border-border border-b" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-1.5 px-3.5 pb-2 pt-1">
        <View className="min-w-0 flex-1">
          <Text className="text-title-sm text-foreground font-semibold" numberOfLines={1}>
            {title}
          </Text>
          {meta ? (
            <Text className="text-caption text-muted-foreground mt-px" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  )
}
