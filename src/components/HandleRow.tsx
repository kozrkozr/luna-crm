import type { LucideIcon } from 'lucide-react-native'
import { Pressable, View } from 'react-native'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { openExternalUrl } from '../lib/openExternalUrl'

/**
 * A social handle as one row: glyph, label, and the handle on the right, with
 * the whole row as the tap target.
 *
 * Extracted from `app/s/[token]/index.tsx`'s `ClientHandleRow` on 2026-09-06,
 * when the owner asked a crew member's Instagram to be shown the way the
 * client's already was. It had been a stacked `Field` — label above, value
 * below — and the two surfaces disagreed about the same kind of fact.
 *
 * ── Why the row is the target, not the handle ───────────────────────────────
 *
 * A handle is short: «@ok» is a 30pt tap on a 44pt-minimum screen. Making the
 * row the target gives it the full width and the full height, which is what the
 * client's version has always done.
 *
 * `url` is nullable because `handleUrl` returns null for anything that is not a
 * handle or a URL — a creator can type «пише в дірект» into that field. Then the
 * row renders as a plain `View` and the value takes `--foreground` rather than
 * `--link`: blue is what tappable looks like here, so a dead value must not
 * borrow it.
 *
 * ── Hidden when empty, which `Field` is not ─────────────────────────────────
 *
 * Callers render this only when there is a handle. `Field` shows «—» for an
 * absent value, which is right on a form read back but wrong here: a crew
 * member without Instagram should have no Instagram row, not an empty one. That
 * difference is the second half of what the owner asked for.
 */
export function HandleRow({
  icon,
  label,
  value,
  url,
  className,
}: {
  /** The service's glyph — `InstagramIcon`, `Send` for Telegram, and so on. */
  icon: LucideIcon
  label: string
  value: string
  url: string | null
  /**
   * Horizontal padding, which depends on the card around it: a `p-0` card wants
   * `px-4`, a padded one wants negative margins so the rule still reaches both
   * edges. Left to the caller rather than guessed at.
   */
  className?: string
}) {
  const body = (
    <>
      <View className="w-[18px] shrink-0 items-center">
        <Icon as={icon} size={16} className="text-muted-foreground" />
      </View>
      <Text className="text-body-sm text-muted-foreground flex-1">{label}</Text>
      <Text className={`text-body-sm font-medium ${url ? 'text-link' : 'text-foreground'}`}>
        {value}
      </Text>
    </>
  )
  const rowClass = `border-border flex-row items-center gap-2.5 border-t py-3 ${className ?? ''}`

  return url ? (
    <Pressable
      className={`${rowClass} active:opacity-70`}
      onPress={() => void openExternalUrl(url)}
      role="link"
      accessibilityLabel={`${label}: ${value}`}
    >
      {body}
    </Pressable>
  ) : (
    <View className={rowClass}>{body}</View>
  )
}
