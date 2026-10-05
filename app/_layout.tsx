import '../src/theme/global.css'

import { useEffect } from 'react'
import { PortalHost } from '@rn-primitives/portal'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BACKGROUND } from '../src/theme/palette'
import { requestReminderPermission } from '../src/features/reminders/permission'
import { syncReminders } from '../src/features/reminders/sync'

/**
 * Root shell for both surfaces.
 *
 * `(app)`  — the creator's screens, behind an account (Supabase Auth + RLS).
 * `(auth)` — register / log in.
 * `s/`     — the anonymous link surface: no account, no install, reached at a
 *            plain /s/{token} URL and served as static web (ADR-012).
 *
 * The grouping is not cosmetic. S-2 found that a naive web export publishes the
 * creator's screens to the public link host, and the route groups are what a
 * Pages build would filter on to ship `s/` only.
 *
 * **No such filter exists yet, deliberately.** `expo export -p web` emits all
 * 23 routes and the whole of `dist/` is what would be deployed, creator screens
 * included. Owner's decision, 2026-08-27: the web app surface is useful for
 * review during the build, so it ships with the link views for now. Not a data
 * risk — RLS guards every row whatever pages exist — but the web app was only
 * ever a development convenience, so anyone reaching it gets a surface nobody
 * designed for a browser. Revisit before v1: docs/open-questions.md #26.
 *
 * There is no theme provider. NativeWind needs only the stylesheet import above
 * (ADR-016) — the tokens live in src/theme/global.css and reach components as
 * Tailwind classes, so nothing has to be threaded through React context.
 *
 * The app declares ONE theme, the dark frame of ADR-017: everything is defined
 * on `:root`, there is no `.dark` block, and nothing applies the `dark` class.
 * That is why no scheme has to be pinned — the system setting has no light
 * variant to fall into. `StatusBar style="light"` because the bar sits on the
 * near-black frame; app.config.ts keeps `userInterfaceStyle: 'light'` on
 * purpose, since that governs native chrome (keyboard, date pickers) which
 * appears over the white card content, not over the frame.
 *
 * **`GestureHandlerRootView` wraps everything** (2026-09-05). The library was
 * already in the tree — expo-router and react-native-screens both depend on it
 * — but only as a transitive one, and nothing had ever mounted its root view
 * because no screen used a gesture of its own. Swipe-to-delete on the two shoot
 * lists does (`src/components/SwipeToDelete.tsx`), and without this host a
 * gesture handler on iOS is simply never fed touches: the row does not move and
 * nothing warns. It is `react-native-gesture-handler` as a direct dependency
 * now for the same reason — importing a package you did not declare works right
 * up until the day something else stops depending on it.
 */
export default function RootLayout() {
  /*
    US-041 AC-1 — notification permission is asked at first launch, before any
    login. iOS shows its prompt only while the answer is undetermined, so this
    runs on every launch and asks once. A no-op on web, where the link surface
    is served from this same layout.

    Synced once answered: a creator already signed in (every beta tester, on
    the update that brings this) has had a sync run before the prompt was
    answered, and that one found no permission. Without a session it is a no-op.
  */
  useEffect(() => {
    void requestReminderPermission().then(() => syncReminders())
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {/*
        headerShown: false — the route groups `(app)` and `(auth)` are
        organisational, not screens. Left on, the root stack renders a header
        titled with the literal group name, so registration showed
        «(auth) Реєстрація». Each group's own layout owns its header.
      */}
      {/*
        `contentStyle` carries the dark frame here too (ADR-017). The link views
        sit directly under this stack and draw their own header, so they get no
        headerStyle — but without a content background the navigator paints
        white behind them and the first paint of a link flashes.
      */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BACKGROUND } }} />
      {/*
        React Native Reusables' Select renders through @rn-primitives/portal,
        which needs one host mounted as the last child of the providers.

        This is the same provider/consumer-through-context shape that broke
        US-001's role picker on a device before ADR-016, when npm nested eight
        copies of the previous UI layer's portal package. It passed every
        browser check first, because the DOM has an implicit host that a native
        tree does not. The library changed; the hazard did not. See README,
        "Things that will bite you".
      */}
      <PortalHost />
    </GestureHandlerRootView>
  )
}
