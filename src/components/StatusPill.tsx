import { View } from 'react-native'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import type { ShootStatus } from '../features/shoots/api'

/**
 * A shoot's status (`US-020`), as a badge.
 *
 * **Monochrome since 2026-08-30** (owner). The two statuses used to be a blue
 * and a pink triple from `design-guidelines.md` §3.1; the shoot-detail handoff
 * is built on the shadcn dark zinc scale and rules out coloured status tints
 * outright, and the owner took that app-wide. Both tokens are gone from
 * src/theme/global.css.
 *
 * So the pair is now **fill vs outline** rather than hue vs hue:
 *
 * - `new` — a solid `secondary` chip, which is what the handoff draws for the
 *   shoot card's status badge (bg `#27272a`, text `#fafafa`).
 * - `finished` — outlined on `border-strong`, the same treatment the handoff
 *   gives every "not the active state" badge (see `ResponsePill`'s «Очікує»).
 *
 * **What this costs, stated once:** a status is no longer identifiable at a
 * glance across a list — it has to be read. Two channels remain (the fill and
 * the word) where there were three. `docs/redesign-log.md` records it.
 *
 * `onLight` is gone (2026-08-30). It swapped the pair for a light surface, and
 * the home screen's white next-shoot card was its only caller ever — that card
 * is dark and bordered now, so there is no light surface left in the app for a
 * pill to sit on.
 *
 * The tokens are named for `ShootStatus` (`new` | `finished`) so this file stays
 * greppable against the backlog (CLAUDE.md rule 5).
 */
const TONE: Record<ShootStatus, string> = {
  new: 'bg-secondary',
  finished: 'border-border-strong border',
}

const TONE_TEXT: Record<ShootStatus, string> = {
  new: 'text-secondary-foreground',
  finished: 'text-muted-foreground',
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
    //
    // **Radius 6, not a pill** (owner, 2026-09-03). `Calendar.dc.html` draws
    // every status badge as a `4px 8px` rounded rect, which is what `Badge`
    // already renders — so the two agree now instead of this being the one
    // remaining pill-shaped chip. It restyles the shoot-detail badge too; that
    // frame has not been re-diffed.
    <View className={`shrink-0 rounded-md px-2 py-[3px] ${TONE[value]}`}>
      <Text
        numberOfLines={1}
        className={`text-caption font-semibold ${TONE_TEXT[value]}`}
      >
        {LABEL[value]}
      </Text>
    </View>
  )
}
