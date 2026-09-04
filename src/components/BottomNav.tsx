import { Pressable, View } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import type { LucideIcon } from 'lucide-react-native'
/*
 * Deep per-icon imports, never the `lucide-react-native` barrel — Metro does
 * not tree-shake and the barrel ships all ~2,000 icon components (S-2 F-5).
 */
import Calendar from 'lucide-react-native/icons/calendar'
import CircleUserRound from 'lucide-react-native/icons/circle-user-round'
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
  /**
   * The route inside `app/(app)/(tabs)/`, or `null` for an item that navigates
   * nowhere — see «Контакти» below.
   */
  route: 'index' | 'shoots' | 'profile' | null
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
 * **Inactive is `muted-foreground`, and that is a departure.** The artboard's
 * inactive tab is `#71717a`; our greyscale has nothing there — the nearest is
 * `--muted-foreground` at `#a3a3a3`, a visible step brighter, so the unselected
 * tabs read stronger than drawn. The alternative is a new token for one
 * component, which is what `--border-strong` cost. Say if it is worth one.
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

    The order is the artboard's, and «Контакти» is third — which is why this is
    a list of its own instead of a walk over `state.routes`. The navigator holds
    three screens; the bar draws four items.
  */
  const items: NavItem[] = [
    { route: 'index', label: t.navHome, icon: House },
    { route: 'shoots', label: t.navCalendar, icon: Calendar },
    /*
      **«Контакти» is drawn and inert** (owner, 2026-09-04). `Contacts.dc.html`
      is a whole screen — a search over «Клієнти» / «Команда», three filter
      chips, and a create/edit form — and it needs a `kind` column that
      `contacts` does not have: our directory is the crew address book from
      2026-09-04, while clients live on `Shoot.client*` and `client/[id]`. The
      artboard merges the two, which is a migration and a story, not a tab.

      So this follows the precedent set on 2026-09-02 for controls whose
      destination does not exist: present exactly as designed, does nothing on
      tap. **A quarter of the app's main navigation is dead until that pass** —
      the one thing on this bar that promises something untrue.
    */
    { route: null, label: t.navContacts, icon: Users },
    { route: 'profile', label: t.navProfile, icon: CircleUserRound },
  ]

  const activeRoute = state.routes[state.index]?.name

  return (
    <View
      className="bg-background border-border flex-row items-stretch border-t px-2 pt-[7px]"
      style={{ paddingBottom: insets.bottom || 22 }}
    >
      {items.map((item) => {
        const target = item.route ? state.routes.find((r) => r.name === item.route) : undefined
        const selected = item.route !== null && item.route === activeRoute

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
              className={selected ? 'text-foreground' : 'text-muted-foreground'}
            />
            <Text
              className={`text-micro ${
                selected ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium'
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
