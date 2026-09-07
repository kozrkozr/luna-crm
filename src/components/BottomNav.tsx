import { Pressable, View } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import type { LucideIcon } from 'lucide-react-native'
/*
 * Deep per-icon imports, never the `lucide-react-native` barrel — Metro does
 * not tree-shake and the barrel ships all ~2,000 icon components (S-2 F-5).
 */
import Calendar from 'lucide-react-native/icons/calendar'
import ChartColumn from 'lucide-react-native/icons/chart-column'
import House from 'lucide-react-native/icons/house'
import Users from 'lucide-react-native/icons/users'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { tapped } from '../lib/haptics'

/**
 * How tall the bar is, given the bottom safe-area inset.
 *
 * Exported because things that float above it need the number: `Toast` raises
 * itself by this much (the artboards move every toast from `bottom:60` to
 * `bottom:96`, which is 21px clear of a 75px bar).
 *
 * `7 + 46` is the artboard's own padding and item height. The **inset replaces
 * its flat 22px**, which is the artboard standing in for the home indicator —
 * on a 402×874 frame that is 34pt, and the drawing has no notion of safe areas.
 * The 22 survives as the fallback for a frame that reports no inset at all (the
 * web export, an older device), where a bare 46px bar would sit on the edge.
 */
export function bottomNavHeight(insetBottom: number) {
  return 7 + 46 + (insetBottom || 22)
}

type NavItem = {
  /** The route inside `app/(app)/(tabs)/`. */
  route: 'index' | 'shoots' | 'contacts' | 'statistics'
  label: string
  icon: LucideIcon
}

/**
 * The app's bottom navigation, drawn as `Home.dc.html` draws it — identically
 * to `Calendar.dc.html`, `Contacts.dc.html` and `Edit Profile.dc.html`, which
 * is what makes it a navigator rather than four copies of a component.
 *
 * Rendered through `Tabs`'s `tabBar` prop, so it is mounted once by
 * `app/(app)/(tabs)/_layout.tsx` and every pushed screen — a shoot, the forms,
 * a contact — covers it by sitting in the parent stack instead.
 *
 * ── The numbers ─────────────────────────────────────────────────────────────
 *
 * Container `bg-background`, a `border-border` top hairline, `padding:7px 8px`
 * plus the safe area. Each item is `flex:1`, at least 46px, a 21px icon over a
 * 10.5px label with 4px between them, on radius 9.
 *
 * **The label is `text-micro` (10px), not 10.5.** The scale has no half step and
 * the earlier passes rounded down (`12.5 → text-label`, `13.5 → text-body-sm`).
 *
 * **The active tab is `text-link`** — "Посилання та активний таб у нижній
 * навігації — `text-link`" (2026-09-04 handoff). This is what `Home.dc.html`
 * always drew; the bar shipped on 2026-09-04 with `text-foreground` because the
 * app had no `--link` token to point at, and now it does. Icon and label both
 * take it, so the selected tab is blue rather than merely brighter.
 *
 * **Inactive is `muted-foreground`, and that is a departure.** The artboard's
 * inactive tab is the design's `--muted` (`#868689`); the nearest token here is
 * `--muted-foreground` at `#A4A4A7`, a visible step brighter, so the unselected
 * tabs read stronger than drawn. The alternative is a new token for one
 * component, which is what `--border-strong` cost. Say if it is worth one.
 * (Less pressing now that the active tab carries a hue: the two states no
 * longer have to be told apart on lightness alone.)
 *
 * The press state is `active:opacity-70`, not a fill: the artboards give a tab
 * only a hover *colour*, and a background would invent a surface the design has
 * nowhere else. Bare pressables in this codebase already fade rather than tint.
 */
export function BottomNav({ state, navigation, insets }: BottomTabBarProps) {
  const t = useStrings()

  /*
    Built here rather than at module scope, for the reason `StatusPill` gives:
    a dictionary read once at import time would keep the language the app
    started in for the rest of the session.

    The order is the artboard's, and it is a list of its own rather than a walk
    over `state.routes` so that the bar's order is stated here instead of
    inherited from the filesystem.
  */
  const items: NavItem[] = [
    { route: 'index', label: t.navHome, icon: House },
    { route: 'shoots', label: t.navCalendar, icon: Calendar },
    /*
      Live since 2026-09-04, one commit after the bar itself. It shipped drawn
      and inert because `Contacts.dc.html` groups people into «Клієнти» and
      «Команда» while `contacts` holds only crew — the answer turned out to be
      that both groups are already tables, so the screen is a union of two
      reads. See `src/features/contacts/directory.ts`.
    */
    { route: 'contacts', label: t.navContacts, icon: Users },
    /*
      **«Статистика» took «Профіль»'s place** (owner, 2026-09-07). Both
      artboards that draw a bar now show Головна · Календар · Контакти ·
      Статистика: `Statistics.dc.html` marks the fourth item current, and
      `Edit Profile.dc.html` draws the same four with none of them current —
      the profile screen is no longer in its own bar.

      `/profile` did not move and is not orphaned: the home header's avatar chip
      links to it (`app/(app)/(tabs)/index.tsx`), which is where
      `Home.dc.html` has always put it. It stays a `Tabs.Screen` so that URL,
      `public/_redirects` and the theme playground's manifest are untouched.
    */
    { route: 'statistics', label: t.navStats, icon: ChartColumn },
  ]

  const activeRoute = state.routes[state.index]?.name

  return (
    <View
      className="bg-background border-border flex-row items-stretch border-t px-2 pt-[7px]"
      style={{ paddingBottom: insets.bottom || 22 }}
    >
      {items.map((item) => {
        const target = state.routes.find((route) => route.name === item.route)
        const selected = item.route === activeRoute

        return (
          <Pressable
            key={item.label}
            className="min-h-[46px] flex-1 items-center justify-center gap-1 rounded-[9px] active:opacity-70"
            onPress={() => {
              tapped()
              if (!target || selected) return
              /*
                The canonical custom-`tabBar` press: emit `tabPress` first so a
                screen can intercept it (nothing does yet — a "scroll to top on
                re-tap" would), and navigate only if nobody prevented it.
              */
              const event = navigation.emit({
                type: 'tabPress',
                target: target.key,
                canPreventDefault: true,
              })
              if (!event.defaultPrevented) navigation.navigate(target.name)
            }}
            role="button"
            accessibilityLabel={item.label}
            /*
              `selected` is what `aria-current="page"` is in the artboard, and
              the only thing that tells a screen reader which tab it is on —
              weight and colour say it to everyone else.
            */
            accessibilityState={{ selected }}
          >
            <Icon
              as={item.icon}
              size={21}
              strokeWidth={1.7}
              className={selected ? 'text-link' : 'text-muted-foreground'}
            />
            <Text
              className={`text-micro ${
                selected ? 'text-link font-semibold' : 'text-muted-foreground font-medium'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
