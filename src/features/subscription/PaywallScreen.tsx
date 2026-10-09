import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import Check from 'lucide-react-native/icons/check'
import CircleAlert from 'lucide-react-native/icons/circle-alert'
import X from 'lucide-react-native/icons/x'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { Text } from '../../components/ui/text'
import { useLanguage, useStrings } from '../../i18n/LanguageProvider'
import { failed, succeeded, tapped } from '../../lib/haptics'
import { openExternalUrl } from '../../lib/openExternalUrl'
import { privacyUrl, termsUrl } from '../../lib/legalUrls'
import { useAccess } from './access'
import type { Offer } from './offer'
import { buy, loadOffer, restore } from './purchases'

const LOGO = require('../../../assets/paywall-logo.png')

/**
 * `US-051` — the paywall, built to `Paywall copy.dc.html` (Claude Design,
 * 2026-10-09, the final one): «Відновити» and ✕ on top, the logo in the free
 * space, the title, four benefits, the plan card, the renewal in words, the
 * button, the legal links.
 *
 * Two states, both drawn: **a** with the trial («14 днів безкоштовно»,
 * «Спробувати безкоштовно») and **b** without it, for an Apple ID that has used
 * it (AC-6) — «Підписка Luna Shoots», «Оформити — {price} на місяць». Which one
 * comes from the store (`loadOffer`), never from the account.
 *
 * The price is Apple's localized string everywhere it appears, and the screen
 * shows no zero price (AC-2, Guideline 3.1.2).
 *
 * A purchase or a restore asks the server to record it before the screen
 * closes, so the account has access the moment it is back on the app (AC-3,
 * `US-052` AC-7).
 */
