import { Pressable } from 'react-native'
import { Text } from './ui/text'
import { tapped } from '../lib/haptics'

/**
 * One role in a chip row — `Shoot Detail v3.dc.html`'s add-crew form, and
 * `Contacts.dc.html`'s «Роль на зйомці» (2026-09-04).
 *
 * Extracted from `app/(app)/shoot/[id]/crew/add.tsx` when the contact form
 * needed the same control. The design draws one chip; two copies of it would
 * drift, and the fill-vs-outline pair is the same decision the badges and the
 * CTAs already made.
 *
 * `role="radio"` with `accessibilityState.selected`, because a chip row is a
 * single choice — the profile's nine and this form's are both exclusive.
 */
export function RoleChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`min-h-9 justify-center rounded-lg border px-3 ${
        active ? 'bg-primary border-primary' : 'bg-background border-border active:bg-secondary'
      }`}
      onPress={() => {
        tapped()
        onPress()
      }}
      role="radio"
      accessibilityState={{ selected: active }}
    >
      <Text
        className={`text-body-sm font-medium ${
          active ? 'text-primary-foreground' : 'text-muted-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
