// Deep per-icon import — see the note in src/components/ui/select.tsx.
import Eye from 'lucide-react-native/icons/eye'
import { Icon } from './ui/icon'
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
 * `RoleChip` and `OwnerOnlyTag` had their own colour scales — a purple axis
 * where `client-*` meant *who this is* and `private-*` meant *who may see it*.
 * Both went with ADR-017's palette on 2026-08-29, so the three now share the
 * stock `secondary` surface and are distinguished by their words alone. **That
 * is a real loss:** access level was the one thing this product colour-coded,
 * and nothing replaces it.
 */

/** «Клієнт» — an identity, not a permission. */
export function RoleChip({ label }: { label: string }) {
  return (
    <View className="bg-secondary shrink-0 rounded-full px-[7px] py-0.5">
      <Text numberOfLines={1} className="text-micro text-secondary-foreground font-bold">
        {label}
      </Text>
    </View>
  )
}

/** «Бачите лише ви» — a visibility level, not an identity. */
export function OwnerOnlyTag({ label }: { label: string }) {
  return (
    <View className="bg-secondary shrink-0 flex-row items-center gap-1 rounded-full pl-[7px] pr-[9px] py-[3px]">
      {/*
        A lock glyph rather than a lucide icon. The design system specifies
        `lock` at 11px, but lucide-react-native is not yet wired through
        cssInterop on this screen and a Text glyph is honest about that — see
        the pilot's report. Swapping it is one line.
      */}
      <Text className="text-secondary-foreground text-[11px] font-bold">🔒</Text>
      <Text numberOfLines={1} className="text-caption text-secondary-foreground font-bold">
        {label}
      </Text>
    </View>
  )
}

/**
 * Who can read the field above — a sentence in a quiet box, not a chip.
 *
 * **Boxed since 2026-09-03.** `Shoot Detail v3`'s crew form draws this as
 * `7px 9px` on `#18181b` inside `#27272a`.
 *
 * Its three callers are all `crewNotesPrivate` — the add-crew form, the contact
 * form, and a contact's profile. **The shoot's own note no longer carries any
 * visibility marker at all**: «Клієнт не бачить» was this box, then an outline
 * `Badge`, and on 2026-09-06 the owner removed it from all three of its
 * surfaces. `clientCannotSee` is gone from both dictionaries with it.
 *
 * So this component is now only ever about a CREW MEMBER's note, which is the
 * one `ADR-013` exists for — not about `shoots.notes`, which is the one it
 * used to explain here.
 *
 * `items-start`, not centred: two lines of text should begin level with the
 * eye rather than straddle it.
 */
export function VisibilityNote({ label }: { label: string }) {
  return (
    <View className="bg-secondary border-border flex-row items-start gap-[7px] rounded-md border px-2.5 py-[7px]">
      {/*
        The frame's 13px stroked eye (node 1:26), not the 👁 emoji this drew. The
        note above about lucide not being wired through cssInterop is out of
        date: `Icon` does exactly that, and an emoji could never take the muted
        tone of the sentence beside it.
      */}
      <View className="mt-px shrink-0">
        <Icon as={Eye} size={13} strokeWidth={1.7} className="text-muted-foreground" />
      </View>
      <Text className="text-caption text-muted-foreground flex-1 leading-4">{label}</Text>
    </View>
  )
}
