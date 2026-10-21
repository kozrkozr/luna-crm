import { Pressable, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { Text } from '../../components/ui/text'
import { useLanguage, useStrings } from '../../i18n/LanguageProvider'
import { useDesktop } from '../../lib/desktop'
import { openExternalUrl } from '../../lib/openExternalUrl'
import { APP_STORE_QR, APP_STORE_URL, BADGE_EN, BADGE_EN_RATIO, BADGE_UK, BADGE_UK_RATIO } from './appStoreArt'

/** Apple's minimum is 40 px; the boards draw it about 50. */
const BADGE_HEIGHT = 48
const QR_TILE = 140

/**
 * `US-072` — "the way to the app": at the desktop width a QR code to the App
 * Store page, captioned, beside Apple's badge; below it the badge alone, since
 * a phone has nothing to scan its own screen with (`ADR-028` decision 2).
 *
 * `centered` — the `/register` screen, the dialog and every phone width; the
 * sign-in block on a desktop sits at the form's left edge, as drawn.
 */
export function AppStoreGet({ centered = false }: { centered?: boolean }) {
  const t = useStrings()
  const language = useLanguage()
  const desktop = useDesktop()
  const [badge, ratio] = language === 'uk' ? [BADGE_UK, BADGE_UK_RATIO] : [BADGE_EN, BADGE_EN_RATIO]

  const badgeLink = (
    <Pressable
      role="link"
      accessibilityLabel={t.appStoreBadgeA11y}
      onPress={() => void openExternalUrl(APP_STORE_URL)}
      className="active:opacity-70"
    >
      <SvgXml xml={badge} width={Math.round(BADGE_HEIGHT * ratio)} height={BADGE_HEIGHT} />
    </Pressable>
  )

  if (!desktop) return <View className={centered ? 'items-center' : 'items-start'}>{badgeLink}</View>

  return (
    <View className={`flex-row flex-wrap items-center gap-6 ${centered ? 'justify-center' : ''}`}>
      <View className="items-center gap-2">
        {/* White behind the code is its quiet zone; dark-on-dark would not scan. */}
        <View
          className="items-center justify-center rounded-xl bg-white"
          style={{ width: QR_TILE, height: QR_TILE }}
          role="img"
          accessibilityLabel={t.appStoreQrA11y}
        >
          <SvgXml xml={APP_STORE_QR} width={QR_TILE - 24} height={QR_TILE - 24} />
        </View>
        <Text className="text-label text-muted-foreground">{t.appStoreScan}</Text>
      </View>
      {badgeLink}
    </View>
  )
}
