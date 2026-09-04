import { Stack } from 'expo-router'
import { LanguageProvider, useStrings } from '../../src/i18n/LanguageProvider'
import { RequireSession } from '../../src/features/auth/RequireSession'
import { navigationScreenOptions } from '../../src/theme/palette'

/**
 * The creator's surface. Everything here requires a session (EP-01), enforced
 * once for the whole group by RequireSession (US-017 AC-2) so that screens
 * added by later stories are guarded by default.
 */
export default function AppLayout() {
  return (
    <RequireSession>
      {/*
        US-014 — the language provider wraps this group and only this group.
        `(auth)` and `s/` sit outside it, so a screen with no account behind it
        has no language to resolve and stays Ukrainian by construction rather
        than by remembering to.

        Inside RequireSession, because the preference is read from the signed-in
        user's row: there is nothing to resolve until there is a session.
      */}
      <LanguageProvider>
        <AppStack />
      </LanguageProvider>
    </RequireSession>
  )
}

/**
 * Separate from `AppLayout` because a component cannot consume a context it
 * renders itself — the titles below need the provider that AppLayout mounts.
 */
function AppStack() {
  const t = useStrings()
  return (
    /*
      ADR-017 — the native header and the navigator's own background have to be
      told about the dark frame. NativeWind cannot reach either: they are
      @react-navigation props that take colour strings, so the values come from
      src/theme/palette.ts and the colour rule still holds.

      `contentStyle` is as important as the header here. Without it the
      navigator paints white behind each screen and every push flashes.
    */
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        /*
          The chevron alone in headerLeft, on every route (owner, 2026-08-30).
          iOS's default writes the previous screen's title beside it, which no
          mockup draws and which pushed a centred title off-centre on the
          longer ones. It was already set one screen at a time on `shoots` and
          `new-shoot`; a navigator-wide default is the same thing without the
          chance of forgetting it on the next screen added.
        */
        headerBackButtonDisplayMode: 'minimal',
        ...navigationScreenOptions,
      }}
    >
      {/*
        One route draws its own header and so takes none from the navigator:
        `index` (US-035's home screen — greeting, bell, profile chip), whose
        arrangement is impossible natively because iOS centres a native title as
        soon as a headerLeft exists. Every other route keeps the native header.

        `shoots` used to be the second. Its header had already lost the avatar
        and then the title, leaving a hand-drawn chevron and nothing else, so the
        route now takes the navigator's header on the same options `new-shoot`
        uses (owner, 2026-08-29) — one back control, drawn once.

        US-016 AC-2's route to the profile and US-015's language switcher both
        survived the change: the profile is the avatar on `index`, and the
        switcher moved onto the profile screen itself. `shoots` had an avatar of
        its own until the owner removed it (2026-08-29) — home is the one route
        now, which is also the screen `shoots` is reached from. **If home ever
        loses its avatar, AC-2 has no route left.**
      */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      {/*
        `shoots` draws its own header again (2026-08-30) — it had gone back to
        the navigator's on 2026-08-29 when its hand-drawn one was reduced to a
        bare chevron. `Calendar.dc.html` gives it a meta line under the title
        («Вересень · 6 зйомок») and a «Сьогодні» control on the right, and a
        native header can hold neither.
      */}
      <Stack.Screen name="shoots" options={{ headerShown: false }} />
      <Stack.Screen
        name="client/[id]"
        options={{ title: t.clientProfileTitle, headerLargeTitle: false }}
      />
      {/*
        A pushed screen, not `presentation: 'modal'` — it gives the form the
        whole screen instead of a sheet that stops short of the top.

        It draws its own header since 2026-08-30: «Скасувати» · «Нова зйомка» ·
        «Зберегти», where the save dims until the form would actually save. Five
        routes in this navigator now draw their own.
      */}
      <Stack.Screen name="new-shoot" options={{ headerShown: false }} />
      {/* Profile draws its own header too since 2026-08-31 — «Скасувати» beside
          a centred title, with the save pinned to the bottom. So does the
          change-password screen it leads to. */}
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      {/*
        «Публічний профіль», both readers — the account holder previewing
        themselves and a person from «Мої контакти». Each draws its own header:
        a back control labelled for where it came from, a centred title, and a
        subline under it saying what the reader is looking at. A native header
        holds none of the three.
      */}
      <Stack.Screen name="public-profile" options={{ headerShown: false }} />
      <Stack.Screen name="contact/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="password" options={{ headerShown: false }} />
      {/*
        The shoot's two screens draw their own headers (2026-08-30), which makes
        three routes in this navigator that do — `index` was the first.

        Neither is expressible through `screenOptions`. The detail screen's
        header carries a subline under the title, a segmented Tabs control below
        it, and a banner that grows the whole block in client view — and the
        content underneath has to be offset by the MEASURED height of all that.
        The edit screen's «Зберегти» changes colour with the form's dirty state,
        which a `headerRight` cannot do without re-declaring the screen's options
        on every keystroke.

        `t.editShootTitle` is no longer used by either — the edit screen writes
        its own «Редагувати» (`t.editTitle`, the handoff's shorter word for a
        centred title).
      */}
      <Stack.Screen name="shoot/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="shoot/[id]/edit" options={{ headerShown: false }} />
      <Stack.Screen
        name="shoot/[id]/references"
        options={{ title: t.allReferencesTitle, headerLargeTitle: false }}
      />
      {/*
        The add-crew screen draws its own header too (2026-08-30) — «Скасувати»
        beside a centred title, with the two CTAs pinned to the bottom instead of
        a right action. Four routes in this navigator now draw their own.
      */}
      <Stack.Screen name="shoot/[id]/crew/add" options={{ headerShown: false }} />
    </Stack>
  )
}
