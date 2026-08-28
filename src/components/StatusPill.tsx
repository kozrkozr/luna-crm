import { View } from 'react-native'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import type { ShootStatus } from '../features/shoots/api'

/**
 * Status colour is named by token, never by value — src/theme/global.css is the
 * only place the values live (ADR-017).
 *
 * The tokens are named for `ShootStatus` rather than for the design document's
 * planned/progress/done, so this file stays greppable against the backlog
 * (CLAUDE.md rule 5). `new` takes the document's blue, `finished` its pink;
 * its green is unused, because the enum has two members.
 *
 * No border. The pill was bordered under the previous palette because its fill
 * barely separated from the card; the design system's §5.3 specifies fill and
 * text only, and these fills carry 4.75–5.59 against their own text.
 */
const TONE: Record<ShootStatus, string> = {
  new: 'bg-status-new-bg',
  finished: 'bg-status-finished-bg',
}

const TONE_TEXT: Record<ShootStatus, string> = {
  new: 'text-status-new-fg',
  finished: 'text-status-finished-fg',
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
    // shrink-0 and numberOfLines: «Заплановано» is 11 characters and sits
    // beside a name on a card. Without both, either the pill squeezes the name
    // or it wraps onto two lines (§5.3).
    <View className={`shrink-0 rounded-full px-2.5 py-1 ${TONE[value]}`}>
      <Text numberOfLines={1} className={`text-caption font-bold ${TONE_TEXT[value]}`}>
        {LABEL[value]}
      </Text>
    </View>
  )
}
