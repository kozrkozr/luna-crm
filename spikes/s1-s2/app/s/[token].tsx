import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import {
  Button,
  Card,
  H3,
  H5,
  ListItem,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  Spinner,
  Theme,
  XStack,
  YGroup,
  YStack,
} from 'tamagui'
import {
  REFERENCE_DISPLAY_LIMIT,
  resolveCrewToken,
  type CrewMember,
  type Shoot,
} from '../../src/demo/data'
import { t } from '../../src/i18n/uk'
import { StatusPill } from '../../src/ui'

/**
 * Resolution is a three-state machine, not a truthiness check, and that is the
 * whole point of this file.
 *
 * A static export prerenders this route with no token — so deciding "invalid"
 * from an absent param makes the build emit the US-007 AC-2 error page, which
 * the host then serves for *every* link, valid ones included. The browser
 * corrects it on hydration, but the crew member has already seen
 * «Це посилання більше не діє» flash by then, and React logs a hydration
 * mismatch (#418).
 *
 * So: `resolving` until a resolution has actually been attempted. That also
 * matches production shape, where this becomes an async call to the link
 * gateway (ADR-013) rather than a local lookup.
 */
type Resolution =
  | { phase: 'resolving' }
  | { phase: 'invalid' }
  | { phase: 'ready'; shoot: Shoot; crewMember: CrewMember }

export default function CrewLinkView() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [resolution, setResolution] = useState<Resolution>({ phase: 'resolving' })

  useEffect(() => {
    // Undefined during prerender and on the very first client paint; wait.
    if (token === undefined) return
    const resolved = resolveCrewToken(String(token))
    setResolution(resolved ? { phase: 'ready', ...resolved } : { phase: 'invalid' })
  }, [token])

  if (resolution.phase === 'resolving') {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" py="$10" gap="$3">
        <Spinner size="large" />
      </YStack>
    )
  }

  // US-007 AC-2 — a clear invalid state, never shoot data and never a generic error.
  if (resolution.phase === 'invalid') {
    return (
      <YStack flex={1} bg="$background" items="center" py="$10" px="$4" gap="$2">
        <SizableText size="$9">⚠️</SizableText>
        <H3 text="center">{t('linkInvalidTitle')}</H3>
        <Paragraph theme="alt2" text="center">
          {t('linkInvalidSub')}
        </Paragraph>
      </YStack>
    )
  }

  const { shoot, crewMember } = resolution
  const shown = shoot.references.slice(0, REFERENCE_DISPLAY_LIMIT)
  const hasOverflow = shoot.references.length > REFERENCE_DISPLAY_LIMIT

  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$3">
        <Theme name="alt2">
          <Card size="$1" borderWidth={1} borderColor="$borderColor" borderStyle="dashed" px="$2" py="$1" self="flex-start">
            <SizableText size="$1">{t('noAccountView')}</SizableText>
          </Card>
        </Theme>

        <H3>{`${t('shootFor')}: ${shoot.date}`}</H3>
        <Paragraph theme="alt2">{shoot.locationAddress}</Paragraph>
        <Paragraph>
          {`${t('you')}: `}
          <SizableText fontWeight="700">{crewMember.name}</SizableText>
          {` (${crewMember.role})`}
        </Paragraph>

        <H5 mt="$2">{t('references')}</H5>
        <XStack flexWrap="wrap" gap="$2">
          {shown.map((reference) => (
            <Card
              key={reference.id}
              size="$2"
              borderWidth={1}
              borderColor="$borderColor"
              bg="$color3"
              flexGrow={1}
              flexBasis="45%"
              height={72}
              items="center"
              justify="center"
              p="$2"
            >
              <SizableText size="$1" text="center" theme="alt1">
                {reference.label}
              </SizableText>
            </Card>
          ))}
        </XStack>
        {hasOverflow ? (
          <Button size="$3">{`${t('showAllReferences')} (${shoot.references.length})`}</Button>
        ) : null}

        <H5 mt="$2">{t('crew')}</H5>
        <YGroup borderWidth={1} borderColor="$borderColor" rounded="$4" overflow="hidden">
          {shoot.crew.map((member, index) => (
            <YGroup.Item key={member.id}>
              {index > 0 ? <Separator /> : null}
              <ListItem
                pressStyle={{ bg: '$color3' }}
                title={member.name}
                subTitle={member.role}
                iconAfter={<StatusPill value={member.response} />}
              />
            </YGroup.Item>
          ))}
        </YGroup>

        {crewMember.response === 'pending' ? (
          <XStack gap="$2" mt="$2">
            <Button flex={1} size="$4" theme="red">
              {t('decline')}
            </Button>
            <Button flex={1} size="$4" theme="accent">
              {t('confirm')}
            </Button>
          </XStack>
        ) : (
          <Card size="$4" borderWidth={1} borderColor="$borderColor" p="$4" items="center" mt="$2">
            <Paragraph>
              {crewMember.response === 'confirmed' ? t('youConfirmed') : t('youDeclined')}
            </Paragraph>
          </Card>
        )}
      </YStack>
    </ScrollView>
  )
}
