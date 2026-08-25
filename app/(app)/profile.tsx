import { Card, Label, Paragraph, ScrollView, SizableText, Spinner, YStack } from 'tamagui'
import { uk } from '../../src/i18n/uk'
import { useProfile } from '../../src/features/auth/useProfile'

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
 * Logging out is US-017 and is added to this screen there.
 */
export default function ProfileScreen() {
  const state = useProfile()

  if (state.status === 'loading') {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center">
        <Spinner size="large" />
      </YStack>
    )
  }

  if (state.status === 'error') {
    return (
      <YStack flex={1} bg="$background" p="$4">
        <Paragraph theme="alt2">{uk.somethingWentWrong}</Paragraph>
      </YStack>
    )
  }

  const { profile } = state

  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$3">
        <Card size="$4" borderWidth={1} borderColor="$borderColor" p="$4" gap="$1">
          <Field label={uk.name} value={profile.name} />
          <Field label={uk.contact} value={profile.email} />
          {profile.phone ? <Field label={uk.phone} value={profile.phone} /> : null}
          <Field label={uk.role} value={profile.role} />
          <Field label={uk.social} value={profile.socialHandle ?? '—'} />
        </Card>
      </YStack>
    </ScrollView>
  )
}

/** Values are text, never inputs — see AC-2 above. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <YStack gap="$1" pt="$2">
      <Label>{label}</Label>
      <SizableText size="$4">{value}</SizableText>
    </YStack>
  )
}
