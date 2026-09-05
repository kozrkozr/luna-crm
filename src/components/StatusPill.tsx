import { View } from 'react-native'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import type { ShootStatus } from '../features/shoots/api'

/**
 * A shoot's status (`US-020`), as a badge.
 *
 * **Coloured again since 2026-09-04**, from the design handoff's badge table:
 *
 * - `new` («Запланована») — `bg-info-bg text-info border border-info-border`,
 *   a blue outlined chip.
 * - `finished` («Завершена») — `bg-danger-bg text-danger-soft border
 *   border-danger-border`, a red outlined chip.
 *
 * This ends the monochrome arrangement of 2026-08-30, where the pair was told
 * apart by fill vs outline and the word alone. Hue is a third channel again,
 * and a status is identifiable across a list without being read — which is what
 * that pass gave up and recorded as its cost.
 *
 * **`--danger-*` is not `--destructive`.** A finished shoot is a state that has
 * ended, not an action that destroys something; the handoff gives the two
 * separate scales and this file must not reach for `destructive`. See
 * src/theme/global.css.
 *
 * Both chips are now full pills — "баджі в цьому дизайні — таблетки" — which
 * reverses the 2026-09-03 move to `rounded-md`. `Badge` changed with it, so the
 * two still agree.
 *
 * The tokens are named for `ShootStatus` (`new` | `finished`) so this file stays
 * greppable against the backlog (CLAUDE.md rule 5).
 */
const TONE: Record<ShootStatus, string> = {
  new: 'bg-info-bg border-info-border border',
  finished: 'bg-danger-bg border-danger-border border',
}

const TONE_TEXT: Record<ShootStatus, string> = {
  new: 'text-info',
  finished: 'text-danger-soft',
}

export function StatusPill({ value }: { value: ShootStatus }) {
  const t = useStrings()
  // Built here, not at module scope. The previous version read the dictionary
  // once when the module was imported, so it would have kept the language the
  // app started in for the rest of the session.
  const LABEL: Record<ShootStatus, string> = {
    new: t.statusNew,
    finished: t.statusFinished,
  }

  return (
    // shrink-0 and numberOfLines: «Запланована» is 11 characters and sits
    // beside a name on a card. Without both, either the pill squeezes the name
    // or it wraps onto two lines (§5.3).
    //
    // **A pill again** (2026-09-04 handoff, step 3), reversing the 2026-09-03
    // move to radius 6 that matched `Calendar.dc.html`.
    //
    // `px-2 py-1` and `font-medium` — `4px 8px` at 11px/500, which is what both
    // artboards specify (`Home.dc.html`'s upcoming chip inline, the shoot-detail
    // handoff as "badge 11/500"). The padding had been `py-[3px]` and the weight
    // 600, neither traceable to a source.
    <View className={`shrink-0 rounded-full px-2 py-1 ${TONE[value]}`}>
      <Text
        numberOfLines={1}
        className={`text-caption font-medium ${TONE_TEXT[value]}`}
      >
        {LABEL[value]}
      </Text>
    </View>
  )
}
