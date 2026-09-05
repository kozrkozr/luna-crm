import { View } from 'react-native'
import Check from 'lucide-react-native/icons/check'
import { Icon } from '../../components/ui/icon'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { passwordRules, passwordScore, type PasswordRuleKey } from './passwordRules'

/**
 * Four bars, a word, and the four rules ticking themselves off as they pass.
 *
 * `Edit Profile.dc.html`'s «Зміна пароля» layer (owner, 2026-09-05).
 *
 * **This is not the meter `AuthScreen` draws, and the two now differ.** That
 * one has three bars, three words («Слабкий / Нормальний / Надійний») and two
 * hues, built when the theme was monochrome and its own note records the
 * compromise: "strength reads as HOW MANY bars are lit". This artboard gives
 * four bars, five steps and a colour per step, plus the rule list that makes a
 * score explicable rather than mysterious.
 *
 * Not unified, deliberately: `Auth.dc.html` has not been re-read against this,
 * and quietly changing what registration calls a strong password is a design
 * decision rather than a refactor. Written as a component with no screen of its
 * own so aligning them later is an import. **Raised in docs/redesign-log.md.**
 *
 * The colours are the artboard's own tokens, and every one already exists in
 * the theme: `--danger` and `--danger-soft`, `--warn`, `--link`, `--success`.
 * `--warn` survives here even though the amber badge scale that introduced it
 * was retired — a middle step on a meter is exactly what an amber is for.
 */
const STEP = [
  // 0 — nothing typed. No word, and the bars stay at the track colour.
  { label: null, text: '', bar: 'bg-border' },
  { label: 'strengthWeak', text: 'text-danger-soft', bar: 'bg-destructive' },
  { label: 'strengthMedium', text: 'text-warn', bar: 'bg-warn' },
  { label: 'strengthGood', text: 'text-link', bar: 'bg-link' },
  { label: 'strengthStrong', text: 'text-success', bar: 'bg-success' },
] as const

/** Rule key → the copy that describes it. The rules themselves hold no words. */
const RULE_LABEL: Record<PasswordRuleKey, 'passwordRuleLength' | 'passwordRuleMixedCase' | 'passwordRuleDigit' | 'passwordRuleDifferent'> = {
  length: 'passwordRuleLength',
  mixedCase: 'passwordRuleMixedCase',
  digit: 'passwordRuleDigit',
  different: 'passwordRuleDifferent',
}

export function PasswordStrength({
  password,
  current,
}: {
  password: string
  /** The current password — `different` is a rule about the pair. */
  current: string
}) {
  const t = useStrings()
  const rules = passwordRules(password, current)
  const score = passwordScore(password, rules)
  const step = STEP[score]

  return (
    <View>
      {/* The meter: four bars that fill, and the word on the right. The label
          column is fixed at 64 and right-aligned so the bars do not resize as
          the word changes length — the artboard's `min-width:64px`. */}
      <View className="mt-3 flex-row items-center gap-2.5 px-0.5">
        <View className="flex-1 flex-row" style={{ gap: 4 }}>
          {[1, 2, 3, 4].map((bar) => (
            <View
              key={bar}
              className={`h-1 flex-1 rounded-full ${score >= bar ? step.bar : 'bg-border'}`}
            />
          ))}
        </View>
        <Text
          className={`text-caption shrink-0 text-right font-semibold ${step.text}`}
          style={{ minWidth: 64 }}
        >
          {step.label ? t[step.label] : ''}
        </Text>
      </View>

      {/* The rules. Always all four, always in order — a list that appeared and
          disappeared as rules passed would move the button under the reader's
          thumb. Only the tick and the ink change. */}
      <View className="mt-3 gap-[7px] px-0.5">
        {rules.map((rule) => (
          <View key={rule.key} className="flex-row items-center gap-2">
            <View
              className={`h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                rule.ok ? 'border-success bg-success' : 'border-border-strong'
              }`}
            >
              {/* Drawn only when passed. The artboard renders the tick always
                  and paints it transparent; an absent icon is the same picture
                  and one less thing on screen for a reader to be told about. */}
              {rule.ok ? (
                <Icon
                  as={Check}
                  size={9}
                  strokeWidth={3.4}
                  className="text-success-foreground"
                />
              ) : null}
            </View>
            <Text
              className={`text-label ${rule.ok ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {t[RULE_LABEL[rule.key]]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
