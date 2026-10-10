import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { Button } from '../../src/components/ui/button'
import { Icon } from '../../src/components/ui/icon'
import { Text } from '../../src/components/ui/text'
import { Starfield } from '../../src/components/Starfield'
import { Toast } from '../../src/components/Toast'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { failed, succeeded, tapped } from '../../src/lib/haptics'
import { formatDayMonth } from '../../src/features/shoots/date'
import { useAccess, type SubscriptionStatus } from '../../src/features/subscription/access'
import { loadOffer, openManageSubscriptions, restore } from '../../src/features/subscription/purchases'

const LOGO = require('../../assets/paywall-logo.png')

/**
 * «Підписка» — `US-053`, built to `Subscription.dc.html` (Claude Design). Reached
 * from the profile like «Валюта» and «Сповіщення», with the same «‹ Профіль»
 * header.
 *
 * One card says what the access is and until when (AC-1, AC-5); under it the one
 * action that fits — «Керувати підпискою» while something renews or runs
 * (AC-2), «Оформити підписку» when nothing does (AC-3) — and «Відновити покупки»
 * at the foot of the screen (AC-4).
 *
 * The status comes from the server's record (`account_access`), the price from
 * the store — Apple's localized string, never a hard-coded amount.
 */
export default function SubscriptionScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { subscription, syncNow } = useAccess()
  const [price, setPrice] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadOffer()
      .then((offer) => active && setPrice(offer?.priceString ?? null))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const date = (iso: string) => formatDayMonth(iso.slice(0, 10), t.monthsGenitive)

  const onRestore = async () => {
    if (restoring) return
    tapped()
    setRestoring(true)
    const result = await restore()
    if (result === 'restored') await syncNow()
    setRestoring(false)
    if (result === 'restored') return succeeded()
    failed()
    setToast(
      result === 'none'
        ? t.paywallRestoreNone
        : result === 'otherAccount'
          ? t.paywallOtherAccount
          : t.paywallRestoreFailed
    )
  }

  const status = subscription ?? { kind: 'none' }
  // Something Apple renews or runs — managed in Apple's settings (AC-2). Beta
  // access (`US-055`) is not Apple's: it reads «Не продовжиться» like a
  // cancelled subscription, but gets «Оформити підписку» (AC-3) — and is never
  // named (`US-055` AC-3b).
  const runs = status.kind === 'trial' || status.kind === 'active' || status.kind === 'wontRenew'

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="bg-background border-border border-b" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-1.5 px-2 pb-2 pt-1">
          <Pressable
            className="active:bg-secondary min-h-11 w-[88px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
            onPress={() => {
              tapped()
              if (router.canGoBack()) router.back()
              else router.replace('/(app)/(tabs)/profile')
            }}
            role="button"
            accessibilityLabel={t.profileTitle}
          >
            <Icon as={ChevronLeft} size={16} strokeWidth={1.9} className="text-muted-foreground" />
            <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
              {t.profileTitle}
            </Text>
          </Pressable>
          <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
            {t.subscriptionTitle}
          </Text>
          <View className="w-[88px] shrink-0" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}>
        <View className="bg-card border-border rounded-xl border p-4">
          <View className="flex-row items-center gap-3">
            <View className="bg-background border-border h-10 w-10 items-center justify-center rounded-[10px] border">
              <Image source={LOGO} style={{ width: 20, height: 21 }} resizeMode="contain" />
            </View>
            <Text className="text-foreground min-w-0 flex-1 font-semibold" style={{ fontSize: 15 }}>
              Luna Shoots
            </Text>
            {subscription ? <StatusPill status={status} /> : <ActivityIndicator size="small" />}
          </View>
          {subscription ? (
            <View className="border-border mt-3.5 border-t pt-3.5">
              <Text className="text-foreground" style={{ fontSize: 15, lineHeight: 22 }}>
                {status.kind === 'trial'
                  ? t.subscriptionFreeUntilTemplate.replace('{date}', date(status.until))
                  : status.kind === 'active'
                    ? t.subscriptionNextChargeTemplate
                        .replace('{date}', date(status.until))
                        .replace(' · {price}', price ? ` · ${price}` : '')
                    : status.kind === 'wontRenew' || status.kind === 'beta'
                      ? t.subscriptionAccessUntilTemplate.replace('{date}', date(status.until))
                      : t.subscriptionViewMode}
              </Text>
              {status.kind === 'trial' && price ? (
                <Text className="text-muted-foreground mt-1" style={{ fontSize: 13 }}>
                  {t.subscriptionThenTemplate.replace('{price}', price)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {runs ? (
          // AC-2 — iOS's own settings; cancelling is Apple's.
          <Pressable
            className="border-border-strong mt-4 min-h-12 flex-row items-center justify-center gap-2 rounded-full border active:bg-card"
            onPress={() => {
              tapped()
              void openManageSubscriptions()
            }}
            role="button"
          >
            <Text className="text-foreground font-semibold" style={{ fontSize: 14 }}>
              {t.subscriptionManage}
            </Text>
            <Icon as={ArrowUpRight} size={14} strokeWidth={2} className="text-muted-foreground" />
          </Pressable>
        ) : subscription ? (
          // AC-3
          <Button
            variant="cta"
            size="cta"
            className="mt-4 min-h-[52px]"
            onPress={() => {
              tapped()
              router.push('/(app)/paywall')
            }}
          >
            <Text className="text-subtitle font-semibold">{t.subscriptionSubscribe}</Text>
          </Button>
        ) : null}

        <View className="flex-1" />

        {/* AC-4 — at the foot, as the artboard draws it. */}
        <View className="mt-8 items-center" style={{ paddingBottom: insets.bottom }}>
          <Pressable
            className="min-h-11 flex-row items-center gap-2 rounded-full px-4 active:bg-card"
            onPress={() => void onRestore()}
            disabled={restoring}
            role="button"
          >
            {restoring ? <ActivityIndicator size="small" /> : null}
            <Text className="text-muted-foreground font-medium" style={{ fontSize: 13.5 }}>
              {t.subscriptionRestore}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Toast message={toast} onDone={() => setToast(null)} />
    </View>
  )
}

/** The artboard's pill, one tone per state. */
function StatusPill({ status }: { status: SubscriptionStatus }) {
  const t = useStrings()
  const [label, tone] =
    status.kind === 'trial'
      ? [t.subscriptionStatusTrial, 'border-info-border bg-info-bg text-link']
      : status.kind === 'active'
        ? [t.subscriptionStatusActive, 'border-success-border bg-success-bg text-success-soft']
        : status.kind === 'wontRenew' || status.kind === 'beta'
          ? [t.subscriptionStatusWontRenew, 'border-warn-border bg-warn-bg text-warn']
          : [t.subscriptionStatusNone, 'border-border-strong bg-secondary text-muted-foreground']
  const [border, bg, text] = tone.split(' ')
  return (
    <View className={`${border} ${bg} min-h-6 shrink-0 justify-center rounded-full border px-[9px]`}>
      <Text className={`${text} font-semibold`} style={{ fontSize: 11.5 }}>
        {label}
      </Text>
    </View>
  )
}
