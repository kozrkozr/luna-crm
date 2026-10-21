import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { LogoMark } from '../../src/components/LogoMark'
import { Starfield } from '../../src/components/Starfield'
import { Text } from '../../src/components/ui/text'
import { AppStoreGet } from '../../src/features/subscription/AppStoreGet'
import { useStrings } from '../../src/i18n/LanguageProvider'

/**
 * `US-072` AC-2 — `/register` on the web: registration happens only in the
 * iOS app (`ADR-028`), so an old link or a bookmark lands here — the way to
 * the app and back to sign-in. The iOS route (`register.tsx`) is unchanged.
 */
export default function RegisterInTheApp() {
  const t = useStrings()
  const router = useRouter()

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <View className="flex-1 items-center justify-center px-5 py-12">
        <View className="w-full items-center gap-7" style={{ maxWidth: 480 }}>
          <View className="flex-row items-center gap-3">
            <LogoMark size={40} />
            <Text className="text-title-lg text-foreground font-bold">{t.appName}</Text>
          </View>

          <View className="gap-3">
            <Text className="text-display text-foreground text-center font-bold">{t.webRegisterTitle}</Text>
            <Text className="text-subtitle text-muted-foreground text-center" style={{ lineHeight: 24 }}>
              {t.webRegisterLine}
            </Text>
          </View>

          <AppStoreGet centered />

          <Pressable
            role="link"
            className="min-h-11 flex-row items-center"
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text className="text-body text-muted-foreground">{`${t.webHaveAccount} `}</Text>
            <Text className="text-body text-foreground font-semibold">{t.loginBtn}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
