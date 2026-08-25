import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  Adapt,
  Button,
  Form,
  Input,
  Label,
  Paragraph,
  ScrollView,
  Select,
  Sheet,
  SizableText,
  TextArea,
  Theme,
  XStack,
  YStack,
} from 'tamagui'
import { ROLES_UK, t } from '../../src/i18n/uk'

/**
 * US-005 — add a crew member. This screen exists because it is where R-1 is
 * actually decided: text fields, a role picker and a multiline note are the
 * controls where "Tamagui approximates Apple's components" either passes
 * Ilona's eye or does not. The two read-only screens cannot answer that.
 *
 * Built from Tamagui's Form, Label, Input, TextArea and Select (with Adapt, so
 * the picker becomes a bottom sheet on touch). No writes — submit only
 * exercises AC-2's validation.
 */
export default function AddCrewMemberScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [contact, setContact] = useState('')
  const [instagram, setInstagram] = useState('')
  const [note, setNote] = useState('')
  const [showContactError, setShowContactError] = useState(false)

  const submit = () => {
    // US-005 AC-2 — save is blocked without a phone or email; an Instagram
    // handle alone is not enough.
    if (!contact.trim()) {
      setShowContactError(true)
      return
    }
    setShowContactError(false)
    router.back()
  }

  return (
    <ScrollView
      bg="$background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Form onSubmit={submit} p="$4" gap="$2">
        <Label htmlFor="crew-name">{t('crewName')}</Label>
        <Input
          id="crew-name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder={t('crewName')}
        />

        <Label htmlFor="crew-role">{t('crewRole')}</Label>
        <Select id="crew-role" value={role} onValueChange={setRole}>
          <Select.Trigger>
            <Select.Value placeholder={t('rolePlaceholder')} />
          </Select.Trigger>

          <Adapt when="maxMd" platform="touch">
            <Sheet modal dismissOnSnapToBottom snapPointsMode="fit">
              <Sheet.Frame>
                <Sheet.ScrollView>
                  <Adapt.Contents />
                </Sheet.ScrollView>
              </Sheet.Frame>
              <Sheet.Overlay />
            </Sheet>
          </Adapt>

          <Select.Content>
            <Select.Viewport>
              <Select.Group>
                {ROLES_UK.map((roleName, index) => (
                  <Select.Item key={roleName} index={index} value={roleName}>
                    <Select.ItemText>{roleName}</Select.ItemText>
                    <Select.ItemIndicator ml="auto">✓</Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Viewport>
          </Select.Content>
        </Select>

        <Label htmlFor="crew-contact">{t('crewContact')}</Label>
        <Input
          id="crew-contact"
          value={contact}
          onChangeText={setContact}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('crewContact')}
        />
        {showContactError ? (
          <Theme name="red">
            <SizableText size="$2" color="$color11">
              {t('contactRequired')}
            </SizableText>
          </Theme>
        ) : null}

        <Label htmlFor="crew-instagram">{t('crewInstagram')}</Label>
        <Input
          id="crew-instagram"
          value={instagram}
          onChangeText={setInstagram}
          autoCapitalize="none"
          placeholder="@"
        />

        <Label htmlFor="crew-note">{t('crewNotes')}</Label>
        <TextArea
          id="crew-note"
          value={note}
          onChangeText={setNote}
          numberOfLines={4}
          placeholder={t('crewNotes')}
        />
        <YStack gap="$1" mt="$1">
          <Button size="$2" chromeless self="flex-start" disabled>
            {t('attachImageDemo')}
          </Button>
          <Paragraph size="$1" theme="alt2">
            {t('richTextDemo')}
          </Paragraph>
        </YStack>

        <YStack gap="$2" mt="$4">
          <Form.Trigger asChild>
            <Button theme="accent" size="$4">
              {t('save')}
            </Button>
          </Form.Trigger>
          <Button size="$4" chromeless onPress={() => router.back()}>
            {t('cancel')}
          </Button>
        </YStack>
      </Form>
    </ScrollView>
  )
}
