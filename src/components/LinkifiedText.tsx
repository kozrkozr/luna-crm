import { Text } from './ui/text'
import { splitLinks } from '../lib/linkify'
import { openExternalUrl } from '../lib/openExternalUrl'

/**
 * Prose with its URLs made tappable — the location's «Адреса» and «Деталі»
 * (owner, 2026-09-06), on the creator's screen and on both link views.
 *
 * ── A nested `Text`, never a `Pressable` ────────────────────────────────────
 *
 * The link sits INSIDE a sentence, so it has to be part of the same text run:
 * a `Pressable` is a view, and wrapping one around a word would take that word
 * out of the paragraph's line-breaking and drop it onto its own line. RN gives
 * a nested `<Text onPress>` for exactly this, and it works on the static web
 * export too, which matters — see `openExternalUrl`.
 *
 * That is also why `Field` on the crew page does NOT use this. There the whole
 * value is one handle, nothing wraps around it, and the established treatment
 * is a `Pressable` with `group-active:underline`. Two shapes because there are
 * two situations, not by accident.
 *
 * ── The colour ──────────────────────────────────────────────────────────────
 *
 * `text-link` (#6FA2FF), the theme's own — already the bottom nav's active tab,
 * `Button`'s `link` variant, and the Instagram row on a crew member's page
 * (owner, 2026-09-05). Nothing else about the surrounding text changes: the
 * caller's `className` still sets the size, weight and tone of the prose, and
 * only the link run overrides the colour.
 *
 * ── When there is no link ───────────────────────────────────────────────────
 *
 * It renders the string in one `Text`, identical to what the caller had before.
 * Every one of these four fields is ordinary prose the overwhelming majority of
 * the time, so the common case costs one regex test and nothing else.
 */
export function LinkifiedText({
  children,
  className,
  numberOfLines,
}: {
  children: string
  className?: string
  numberOfLines?: number
}) {
  const segments = splitLinks(children)

  if (!segments.some((segment) => segment.url)) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {children}
      </Text>
    )
  }

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.url ? (
          /*
            The index is a safe key here and nowhere near the usual objection:
            the array is derived from one immutable string, so a given position
            always holds the same run, and nothing reorders or splices it.
          */
          <Text
            key={index}
            className="text-link"
            role="link"
            onPress={() => void openExternalUrl(segment.url as string)}
          >
            {segment.text}
          </Text>
        ) : (
          segment.text
        )
      )}
    </Text>
  )
}
