import { uk } from './uk'

/**
 * The two UI languages, and the only two (`EP-05`, Out of scope). Russian is a
 * deliberate exclusion, not an omission — CLAUDE.md rule 4.
 *
 * These are the values of the `ui_language` enum the schema already defines, so
 * a preference read from the database is one of these by construction.
 */
export type Language = 'uk' | 'en'

/**
 * Every UI string, shaped by the Ukrainian dictionary.
 *
 * Typing English as `typeof uk` rather than the two independently is what makes
 * a missing translation a compile error instead of a blank label. `US-014` AC-2
 * asks that "no text is left untranslated"; this is where that is enforced.
 */
export type Strings = typeof uk

/**
 * `US-014` AC-1 — Ukrainian unless an account says otherwise.
 *
 * AC-2 is the sharper half: the device locale must NOT override this. So
 * nothing here reads `expo-localization`, `navigator.language` or
 * `Intl.DateTimeFormat().resolvedOptions()`, and nothing should be added that
 * does. A photographer on a phone set to German gets Ukrainian, which is the
 * stated requirement and also the only sane default for a product whose other
 * two audiences are Ukrainian-only.
 */
export const DEFAULT_LANGUAGE: Language = 'uk'

/**
 * `en` arrives with `US-015`. Until then the map has one entry and every
 * language resolves to Ukrainian, which is precisely what `US-014` describes.
 */
const dictionaries: Partial<Record<Language, Strings>> = { uk }

export function stringsFor(language: Language): Strings {
  return dictionaries[language] ?? uk
}
