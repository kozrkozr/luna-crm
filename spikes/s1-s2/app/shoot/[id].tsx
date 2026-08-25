import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  AlertDialog,
  Button,
  Card,
  H3,
  H5,
  ListItem,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  XStack,
  YGroup,
  YStack,
} from 'tamagui'
import { REFERENCE_DISPLAY_LIMIT, findShoot } from '../../src/demo/data'
import { t } from '../../src/i18n/uk'
import { StatusPill } from '../../src/ui'

/**
 * Creator's shoot detail — the densest read screen in the product. Covers the
 * read side of US-002/003/005/006/018/020/024/025.
 *
 * The destructive actions use Tamagui's AlertDialog, which is the component
 * carrying US-019 AC-2 and US-022 AC-2 (nothing is destroyed without an
 * explicit confirmation step).
 */
export default function ShootDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const shoot = findShoot(String(id))

  if (!shoot) {
    return (
      <YStack flex={1} bg="$background" p="$4">
        <Paragraph theme="alt2">—</Paragraph>
      </YStack>
    )
  }

  const shown = shoot.references.slice(0, REFERENCE_DISPLAY_LIMIT)
  const hasOverflow = shoot.references.length > REFERENCE_DISPLAY_LIMIT

  return (
    <ScrollView bg="$background" contentInsetAdjustmentBehavior="automatic">
      <YStack p="$4" gap="$3">
        <XStack items="center" justify="space-between" gap="$3">
          <H3 flex={1}>{shoot.clientName}</H3>
          <StatusPill value={shoot.status} />
        </XStack>
        <Paragraph theme="alt2">
          {shoot.date}
          {shoot.locationAddress ? ` · ${shoot.locationAddress}` : ''}
        </Paragraph>

        <XStack gap="$2">
          <Button flex={1} size="$4">
            {t('edit')}
          </Button>
          <Button flex={1} size="$4">
            {shoot.status === 'new' ? t('markFinished') : t('markNew')}
          </Button>
        </XStack>

        <ConfirmButton
          label={t('deleteShoot')}
          question={t('confirmDeleteShoot')}
          onConfirm={() => router.back()}
        />

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
        {shoot.crew.length === 0 ? (
          <Card size="$4" borderWidth={1} borderColor="$borderColor" p="$4">
            <Paragraph theme="alt2">—</Paragraph>
          </Card>
        ) : (
          <YGroup borderWidth={1} borderColor="$borderColor" rounded="$4" overflow="hidden">
            {shoot.crew.map((member, index) => (
              <YGroup.Item key={member.id}>
                {index > 0 ? <Separator /> : null}
                <ListItem
                  title={member.name}
                  subTitle={`${member.role} · ${member.contact}`}
                  iconAfter={<StatusPill value={member.response} />}
                />
              </YGroup.Item>
            ))}
          </YGroup>
        )}
        <XStack gap="$2">
          <Button flex={1} size="$3" onPress={() => router.push('/crew/add')}>
            {t('addCrewMember')}
          </Button>
        </XStack>

        <H5 mt="$2">{t('files')}</H5>
        <FileRow label={t('rawFiles')} url={shoot.rawFilesUrl} />
        <FileRow label={t('finishedPhotos')} url={shoot.finishedPhotosUrl} />
      </YStack>
    </ScrollView>
  )
}

/** US-019 AC-2 / US-022 AC-2 — an accidental tap must not destroy anything. */
function ConfirmButton({
  label,
  question,
  onConfirm,
}: {
  label: string
  question: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog native>
      <AlertDialog.Trigger asChild>
        <Button size="$4" theme="red">
          {label}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay key="overlay" opacity={0.5} />
        <AlertDialog.Content key="content" gap="$3">
          <AlertDialog.Title>{label}</AlertDialog.Title>
          <AlertDialog.Description>{question}</AlertDialog.Description>
          <XStack gap="$3" justify="flex-end">
            <AlertDialog.Cancel asChild>
              <Button chromeless>{t('cancel')}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild onPress={onConfirm}>
              <Button theme="red">{t('removeCrewTitle')}</Button>
            </AlertDialog.Action>
          </XStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  )
}

function FileRow({ label, url }: { label: string; url: string }) {
  return (
    <Card
      size="$3"
      borderWidth={1}
      borderColor="$borderColor"
      borderStyle="dashed"
      p="$3"
      gap="$1"
    >
      <SizableText size="$2" fontWeight="700">
        {label}
      </SizableText>
      {url ? (
        <SizableText size="$2" theme="accent" color="$color11">
          {url}
        </SizableText>
      ) : (
        <Paragraph size="$2" theme="alt2">
          {t('inDevelopment')}
        </Paragraph>
      )}
    </Card>
  )
}
