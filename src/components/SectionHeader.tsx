import { View } from 'react-native'
import { Text } from './ui/text'

/**
 * A section heading on the dark frame (design system §6.1).
 *
 * A section heading with the count beside it.
 *
 * The colour is stated rather than inherited, and that is deliberate: this
 * component was written because the source mockups' own headings inherited a
 * dark colour onto a dark background and were invisible at 1.04:1. The design
 * system is gone; the lesson is cheap to keep.
 */
export function SectionHeader({
  label,
  count,
  note,
}: {
  label: string
  count?: number
  /**
   * A phrase in the count's place — «3 учасники» — where `count` renders a bare
   * number. The Figma shoot-detail frame writes it out in words beside the
   * heading; the link views keep the number. Whichever is passed, only one
   * renders: `note` wins, because a caller that supplies it has said what it
   * wants the number to read as.
   */
  note?: string
}) {
  return (
    <View className="mb-3 mt-6 flex-row items-baseline justify-between px-0.5">
      <Text className="text-subtitle text-foreground font-semibold">{label}</Text>
      {note !== undefined || count !== undefined ? (
        <Text className="text-label text-muted-foreground">{note ?? String(count)}</Text>
      ) : null}
    </View>
  )
}
