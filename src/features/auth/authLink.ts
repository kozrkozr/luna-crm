import { useEffect, useRef, useState } from 'react'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import { useLocalSearchParams } from 'expo-router'
import { Platform } from 'react-native'
import { supabase } from '../../lib/supabase/client'

/**
 * The two emailed links that open the app — recovery (`/reset`) and signup
 * confirmation (`/confirm`, `ADR-019`). Both were one mechanism written twice
 * until the second one arrived; what is here is what `reset.tsx` and
 * `passwordReset.ts` had, measured against a real email on 2026-09-28.
 */

/**
 * Where an emailed link lands.
 *
 * **`Linking.createURL(path)` is wrong on native and fails silently.** Its
 * assembly step is `` `${scheme}:/${hostUri}${path}` ``, and `hostUri` is not
 * empty:
 *
 * - release build → `lunashoots:///reset` — three slashes, not two
 * - dev build → `lunashoots:///192.168.x.x:8081/reset`, carrying Metro's address
 *
 * Neither matches an allow-list entry of `lunashoots://reset`, and **Supabase
 * does not report a rejected `redirect_to`** — it quietly substitutes Site URL.
 * The symptom is a link that opens Safari on the site instead of the app, with
 * nothing anywhere saying why.
 *
 * So native builds the URL itself, and only the web keeps `createURL` — there
 * it correctly yields `https://<origin>/<path>`.
 *
 * The scheme is read from the Expo config rather than typed here, so
 * `app.config.ts` stays the one place it is defined.
 *
 * **Every URL this returns must be allow-listed or Supabase refuses it.**
 * Locally that is `additional_redirect_urls` in supabase/config.toml; on the
 * hosted project it is Authentication → URL Configuration.
 */
export function appRedirectUrl(path: 'reset' | 'confirm'): string {
  if (Platform.OS === 'web') return Linking.createURL(`/${path}`)

  const scheme = Constants.expoConfig?.scheme
  const resolved = Array.isArray(scheme) ? scheme[0] : scheme
  // Falling back to createURL keeps the link working even in a build with no
  // scheme, at the cost of needing the wildcard entry in the allow-list.
  return resolved ? `${resolved}://${path}` : Linking.createURL(`/${path}`)
}

/**
 * Turn the tokens an emailed link carries into a session.
 *
 * The client is created with `detectSessionInUrl: false`
 * (src/lib/supabase/client.ts), so nothing parses the link for us — which is
 * right on native, where there is no URL bar to parse, and means the tokens
 * have to be handed over explicitly here.
 *
 * Supabase sends one of two shapes depending on the project's flow: an implicit
 * link carrying `access_token` + `refresh_token`, or a PKCE link carrying a
 * `token_hash`. Both are handled — the shape is the project's setting, not
 * something this app chooses, and getting it wrong is silent.
 */
export async function establishLinkSession(
  type: 'recovery' | 'email',
  params: { accessToken?: string; refreshToken?: string; tokenHash?: string }
): Promise<boolean> {
  if (params.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: params.tokenHash })
    if (error && __DEV__) console.warn(`[${type}] verifyOtp failed:`, error.code, error.message)
    return !error
  }

  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    })
    if (error && __DEV__) console.warn(`[${type}] setSession failed:`, error.code, error.message)
    return !error
  }

  return false
}

/**
 * Read the link that opened this screen and establish its session.
 *
 * Supabase puts the tokens in the **fragment** for the implicit flow
 * (`#access_token=…&refresh_token=…`) and in the **query** for PKCE
 * (`?token_hash=…`). Expo Router only surfaces the query, so the fragment is
 * read from the raw URL — a fragment is not sent to a server and is invisible to
 * `useLocalSearchParams`, which is exactly why this looks like two mechanisms
 * for one thing.
 */
export function useLinkSession(type: 'recovery' | 'email'): 'checking' | 'ok' | 'invalid' {
  const params = useLocalSearchParams<{ token_hash?: string; access_token?: string }>()
  const [state, setState] = useState<'checking' | 'ok' | 'invalid'>('checking')

  /*
    `useLinkingURL`, and not `getInitialURL` or `useURL` — fixed 2026-09-28
    against a real recovery email.

    `getInitialURL` answers with the link that COLD-STARTED the app, so it works
    only if the app was closed when the reader tapped the link. Tap it with the
    app already open — the normal case — and iOS delivers the URL as an event
    instead: the screen opens, `getInitialURL` returns nothing, and a perfectly
    valid link is reported as invalid.

    `useURL` starts at null and fills in from an event listener it registers on
    mount — but expo-router routes to this screen BECAUSE of that same event, so
    the screen mounts after it has already been dispatched and the listener
    catches nothing. `useLinkingURL` reads the stored linking URL synchronously
    as its initial value, so a link that arrived before this component existed
    is still there to be read.
  */
  const url = Linking.useLinkingURL()
  const attempted = useRef<string | null>(null)

  useEffect(() => {
    const key = url ?? 'none'
    if (attempted.current === key) return

    const fragment = url?.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
    const hash = new URLSearchParams(fragment)
    const tokenHash = params.token_hash
    const accessToken = params.access_token ?? hash.get('access_token') ?? undefined
    const refreshToken = hash.get('refresh_token') ?? undefined

    // Still guarded: null for a render before the URL resolves, and judging the
    // link before it has arrived is the bug above, inverted.
    if (!tokenHash && !accessToken && url === null) return

    // Guarded per URL rather than run once: `verifyOtp` consumes its token, so
    // re-verifying the same link would fail the second time.
    attempted.current = key

    let active = true
    void (async () => {
      const established = await establishLinkSession(type, { tokenHash, accessToken, refreshToken })
      if (active) setState(established ? 'ok' : 'invalid')
    })()
    return () => {
      active = false
    }
  }, [url, params.token_hash, params.access_token, type])

  return state
}
