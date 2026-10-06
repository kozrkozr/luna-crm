import { uk } from './uk'
import { en } from './en'

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
 * Shaped from the Ukrainian dictionary rather than declared twice, so a key
 * added to one and forgotten in the other is a compile error instead of a blank
 * label. `US-014` AC-2 asks that "no text is left untranslated"; this is where
 * that is enforced.
 *
 * The literal types `as const` gives `uk` are widened back to `string` here.
 * Without that, `Strings` would demand the exact Ukrainian text — English would
 * not typecheck against its own type.
 */
export type Strings = {
  readonly [K in keyof typeof uk]: (typeof uk)[K] extends readonly string[]
    ? readonly string[]
    : string
}

/**
 * The language of a surface with nothing else to go on — a link view (until
 * `US-046`), and anything rendered with no provider mounted.
 *
 * It used to be every account's default too (`US-014` AC-1), and the device
 * locale was deliberately ignored (AC-2). `US-045` (`ADR-022`) reversed that for
 * the app: a new install and a new account follow the phone — see
 * `./device.ts`. Accounts from before keep the language they have.
 */
export const DEFAULT_LANGUAGE: Language = 'uk'

/** `US-015` added `en`. Both languages resolve; nothing else does. */
const dictionaries: Record<Language, Strings> = { uk, en }

export function stringsFor(language: Language): Strings {
  return dictionaries[language] ?? uk
}
