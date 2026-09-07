import { Tabs } from 'expo-router/js-tabs'
import { BottomNav } from '../../../src/components/BottomNav'
import { BACKGROUND } from '../../../src/theme/palette'

/**
 * The four-tab shell the artboards grew on 2026-09-03, built on 2026-09-04.
 *
 * `Home.dc.html`, `Calendar.dc.html`, `Contacts.dc.html` and
 * `Edit Profile.dc.html` all draw the same bar, and drawing it four times is
 * what a navigator exists to avoid: mounted once here, it keeps each tab's
 * scroll position and state, and every screen in the parent stack — a shoot,
 * the forms, «Публічний профіль» — covers it without being told to.
 *
 * **`expo-router/js-tabs`, not the default `Tabs`.** The default is now the
 * SwiftUI tab bar from `@expo/ui`, which draws iOS's own chrome; this is the
 * react-navigation one, whose `tabBar` prop hands the whole bar to us. The bar
 * is hand-drawn monochrome (ADR-017) and could not be a native one.
 *
 * **A route group, so no URL moved.** `index`, `shoots` and `profile` are still
 * `/`, `/shoots` and `/profile` — which is what keeps `public/_redirects` and
 * the theme playground's manifest (`scripts/theme-playground/seed.mjs`) valid
 * without a line changing. In-app hrefs say `/(app)/(tabs)/…` because a group
 * segment is how expo-router disambiguates them, and the three moved routes are
 * the only ones that gained one.
 *
 * The three screens are declared rather than left to the filesystem so the
 * order of `state.routes` is fixed here instead of alphabetically — `BottomNav`
 * looks them up by name, but a stable order keeps the two files readable
 * against each other.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        /*
          All three draw their own header — the greeting on `index`, the meta
          line on `shoots`, «Скасувати · Мій профіль · Зберегти» on `profile` —
          and each already carries the top safe-area inset itself.
        */
        headerShown: false,
        /*
          The dark frame behind the scene, for the same reason the two stacks
          set `contentStyle`: without it the navigator paints white and every
          first tab switch flashes.
        */
        sceneStyle: { backgroundColor: BACKGROUND },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shoots" />
      {/* Live since 2026-09-04. It shipped with the bar as a drawn, inert item
          for one commit, because `Contacts.dc.html` needed a decision the bar
          did not — see the screen. */}
      <Tabs.Screen name="contacts" />
      {/* Live since 2026-09-07, and it took `profile`'s place in the bar —
          see `BottomNav`. */}
      <Tabs.Screen name="statistics" />
      {/* Still a tab screen, no longer a tab BUTTON: `/profile` keeps its URL
          and its state, and the home header's avatar chip is what opens it. */}
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}