export function PaywallScreen() {
  const t = useStrings()
  const language = useLanguage()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { syncNow } = useAccess()

  const [offer, setOffer] = useState<Offer | null>(null)
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadOffer()
      .then((next) => active && setOffer(next))
      .catch(() => active && setOffer(null))
    return () => {
      active = false
    }
  }, [])

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))

  const onBuy = async () => {
    if (!offer || busy) return
    tapped()
    setError(null)
    setBusy('buy')
    const result = await buy(offer)
    if (result === 'bought') {
      await syncNow()
      succeeded()
      setBusy(null)
      close()
      return
    }
    setBusy(null)
    // AC-4 — Apple's sheet dismissed: the paywall stays, nothing changes.
    if (result === 'cancelled') return
    failed()
    setError(result === 'otherAccount' ? t.paywallOtherAccount : t.paywallPurchaseFailed)
  }

  const onRestore = async () => {
    if (busy) return
    tapped()
    setError(null)
    setBusy('restore')
    const result = await restore()
    if (result === 'restored') {
      await syncNow()
      succeeded()
      setBusy(null)
      close()
      return
    }
    setBusy(null)
    failed()
    setError(
      result === 'none'
        ? t.paywallRestoreNone
        : result === 'otherAccount'
          ? t.paywallOtherAccount
          : t.paywallRestoreFailed
    )
  }

  const trial = offer?.trial ?? true
  const price = offer?.priceString ?? ''

  return (
    <View className="bg-background flex-1">
      {/* «Відновити» and ✕ — `top:54px; left/right:16px`, 40pt controls. */}
      <View
        className="absolute inset-x-4 z-10 flex-row items-center justify-between"
        style={{ top: insets.top + 6 }}
      >
        <Pressable
          className="bg-card min-h-10 flex-row items-center gap-2 rounded-full px-[15px] active:bg-secondary"
          onPress={() => void onRestore()}
          disabled={busy !== null}
          role="button"
        >
          {busy === 'restore' ? <ActivityIndicator size="small" /> : null}
          <Text className="text-muted-foreground font-medium" style={{ fontSize: 13.5 }}>
            {t.paywallRestore}
          </Text>
        </Pressable>
        <Pressable
          className="bg-card h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
          onPress={() => {
            tapped()
            close()
          }}
          role="button"
          accessibilityLabel={t.paywallClose}
        >
          <Icon as={X} size={16} strokeWidth={2.2} className="text-muted-foreground" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 50,
          paddingBottom: insets.bottom + 26,
          paddingHorizontal: 16,
        }}
        bounces={false}
      >
        {/* The free space above the title, with the logo in it. */}
        <View className="min-h-[190px] flex-1 items-center justify-center gap-3">
          <LogoCluster />
          <Text className="text-foreground font-semibold" style={{ fontSize: 17 }}>
            Luna Shoots
          </Text>
        </View>

        <View className="items-center px-2">
          <Text
            className="text-foreground text-center font-semibold"
            style={{ fontSize: 28, lineHeight: 32 }}
          >
            {trial ? t.paywallTrialTitle : t.paywallSubscriptionTitle}
          </Text>
          <Text
            className="text-muted-foreground mt-1.5 text-center"
            style={{ fontSize: 14.5, lineHeight: 21 }}
          >
            {t.paywallSubtitle}
          </Text>
        </View>

        <View className="mx-1.5 mt-4 gap-[7px]">
          {t.paywallBenefits.map((benefit) => (
            <View key={benefit} className="flex-row items-start gap-2.5">
              <Icon as={Check} size={16} strokeWidth={2.2} className="text-success mt-px" />
              <Text className="text-foreground/85 flex-1" style={{ fontSize: 13.5, lineHeight: 19 }}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        {/* The plan card — a selectable row, so a later plan is a second row
            (AC-2, `ADR-023` decision 9). The one plan is always selected. */}
        <View
          className="border-foreground bg-card mt-[18px] min-h-16 flex-row items-center gap-3 rounded-[14px] px-3.5 py-[13px]"
          style={{ borderWidth: 1.5 }}
          role="radio"
          aria-checked
        >
          <View className="border-foreground h-[22px] w-[22px] items-center justify-center rounded-full border-2">
            <View className="bg-foreground h-2.5 w-2.5 rounded-full" />
          </View>
          <View className="min-w-0 flex-1">
            {offer ? (
              <Text className="text-foreground" style={{ fontSize: 16, lineHeight: 21 }}>
                <Text className="text-foreground font-semibold" style={{ fontSize: 16 }}>
                  {t.paywallPlanLabel}
                </Text>
                {` ${t.paywallPlanPriceTemplate.replace('{price}', price)}`}
              </Text>
            ) : (
              <ActivityIndicator size="small" className="self-start" />
            )}
            {offer && trial ? (
              <Text className="text-muted-foreground mt-0.5" style={{ fontSize: 12.5 }}>
                {t.paywallPlanTrial}
              </Text>
            ) : null}
          </View>
        </View>

        <Text
          className="text-muted-foreground/80 mt-2.5 text-center"
          style={{ fontSize: 12, lineHeight: 18 }}
        >
          {trial ? t.paywallRenewTrial : t.paywallRenewNoTrial}
        </Text>

        {/* AC-7, AC-9, AC-10 — the design's «Помилка» state. */}
        {error ? (
          <View
            className="border-danger-border bg-danger-bg mt-2.5 flex-row items-center gap-[9px] rounded-[10px] border px-3 py-[9px]"
            role="alert"
          >
            <Icon as={CircleAlert} size={16} strokeWidth={2} className="text-danger-soft" />
            <Text className="text-danger-soft flex-1" style={{ fontSize: 13, lineHeight: 18 }}>
              {error}
            </Text>
          </View>
        ) : null}

        <Button
          variant="cta"
          size="cta"
          className="mt-2.5 min-h-[52px] flex-row gap-[9px]"
          disabled={!offer || busy !== null}
          onPress={() => void onBuy()}
        >
          {busy === 'buy' ? <ActivityIndicator size="small" /> : null}
          <Text className="text-subtitle font-semibold">
            {trial ? t.paywallTryFree : t.paywallSubscribeTemplate.replace('{price}', price)}
          </Text>
        </Button>

        <View className="mt-2.5 flex-row items-center justify-center gap-1.5">
          <LegalLink label={t.paywallTerms} url={termsUrl(language)} />
          <View className="bg-border-strong h-[11px] w-px" />
          <LegalLink label={t.paywallPrivacy} url={privacyUrl(language)} />
        </View>
      </ScrollView>
    </View>
  )
}

function LegalLink({ label, url }: { label: string; url: string | null }) {
  return (
    <Pressable
      className="min-h-7 justify-center"
      onPress={() => url && void openExternalUrl(url)}
      role="link"
      hitSlop={6}
    >
      <Text className="text-muted-foreground/80" style={{ fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * The artboard's 236×150 cluster: 📸 on sky and 📅 on peach behind, the logo on
 * its 104pt tile in the middle, ✨ on lavender in front. Decoration only.
 */
function LogoCluster() {
  const shadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  }
  return (
    <View style={{ width: 236, height: 150 }} aria-hidden accessibilityElementsHidden>
      <View
        className="bg-chart-5 absolute items-center justify-center"
        style={[{ left: 0, top: 52, width: 78, height: 78, borderRadius: 22, transform: [{ rotate: '-12deg' }] }, shadow]}
      >
        <Text style={{ fontSize: 42, lineHeight: 48 }}>📸</Text>
      </View>
      <View
        className="bg-chart-1 absolute items-center justify-center"
        style={[{ right: 0, top: 44, width: 78, height: 78, borderRadius: 22, transform: [{ rotate: '11deg' }] }, shadow]}
      >
        <Text style={{ fontSize: 42, lineHeight: 48 }}>📅</Text>
      </View>
      <View
        className="bg-card border-border-strong absolute items-center justify-center border"
        style={[{ left: 66, top: 0, width: 104, height: 104, borderRadius: 28 }, { ...shadow, shadowOpacity: 0.5, shadowRadius: 16 }]}
      >
        <Image source={LOGO} style={{ width: 56, height: 58 }} resizeMode="contain" />
      </View>
      <View
        className="bg-chart-4 absolute items-center justify-center"
        style={[{ left: 148, top: 84, width: 44, height: 44, borderRadius: 14, transform: [{ rotate: '8deg' }] }, shadow]}
      >
        <Text style={{ fontSize: 24, lineHeight: 28 }}>✨</Text>
      </View>
    </View>
  )
}
