import { useEffect } from 'react'
import { Platform, View } from 'react-native'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { SectionLabel } from '../../components/ShootFormFields'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { openExternalUrl } from '../../lib/openExternalUrl'
import { formatBytes } from '../files/format'
import { formatDayMonthYear } from '../shoots/date'
import type { LinkHostedFile, LinkHostedFiles } from './gateway'

/**
 * `US-024` / `US-025` — the client's «Файли та посилання»: per section, the
 * hosted files (`ADR-020`) and the pasted link of `ADR-008`, both when both
 * exist (AC-4). A list for finished photos too, for now: galleries are a later
 * epic (owner, 2026-10-23).
 *
 * Per section:
 *   - files → each with its size and «Завантажити» (AC-1), «Завантажити все»
 *     (AC-2), «Файли доступні до {дата}» (AC-3);
 *   - the pasted link, if any (AC-4);
 *   - files gone and no link → AC-5's notice; files gone and a link → the link.
 *
 * A section with no files ever and no link is not shown — as before `US-036`.
 * Whether it should say something is `US-024` open question 1, still the
 * owner's.
 *
 * Inside the client branch of `ShootLinkView` only: the crew payload carries no
 * files (AC-7).
 */
export function LinkFiles({
  rawFilesUrl,
  finishedPhotosUrl,
  files,
}: {
  rawFilesUrl: string | null
  finishedPhotosUrl: string | null
  files: LinkHostedFiles | undefined
}) {
  const t = useStrings()
  const hosted = files ?? { deleteAt: null, deleted: false, raw: [], finished: [] }

  const sections = [
    { key: 'raw', title: t.sourceFilesSection as string, url: rawFilesUrl, items: hosted.raw },
    { key: 'finished', title: t.finishedFilesSection as string, url: finishedPhotosUrl, items: hosted.finished },
  ].filter((s) => s.items.length > 0 || s.url || hosted.deleted)

  if (sections.length === 0) return null

  const until =
    hosted.deleteAt && !hosted.deleted
      ? t.filesAvailableUntil.replace('{date}', formatDayMonthYear(hosted.deleteAt.slice(0, 10), t.monthsGenitive))
      : null

  return (
    <View className="gap-2">
      <SectionLabel label={t.filesAndLinks} />
      <Card variant="flat" className="gap-0 p-0">
        {sections.map((section, index) => (
          <View key={section.key} className={`gap-2.5 p-3.5 ${index > 0 ? 'border-border border-t' : ''}`}>
            <View className="gap-0.5">
              <Text className="text-body-sm text-foreground font-semibold">{section.title}</Text>
              {section.items.length > 0 && until ? (
                <Text className="text-label text-muted-foreground">{until}</Text>
              ) : null}
            </View>

            {section.items.map((file) => (
              <FileLine key={file.id} file={file} />
            ))}

            {section.items.length > 0 && Platform.OS === 'web' ? (
              <Button variant="outline" className="h-9 self-start px-3" onPress={() => void downloadAll(section.items)}>
                <Text className="text-label font-medium">{t.downloadAll}</Text>
              </Button>
            ) : null}

            {section.url ? (
              <View className="flex-row items-center gap-3">
                <Text className="text-label text-muted-foreground min-w-0 flex-1" numberOfLines={1}>
                  {section.url.replace(/^https?:\/\//, '')}
                </Text>
                <Button variant="outline" className="h-9 shrink-0 px-3" onPress={() => void openExternalUrl(section.url!)}>
                  <Text className="text-label font-medium">{t.openWord}</Text>
                </Button>
              </View>
            ) : hosted.deleted && section.items.length === 0 ? (
              <Text className="text-label text-muted-foreground">{t.filesDeletedNotice}</Text>
            ) : null}
          </View>
        ))}
      </Card>
    </View>
  )
}

function FileLine({ file }: { file: LinkHostedFile }) {
  const t = useStrings()
  return (
    <View className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-body-sm text-foreground" numberOfLines={1}>{file.name}</Text>
        <Text className="text-label text-muted-foreground">{formatBytes(file.size, t.byteUnits, t.decimalSeparator)}</Text>
      </View>
      <Button variant="outline" className="h-9 shrink-0 px-3" onPress={() => download(file)}>
        <Text className="text-label font-medium">{t.downloadWord}</Text>
      </Button>
    </View>
  )
}

/** The URL carries `content-disposition: attachment`, so the browser saves it. */
function download(file: LinkHostedFile) {
  if (Platform.OS !== 'web') {
    void openExternalUrl(file.url)
    return
  }
  const a = document.createElement('a')
  a.href = file.url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * AC-2 — every file, one after another. No archive (out of scope: 30–40 GB).
 * A phone's browser asks once per file (S-6 F-8); a pause between files keeps
 * desktop browsers from dropping all but the first.
 */
async function downloadAll(files: LinkHostedFile[]) {
  for (const file of files) {
    download(file)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

/**
 * Download URLs lapse (an hour by default) while the link does not
 * (`CLAUDE.md`). A navigation to a lapsed URL cannot be caught as a media
 * error, so a page with files re-requests its payload before they lapse: every
 * 40 minutes, and when it comes back into view after that long.
 */
const REFRESH_MS = 40 * 60 * 1000

export function useFreshFiles(reload: () => Promise<void> | void, hasFiles: boolean) {
  useEffect(() => {
    if (!hasFiles) return
    let loadedAt = Date.now()
    const refresh = () => {
      loadedAt = Date.now()
      void reload()
    }
    const timer = setInterval(refresh, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - loadedAt > REFRESH_MS) refresh()
    }
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload, hasFiles])
}
