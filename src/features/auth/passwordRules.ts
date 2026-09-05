/**
 * What makes a new password acceptable, and how strong it reads.
 *
 * `Edit Profile.dc.html`'s «Зміна пароля» layer (owner, 2026-09-05) — the four
 * rules, the bonus and the five-step scale are that artboard's own
 * `passwordVals()`, taken as written.
 *
 * Pure and free of i18n on purpose: it returns rule KEYS, and the screen looks
 * up the words. That keeps the scoring testable, keeps `uk.ts` the one place
 * copy lives, and means the English dictionary cannot drift into changing what
 * counts as a valid password.
 *
 * ── This is stricter than registration, and that is worth knowing ───────────
 *
 * `MIN_PASSWORD_LENGTH` is 6, `supabase/config.toml` sets
 * `minimum_password_length = 6`, and this screen demands 8. So an account can
 * be created with a password this screen would refuse to set.
 *
 * Stricter on the client than on the server is the safe direction, and the
 * artboard is explicit about the four rules. But it is the mirror of
 * redesign-log **A-5**, which deleted `registerPasswordPlaceholder` in
 * 2026-08-31 precisely because it "promised 8 characters where the backend
 * takes 6". The promise is real this time — the screen enforces it — yet the
 * two surfaces now disagree about what a good password is. **Raised for the
 * owner**, in docs/redesign-log.md: either registration rises to 8 (a change to
 * `US-001`, the config and the existing meter) or this stays a local rule.
 */

/** The artboard's `next.length >= 8`. Deliberately not `MIN_PASSWORD_LENGTH`. */
export const NEW_PASSWORD_MIN_LENGTH = 8

/**
 * Rule identities. The screen maps these to `uk.ts`; nothing here is displayed.
 *
 * Named for what they require rather than numbered, so a rule can be reordered
 * in the design without silently renaming what a stored translation refers to.
 */
export type PasswordRuleKey = 'length' | 'mixedCase' | 'digit' | 'different'

export type PasswordRule = { key: PasswordRuleKey; ok: boolean }

/**
 * Ukrainian letters outside the `а-я` / `А-Я` ranges.
 *
 * `а-я` covers the Cyrillic block but omits ґ, є, і and ї, which is why the
 * artboard lists them explicitly in its own case test. Kept as one constant so
 * the case rule and the symbol rule cannot disagree about what a letter is.
 */
const UK_LOWER = 'ґєії'
const UK_UPPER = 'ҐЄІЇ'

const LOWER = new RegExp(`[a-zа-я${UK_LOWER}]`)
const UPPER = new RegExp(`[A-ZА-Я${UK_UPPER}]`)
const DIGIT = /\d/

/**
 * A character that is neither a letter nor a digit — the strength bonus.
 *
 * **The artboard's own class is `[^A-Za-zА-Яа-я0-9]`, and this one adds the
 * four Ukrainian letters to it.** That is a deliberate one-character departure:
 * without them, «ґ» counts as a symbol, so «паляницяґ12345» would score a bonus
 * it has not earned. It affects the label only — never whether a password is
 * accepted — which is why it is corrected here rather than raised as a
 * question.
 */
const SYMBOL = new RegExp(`[^A-Za-zА-Яа-я${UK_LOWER}${UK_UPPER}0-9]`)

/** Length at which a long password earns its bonus, per the artboard. */
const BONUS_LENGTH = 12

/**
 * The four rules, in the order the artboard draws them.
 *
 * `different` is false for an empty password rather than true: nothing is
 * "different from the current one" before anything has been typed, and a rule
 * that starts satisfied would tick itself on an untouched form.
 */
export function passwordRules(next: string, current: string): PasswordRule[] {
  return [
    { key: 'length', ok: next.length >= NEW_PASSWORD_MIN_LENGTH },
    { key: 'mixedCase', ok: LOWER.test(next) && UPPER.test(next) },
    { key: 'digit', ok: DIGIT.test(next) },
    { key: 'different', ok: next.length > 0 && next !== current },
  ]
}

/**
 * 0–4: how many bars are lit.
 *
 * Four rules plus one bonus, capped at four — so a password can reach the top
 * step either by satisfying everything and being long and symbolic, or by
 * satisfying everything and being merely long enough. An empty field scores 0
 * whatever the rules say, because an unstarted password is not "weak", it is
 * absent, and the artboard draws no label for it.
 */
export function passwordScore(next: string, rules: PasswordRule[]): 0 | 1 | 2 | 3 | 4 {
  if (!next) return 0
  const passed = rules.filter((rule) => rule.ok).length
  const bonus = next.length >= BONUS_LENGTH && SYMBOL.test(next) ? 1 : 0
  return Math.min(4, passed + bonus) as 0 | 1 | 2 | 3 | 4
}

/**
 * Everything the submit button needs: all four rules, a current password, and
 * a repeat that matches.
 *
 * The repeat is checked here rather than in `passwordRules` because it is not a
 * property of the new password — it is a property of the form, and the artboard
 * draws it as an error on its own row rather than as a fifth rule.
 */
export function canChangePassword(input: {
  current: string
  next: string
  repeat: string
}): boolean {
  return (
    input.current.length > 0 &&
    passwordRules(input.next, input.current).every((rule) => rule.ok) &&
    input.repeat === input.next
  )
}
