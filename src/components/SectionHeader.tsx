import { View } from 'react-native'
import { Text } from './ui/text'

/**
 * A section heading on the dark frame (design system §6.1).
 *
 * This component exists because of a defect in the source mockups, and the
 * defect is worth remembering: `.section h2` had no colour of its own and
 * inherited `#111111` from `body`, on a `#151517` background — a contrast ratio
 * of **1.04:1**. Every section heading on every screen was invisible. It is the
 * first of the five things the design system's §2 warns will look fine in a
 * browser and be broken on a phone.
 *
 * So the colour here is not a translation of the mockup; it is the correction.
 * Hard-coding `text-onDark` rather than inheriting is the whole point.
 *
 * The trailing count is the design's own pattern («Команда: 3»), muted and
 * smaller than the label.
 */
export function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <View className="mb-3 mt-6 flex-row items-baseline justify-between px-0.5">
      <Text className="text-subtitle text-onDark font-semibold">{label}</Text>
      {count !== undefined ? (
        <Text className="text-label text-onDark-muted">{String(count)}</Text>
      ) : null}
    </View>
  )
}
