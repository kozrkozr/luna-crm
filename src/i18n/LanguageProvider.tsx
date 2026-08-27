import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase/client'
import { uk } from './uk'
import { DEFAULT_LANGUAGE, stringsFor, type Language, type Strings } from './index'

type LanguageValue = {
  language: Language
  strings: Strings
  /** `US-015` AC-1 — switch, and remember. False if the choice was not saved. */
  setLanguage: (next: Language) => Promise<boolean>
}

/**
 * Null when no provider is mounted, and that is load-bearing rather than
 * defensive — see `useStrings`.
 */
const LanguageContext = createContext<LanguageValue | null>(null)

/**
 * `US-014` — resolves the UI language for a registered account.
 *
 * Mounted around the `(app)` group only, which is the whole scoping mechanism
 * for `EP-05`:
 *
 *   - **`(app)`** — inside the provider, so the account's preference applies.
 *   - **`(auth)`** — outside it. There is no account yet to have a preference,
 *     and `prd.md` R-10 scopes this to registered accounts.
 *   - **`s/`** — outside it. Link views are Ukrainian-only with no switcher
 *     (`EP-05` Out of scope, owner's answer 2026-08-22). Not "the switcher is
 *     hidden there": there is no language to resolve, so a crew member's or a
 *     client's page cannot render in English however it is reached.
 *
 * Starts at Ukrainian and stays there unless the row says otherwise, so the
 * first paint is never a wrong-language flash. The column defaults to `uk`
 * (initial schema, `US-014`), which means a new account is Ukrainian without
 * anything being written — AC-1's "no saved language preference".
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    let active = true

    void (async () => {
      // RLS restricts this to `auth.uid() = id`, so no filter is needed here
      // and none can be forgotten — the same reason `useProfile` writes none.
      const { data } = await supabase.from('users').select('language').maybeSingle()
      if (!active || !data) return
      // Checked rather than cast: an unexpected value falls back to Ukrainian
      // instead of resolving to an empty dictionary.
      if (data.language === 'uk' || data.language === 'en') setLanguageState(data.language)
    })()

    return () => {
      active = false
    }
  }, [])

  /**
   * `US-015` AC-1 — "all UI text changes to English, and the choice persists
   * the next time they log in". Two separate obligations, so this does two
   * things and only claims success for both.
   *
   * The screen changes first, because a language toggle that waits on a round
   * trip feels broken. But an unsaved choice is not the choice AC-1 describes,
   * so a failed write puts the previous language back rather than leaving the
   * UI showing one thing and the account remembering another.
   *
   * `users.language` is the only column written. That is what makes AC-2 true
   * by construction: nothing in a shoot, a reference or a name is touched, so
   * switching cannot alter data.
   */
  const change = async (next: Language): Promise<boolean> => {
    if (next === language) return true
    const previous = language
    setLanguageState(next)

    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      setLanguageState(previous)
      return false
    }
    // Filtered by id as well as by RLS. The policy already restricts this to
    // the caller's own row; the filter says so at the call site too.
    const { error } = await supabase
      .from('users')
      .update({ language: next })
      .eq('id', auth.user.id)

    if (error) {
      setLanguageState(previous)
      return false
    }
    return true
  }

  return (
    <LanguageContext.Provider
      value={{ language, strings: stringsFor(language), setLanguage: change }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * The strings for the current surface.
 *
 * Falls back to Ukrainian with **no provider mounted**, which is what makes a
 * shared component correct on both surfaces at once: `ImageViewer` renders
 * «Готово» inside a client's link view and follows the account's language on
 * the creator's references screen, without knowing which one it is in.
 */
export function useStrings(): Strings {
  return useContext(LanguageContext)?.strings ?? uk
}

/** The resolved language itself, for the places that need the code and not the copy. */
export function useLanguage(): Language {
  return useContext(LanguageContext)?.language ?? DEFAULT_LANGUAGE
}

/**
 * The switch itself (`US-015`).
 *
 * Returns `null` where no provider is mounted — the auth screens and the link
 * surface — so a switcher cannot be rendered somewhere the choice would have
 * nowhere to persist to.
 */
export function useLanguageSwitch(): LanguageValue | null {
  return useContext(LanguageContext)
}
