import { Stack } from 'expo-router'
import { LanguageProvider, useStrings } from '../../src/i18n/LanguageProvider'
import { CurrencyProvider } from '../../src/features/account/currency'
import { RequireSession } from '../../src/features/auth/RequireSession'
import { navigationScreenOptions } from '../../src/theme/palette'
import { RemindersHost } from '../../src/features/reminders/RemindersHost'
import { PurchasesHost } from '../../src/features/subscription/PurchasesHost'

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
        {/* `US-047` — the account's currency, beside its language. */}
        <CurrencyProvider>
          <AppStack />
        </CurrencyProvider>
        {/* US-041 — inside the provider, because reminders are worded in the
            account's language (AC-12), and inside the session, because they are
            planned from the creator's shoots. */}
        <RemindersHost />
        {/* S-7 — RevenueCat's customer is the signed-in account. */}
        <PurchasesHost />
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
        The four-tab shell (2026-09-04), and the group every route below is
        pushed ON TOP of. `index` (US-035's home), `shoots` (the calendar) and
        `profile` moved into `app/(app)/(tabs)/`; the bottom bar lives in that
        group's own layout, so a screen declared here covers it by construction
        rather than by remembering to hide it.

        All three draw their own headers, which is why the group takes none:
        home's arrangement (greeting, bell, avatar) is impossible natively
        because iOS centres a native title as soon as a headerLeft exists;
        `Calendar.dc.html` gives `shoots` a meta line under the title
        («Вересень · 6 зйомок») and a «Сьогодні» control on the right; and
        profile's is «Скасувати · Мій профіль · Зберегти».

        US-016 AC-2's route to the profile and US-015's language switcher both
        survive: the profile is now reachable twice over — the avatar on home
        AND the «Профіль» tab — and the switcher lives on the profile screen.
        The tab is the sturdier of the two, but **the avatar is still AC-2's
        stated route**, so it stays.
      */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      {/*
        «Публічний профіль», both readers — the account holder previewing
        themselves and a person from «Мої контакти». Each draws its own header:
        a back control labelled for where it came from, a centred title, and a
        subline under it saying what the reader is looking at. A native header
        holds none of the three.
      */}
      {/*
        «Мої контакти»'s three pushed screens (2026-09-04). The profile draws its
        own header; so do the two form routes, which share one `ContactForm` the
        way `new-shoot` and `shoot/[id]/edit` share `ShootForm`.
      */}
      <Stack.Screen name="contact/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="contact/[id]/edit" options={{ headerShown: false }} />
      <Stack.Screen name="contact/new" options={{ headerShown: false }} />
      {/* Change password draws its own header too — «Скасувати» beside a centred
          title. It is pushed from the profile TAB, so it covers the bottom bar,
          which is right: it is a form with one way out. */}
      <Stack.Screen name="password" options={{ headerShown: false }} />
      {/* US-041's «Сповіщення» — pushed from the profile tab like `password`,
          with its own «‹ Профіль» header from `Notifications.dc.html`. */}
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      {/* US-047's «Валюта» — pushed from the profile like «Сповіщення». */}
      <Stack.Screen name="currency" options={{ headerShown: false }} />
      {/* S-7's throwaway purchase screen — dev builds only. */}
      <Stack.Screen name="spike-s7" options={{ title: 'S-7', headerLargeTitle: false }} />
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
