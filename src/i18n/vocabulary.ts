import { uk } from './uk'
import { en } from './en'
import type { Strings } from './index'

/**
 * `US-044` — the values the app stores for a crew role and a reference
 * category, and how each is shown.
 *
 * ── Keys in the database, words on the screen ───────────────────────────────
 *
 * Both used to be stored as the Ukrainian text the picker showed — «Фотограф»,
 * «Світло». That held while the app had one language for data (`US-015` AC-2
 * kept roles untranslated for exactly that reason). `ADR-022` made a link view
 * follow its reader and the app follow the phone, so one row is now read in two
 * languages: a reference filed under «Світло» had to be under «Light» too, and a
 * client's English page could not show «Фотограф» from the database.
 *
 * So the column holds a key — `photographer`, `light` — and every surface turns
 * it into its own language at render. `20261006140000_role_and_category_keys.sql`
 * rewrote the existing rows.
 *
 * ── Labels are still accepted on the way in ─────────────────────────────────
 *
 * `roleKeyOf` and `categoryKeyOf` read a Ukrainian or an English label as its
 * key. A build from before this story — the TestFlight beta — still writes
 * «Фотограф», and the migration's trigger converts it; this is the second guard,
 * for a value that reaches a screen some other way. Anything that is neither a
 * key nor a label is a role typed into «Інша роль» and is shown as typed.
 */

/** The nine roles, in picker order — `Edit Profile.dc.html`'s list (owner, 2026-09-03). */
export const ROLE_KEYS = [
  'photographer',
  'videographer',
  'stylist',
  'hair_stylist',
  'makeup_artist',
  'gaffer',
  'model',
  'assistant',
  'producer',
] as const

export type RoleKey = (typeof ROLE_KEYS)[number]

/** The three reference groups, in chip order (`US-032`). */
export const CATEGORY_KEYS = ['light', 'poses', 'style'] as const

export type CategoryKey = (typeof CATEGORY_KEYS)[number]

/**
 * The picker's «Інша роль» option. Never stored: choosing it reveals a text
 * field, and what is typed there is the value. A sentinel rather than the
 * dictionary's «Інша роль», because the picker's options are now keys and the
 * label differs per language.
 */
export const OTHER_ROLE = '__other__'

/**
 * The glyph beside a role (owner, 2026-09-05) — on every surface that shows
 * one. Display only: nothing here is stored or compared.
 *
 * «Hair стиліст» is a ZWJ sequence (fairy + ZWJ + male sign + VS16). It renders
 * on iOS; older Android and some web fonts show two glyphs side by side.
 */
const ROLE_EMOJI: Record<RoleKey, string> = {
  photographer: '📸',
  videographer: '🎥',
  stylist: '👠',
  hair_stylist: '🧚‍♂️',
  makeup_artist: '💄',
  gaffer: '💡',
  model: '💃',
  assistant: '🌟',
  producer: '🎬',
}

const OTHER_ROLE_EMOJI = '🪄'

/** Every label each key has ever been stored as, in both languages. */
function byLabel<K extends string>(keys: readonly K[], ...lists: (readonly string[])[]) {
  const map = new Map<string, K>()
  for (const list of lists) list.forEach((label, index) => map.set(label, keys[index]))
  return map
}

const ROLE_BY_LABEL = byLabel(ROLE_KEYS, uk.roleNames, en.roleNames)
const CATEGORY_BY_LABEL = byLabel(CATEGORY_KEYS, uk.referenceCategories, en.referenceCategories)

/** The key a stored role stands for, or null for a role typed by hand. */
export function roleKeyOf(stored: string | null | undefined): RoleKey | null {
  if (!stored) return null
  if ((ROLE_KEYS as readonly string[]).includes(stored)) return stored as RoleKey
  return ROLE_BY_LABEL.get(stored) ?? null
}

/** A stored role in `t`'s language — or, typed by hand, as typed. */
export function roleLabel(stored: string, t: Strings): string {
  const key = roleKeyOf(stored)
  return key ? t.roleNames[ROLE_KEYS.indexOf(key)] : stored
}

/**
 * «📸 Фотограф» — a role as it is SHOWN, glyph and all. Takes a stored value or
 * `OTHER_ROLE`; a typed role comes back without a glyph rather than
 * blank-prefixed.
 */
export function roleWithEmoji(stored: string, t: Strings): string {
  if (stored === OTHER_ROLE) return `${OTHER_ROLE_EMOJI} ${t.otherRole}`
  const key = roleKeyOf(stored)
  return key ? `${ROLE_EMOJI[key]} ${t.roleNames[ROLE_KEYS.indexOf(key)]}` : stored
}

/** The key a stored category stands for, or null when there is none. */
export function categoryKeyOf(stored: string | null | undefined): CategoryKey | null {
  if (!stored) return null
  if ((CATEGORY_KEYS as readonly string[]).includes(stored)) return stored as CategoryKey
  return CATEGORY_BY_LABEL.get(stored) ?? null
}

/** A stored category in `t`'s language; an unknown one as stored. */
export function categoryLabel(stored: string, t: Strings): string {
  const key = categoryKeyOf(stored)
  return key ? t.referenceCategories[CATEGORY_KEYS.indexOf(key)] : stored
}
