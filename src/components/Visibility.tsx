import { View } from 'react-native'
import { Text } from './ui/text'

/**
 * The visibility-and-role language: three small components, one file
 * (design system §5.4).
 *
 * They are grouped deliberately. This product is built on who may see what —
 * owner, crew, client — and these three chips are the *only* thing that
 * communicates it. Scattered across screens as ad-hoc markup, adding a fourth
 * access level means hunting them through the codebase; here it means editing
 * one file. `ADR-018` adds exactly that fourth case, which is why this file
 * exists before it is strictly needed.
 *
 * `RoleChip` and `OwnerOnlyTag` use the two token scales that are currently
 * identical and deliberately separate: `client-*` says *who this is*,
 * `private-*` says *who may see it*. They coincide today only because the
 * private data happens to be the client's contacts. Keeping them apart costs
 * nothing now and is the difference between a rename and a rethink later.
 */

/** «Клієнт» — an identity, not a permission. `client-*`. */
export function RoleChip({ label }: { label: string }) {
  return (
    <View className="bg-client-chip shrink-0 rounded-full px-[7px] py-0.5">
      <Text numberOfLines={1} className="text-micro text-client-fg font-bold">
        {label}
      </Text>
    </View>
  )
}

/** «Бачите лише ви» — a visibility level, not an identity. `private-*`. */
export function OwnerOnlyTag({ label }: { label: string }) {
  return (
    <View className="bg-private-bg shrink-0 flex-row items-center gap-1 rounded-full pl-[7px] pr-[9px] py-[3px]">
      {/*
        A lock glyph rather than a lucide icon. The design system specifies
        `lock` at 11px, but lucide-react-native is not yet wired through
        cssInterop on this screen and a Text glyph is honest about that — see
        the pilot's report. Swapping it is one line.
      */}
      <Text className="text-private-fg text-[11px] font-bold">🔒</Text>
      <Text numberOfLines={1} className="text-caption text-private-fg font-bold">
        {label}
      </Text>
    </View>
  )
}

/**
 * «Бачить лише команда, клієнт не бачить» — a sentence, not a chip.
 *
 * Sits under a heading to explain a section's audience. The design system's
 * spec corrects the mockup's `#8A8A8E` to `#6E6E73` here: at 13px on white the
 * former is 3.44:1 and fails AA, which is why `ink-muted` is used and
 * `ink-icon` is not.
 */
export function VisibilityNote({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Text className="text-ink-icon text-[13px]">👁</Text>
      <Text className="text-label text-ink-muted flex-1">{label}</Text>
    </View>
  )
}
