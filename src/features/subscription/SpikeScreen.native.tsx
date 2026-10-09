import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases'
import { Text } from '../../components/ui/text'
import { supabase } from '../../lib/supabase/client'
import { purchasesAvailable } from './purchases'

type AccessRow = {
  entitlement: string
  expires_at: string | null
  period_type: string
  store: string
  is_sandbox: boolean
  will_renew: boolean
  updated_at: string
}

/**
 * S-7's throwaway screen — **dev builds only, never shipped** (reached from the
 * profile under `__DEV__`). It answers the spike's three questions on a device:
 * does the offering load with its trial, does a purchase go through, and does
 * the server's `account_access` row appear — and how long after.
 *
 * Deleted when `US-051` builds the real paywall.
 */
export function SpikeScreen() {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null)
  const [info, setInfo] = useState<CustomerInfo | null>(null)
  const [rows, setRows] = useState<AccessRow[]>([])
  const [log, setLog] = useState<string[]>([])
  const boughtAt = useRef<number | null>(null)
  const seenUpdate = useRef<string | null>(null)

  const say = useCallback((line: string) => {
    setLog((l) => [`${new Date().toLocaleTimeString()} ${line}`, ...l])
  }, [])

  useEffect(() => {
    if (!purchasesAvailable) return say('no EXPO_PUBLIC_REVENUECAT_IOS_KEY in this build')
    Purchases.getOfferings()
      .then((o) => {
        const first = o.current?.availablePackages[0] ?? null
        setPkg(first)
        say(first ? `offering ${o.current?.identifier}: ${first.identifier}` : 'no current offering')
      })
      .catch((e) => say(`offerings failed: ${e.message}`))
    Purchases.getCustomerInfo()
      .then(setInfo)
      .catch((e) => say(`customer info failed: ${e.message}`))
  }, [say])

  // The server side: poll the account's own rows (RLS) every 2 s.
  useEffect(() => {
    const read = async () => {
      const { data, error } = await supabase.from('account_access').select('*')
      if (error) return say(`account_access: ${error.message}`)
      const next = (data ?? []) as AccessRow[]
      setRows(next)
      const latest = next.map((r) => r.updated_at).sort().at(-1) ?? null
      if (latest && latest !== seenUpdate.current) {
        if (seenUpdate.current !== null || boughtAt.current !== null) {
          const after = boughtAt.current ? ` ${((Date.now() - boughtAt.current) / 1000).toFixed(1)} s after purchase` : ''
          say(`server row updated${after}`)
        }
        seenUpdate.current = latest
      }
    }
    void read()
    const id = setInterval(read, 2000)
    return () => clearInterval(id)
  }, [say])

  const buy = async () => {
    if (!pkg) return
    try {
      boughtAt.current = Date.now()
      const result = await Purchases.purchasePackage(pkg)
      setInfo(result.customerInfo)
      say(`purchased in ${((Date.now() - boughtAt.current) / 1000).toFixed(1)} s`)
    } catch (e: any) {
      say(e.userCancelled ? 'cancelled' : `purchase failed: ${e.message}`)
    }
  }

  const restore = async () => {
    try {
      setInfo(await Purchases.restorePurchases())
      say('restored')
    } catch (e: any) {
      say(`restore failed: ${e.message}`)
    }
  }

  const product = pkg?.product
  const active = info ? Object.values(info.entitlements.active) : []

  return (
    <ScrollView contentContainerStyle={{ gap: 16, padding: 16, paddingTop: 16 }}>
      <Text className="text-title">S-7 · RevenueCat</Text>

      <View className="bg-card gap-1 rounded-xl p-4">
        <Text className="text-body-sm text-muted-foreground">Offering (from RevenueCat)</Text>
        <Text>{product ? `${product.title} — ${product.priceString}` : '—'}</Text>
        <Text>{product ? `id: ${product.identifier}` : ''}</Text>
        <Text>
          {product?.introPrice
            ? `intro: ${product.introPrice.priceString} for ${product.introPrice.periodNumberOfUnits} ${product.introPrice.periodUnit}`
            : 'intro: none'}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Pressable className="bg-primary flex-1 items-center rounded-xl p-3" onPress={buy}>
          <Text className="text-primary-foreground">Buy</Text>
        </Pressable>
        <Pressable className="bg-secondary flex-1 items-center rounded-xl p-3" onPress={restore}>
          <Text>Restore</Text>
        </Pressable>
      </View>

      <View className="bg-card gap-1 rounded-xl p-4">
        <Text className="text-body-sm text-muted-foreground">App: active entitlements (SDK)</Text>
        {active.length === 0 ? <Text>none</Text> : null}
        {active.map((e) => (
          <Text key={e.identifier}>
            {`${e.identifier} · ${e.periodType} · until ${e.expirationDate ?? '∞'} · renew ${e.willRenew}`}
          </Text>
        ))}
      </View>

      <View className="bg-card gap-1 rounded-xl p-4">
        <Text className="text-body-sm text-muted-foreground">Server: account_access (webhook)</Text>
        {rows.length === 0 ? <Text>no row</Text> : null}
        {rows.map((r) => (
          <Text key={r.entitlement}>
            {`${r.entitlement} · ${r.period_type} · ${r.store}${r.is_sandbox ? ' (sandbox)' : ''} · until ${r.expires_at ?? '∞'} · renew ${r.will_renew}`}
          </Text>
        ))}
      </View>

      <View className="gap-1">
        {log.map((line, i) => (
          <Text key={i} className="text-caption text-muted-foreground">
            {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  )
}
