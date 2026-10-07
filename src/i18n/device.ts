import { getLocales } from 'expo-localization'
import { getExampleNumber, isSupportedCountry } from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'
import type { Language } from './index'

/**
 * `US-045` AC-1 — the language the phone asks for, as one of the app's two.
 *
 * The phone's FIRST preferred language decides: Ukrainian or Russian →
 * Ukrainian; anything else → English (`ADR-022` decision 3). Russian maps to
 * Ukrainian rather than to English because a phone set to Russian is, for this
 * product, almost always a Ukrainian photographer's — and Russian itself is
 * never offered (`EP-05`, CLAUDE.md rule 4).
 *
 * Only the first entry: a phone whose list is «English, Українська» asked for
 * English first, and that is the answer.
 *
 * `getLocales` reads `Locale.preferredLanguages` on iOS and
 * `navigator.languages` on the web, so the same rule serves a link view's
 * browser too (`US-046`). It never throws and always returns at least one
 * entry; the fallback is for a code it cannot resolve.
 */
export function phoneLanguage(): Language {
  const code = getLocales()[0]?.languageCode?.toLowerCase()
  return code === 'uk' || code === 'ru' ? 'uk' : 'en'
}

/**
 * `US-049` AC-3 — the placeholder of every phone field: an example mobile
 * number of the region set on the phone, not of the app's language — a
 * Ukrainian-language app on a phone set to Poland shows `+48 512 345 678`.
 * An unknown region, or one without an example, gets the Ukrainian number.
 */
export function phoneExample(): string {
  const region = getLocales()[0]?.regionCode?.toUpperCase() ?? ''
  const example =
    (isSupportedCountry(region) && getExampleNumber(region, examples)) ||
    getExampleNumber('UA', examples)
  return example?.formatInternational() ?? ''
}
