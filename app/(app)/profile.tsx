import { ActivityIndicator, ScrollView, View } from 'react-native'
import { Card } from '../../src/components/ui/card'
import { Label } from '../../src/components/ui/label'
import { Text } from '../../src/components/ui/text'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { useProfile } from '../../src/features/auth/useProfile'
import { LogoutButton } from '../../src/features/auth/LogoutButton'

/**
 * US-016 — view own profile. Layout follows the gated prototype's screenProfile:
 * name, contact, role, social handle, then log out.
 *
 * AC-2 requires that there be *no* way to change a field. So this screen renders
 * values as text, never as inputs — an Input rendered read-only or disabled
 * would still be an edit affordance the AC says must not exist.
 *
 * The contact row shows email: ADR-015 made email the credential and phone an
 * optional profile field that registration does not collect, so phone is shown
 * only if some later story sets it.
 *
 * Logging out (US-017) sits here, as it does in the prototype.
 */
export default function ProfileScreen() {
  const t = useStrings()
  const state = useProfile()

  if (state.status === 'loading') {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (state.status === 'error') {
    return (
      <View className="bg-background flex-1 p-4">
        <Text className="text-body text-onDark-muted">{t.somethingWentWrong}</Text>
      </View>
    )
  }

  const { profile } = state

  return (
    <ScrollView className="bg-background" contentInsetAdjustmentBehavior="automatic">
      <View className="gap-3 p-4">
        {/* RNR's Card ships py-6 and gap-6 for a header/content/footer layout
            this screen does not use, so both are overridden to the tighter
            field list the prototype shows. */}
        <Card className="gap-1 p-4">
          <Field label={t.name} value={profile.name} />
          <Field label={t.contact} value={profile.email} />
          {profile.phone ? <Field label={t.phone} value={profile.phone} /> : null}
          <Field label={t.role} value={profile.role} />
          <Field label={t.social} value={profile.socialHandle ?? '—'} />
        </Card>

        <LogoutButton />
      </View>
    </ScrollView>
  )
}

/** Values are text, never inputs — see AC-2 above. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1 pt-2">
      <Label>{label}</Label>
      <Text>{value}</Text>
    </View>
  )
}
