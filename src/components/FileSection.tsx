import { View } from 'react-native'
import { Text } from './ui/text'
import { Button } from './ui/button'
import { useStrings } from '../i18n/LanguageProvider'
import { SectionHeader } from './SectionHeader'
import { openExternalUrl } from '../lib/openExternalUrl'

/**
 * One of the client's two files sections (`US-024`, `US-025`).
 *
 * **This is not file hosting** (`ADR-005`, `ADR-008`). It is a label and either
 * an external link the creator pasted or a placeholder saying the files are not
 * there yet — the whole point of both stories being that a client can see
 * *where* files will appear before any exist.
 *
 * AC-1 is why the placeholder is rendered rather than the section hidden: "not
 * an empty or missing section". A client who sees nothing cannot tell the
 * difference between "not ready" and "this app does not do that".
 *
 * Nothing is decided here. `url` is null both when the creator pasted nothing
 * and when what they pasted was not a link (AC-3) — the gateway collapses those
 * two into one, so this screen cannot show "a dead link dressed up as a working
 * one" even by mistake.
 */
export function FileSection({ label, url }: { label: string; url: string | null }) {
  const t = useStrings()
  return (
    <View>
      <SectionHeader label={label} />
      {url ? (
        <Button variant="secondary" size="block" className="bg-card" onPress={() => void openExternalUrl(url)}>
          {/* The URL itself, as the prototype shows it: on a link with no
              account, the host is the only thing telling a client where they
              are about to be sent. */}
          <Text numberOfLines={1}>{url}</Text>
        </Button>
      ) : (
        /* §5.14's ComingSoonTile: a dashed placeholder on the frame, which is
           what «В розробці» has always been. */
        <View className="border-1.5 border-border items-center rounded-xl border border-dashed px-3.5 py-3">
          <Text className="text-label text-muted-foreground">{t.inDevelopment}</Text>
        </View>
      )}
    </View>
  )
}
