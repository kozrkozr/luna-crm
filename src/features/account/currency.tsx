import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getLocales } from 'expo-localization'
import { supabase } from '../../lib/supabase/client'
import { isCurrency, type Currency } from '../shoots/money'

/**
 * `US-047` — the account's currency, read once and shared by every screen
 * that shows money, the way `LanguageProvider` shares the language.
 */
type CurrencyValue = {
  currency: Currency
  /** AC-4 — save a new one. False when the write failed and nothing changed. */
  setCurrency: (next: Currency) => Promise<boolean>
}

const CurrencyContext = createContext<CurrencyValue | null>(null)

/** The 27 EU members, by ISO region code — AC-2's "any other EU country". */
const EU = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
])

/**
 * `US-047` AC-2 — a new account's currency, from the phone's region: Poland
 * PLN, Czechia CZK, the US USD, any other EU country EUR, everywhere else UAH.
 * The region, not the language: an English phone in Warsaw is still paid in
 * złoty.
 */
export function regionCurrency(): Currency {
  const region = getLocales()[0]?.regionCode?.toUpperCase() ?? ''
  if (region === 'PL') return 'PLN'
  if (region === 'CZ') return 'CZK'
  if (region === 'US') return 'USD'
  if (EU.has(region)) return 'EUR'
  return 'UAH'
}

/**
 * Starts at UAH — what every account had before `US-047`, and what the column
 * defaults to — then takes the row's value. A new account's own currency was
 * written at registration, so for most people the two agree.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('UAH')

  useEffect(() => {
    let active = true
    void (async () => {
      // RLS limits this to the caller's own row, as in `LanguageProvider`.
      const { data } = await supabase.from('users').select('currency').maybeSingle()
      if (active && data && isCurrency(data.currency)) setCurrencyState(data.currency)
    })()
    return () => {
      active = false
    }
  }, [])

  /** Shown at once, put back if the write fails — `LanguageProvider`'s rule. */
  const setCurrency = async (next: Currency): Promise<boolean> => {
    if (next === currency) return true
    const previous = currency
    setCurrencyState(next)
    const { data: auth } = await supabase.auth.getUser()
    const { error } = auth.user
      ? await supabase.from('users').update({ currency: next }).eq('id', auth.user.id)
      : { error: true }
    if (error) {
      setCurrencyState(previous)
      return false
    }
    return true
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>
  )
}

/** The account's currency. UAH with no provider mounted — nothing outside the app shows money. */
export function useCurrency(): Currency {
  return useContext(CurrencyContext)?.currency ?? 'UAH'
}

/** The «Валюта» screen's handle on it. Null outside the app. */
export function useCurrencySwitch(): CurrencyValue | null {
  return useContext(CurrencyContext)
}
