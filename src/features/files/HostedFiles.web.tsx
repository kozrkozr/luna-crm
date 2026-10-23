import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import Trash from 'lucide-react-native/icons/trash'
import { useDestructiveConfirm } from '../../components/DestructiveAction'
import { Icon } from '../../components/ui/icon'
import { Button } from '../../components/ui/button'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { formatDayMonthYear, toIsoDate } from '../shoots/date'
import {
  callFiles,
  filesUsage,
  getFilesDeleteAt,
  hostingLimits,
  listShootFiles,
  type FileKind,
  type Refusal,
  type ShootFile,
} from './api'
import { fromDrop, fromInput } from './collect'
import { fillSummary, shootFilesSummary, type FileSummary } from './summary'
import { formatBytes, formatGigabytes } from './format'
import { uploads, type Upload } from './uploader'

/**
 * `US-036` — one section's hosted files (raw files or finished photos), on the
 * creator's shoot screen in the browser (`ADR-021`). Files are added with two
 * buttons — files, or a whole folder — or dropped onto the section (AC-6,
 * owner 2026-10-04). Built on the existing components; the owner's design is
 * applied later (plan, "Screens that need design").
 *
 * Three kinds of row:
 *   - stored files, from `shoot_files` (AC-1);
 *   - uploads running in this tab, from the queue (`uploader.ts`);
 *   - uploads left `uploading` in the table that this tab is not running — a
 *     closed tab (S-6 F-7): picking the same file again resumes it.
 *
 * The pasted link of `ADR-008` stays beside them (AC-5): `FileRow` above.
 */
export function HostedFiles({ shootId, kind }: { shootId: string; kind: FileKind }) {
  const t = useStrings()
  const [files, setFiles] = useState<ShootFile[]>([])
  const [queue, setQueue] = useState<Upload[]>([])
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null)
  const [deleteAt, setDeleteAt] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const filesInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const [list, date] = await Promise.all([listShootFiles(shootId), getFilesDeleteAt(shootId)])
    if (list) setFiles(list.filter((f) => f.kind === kind))
    setDeleteAt(date)
  }, [shootId, kind])

  useEffect(() => {
    void refresh()
    void hostingLimits().then((limits) => setQuotaBytes(limits?.quotaBytes ?? null))
    const unsubscribe = uploads.subscribe((all) => setQueue(all.filter((u) => u.shootId === shootId && u.kind === kind)))
    const unDone = uploads.onDone((id) => id === shootId && void refresh())
    return () => {
      unsubscribe()
      unDone()
    }
  }, [shootId, kind, refresh])

  // `US-038` AC-2 — one file, after the approved question; final, so asked first.
  const { ask: askDelete, dialog: deleteDialog } = useDestructiveConfirm<ShootFile>({
    label: t.remove,
    question: (file) => t.filesDeleteOneQuestion.replace('{name}', file.name),
    onConfirm: (file) => {
      void callFiles('delete', { fileId: file.id }).then(() => uploads.changed(shootId))
    },
  })

  const add = (picked: ReturnType<typeof fromInput>) => {
    if (picked.length) uploads.add(shootId, kind, picked)
  }

  const active = uploads.activeFileIds()
  const stored = files.filter((f) => f.status === 'complete')
  const interrupted = files.filter((f) => f.status === 'uploading' && !active.has(f.id))
  const running = queue.filter((u) => u.phase !== 'done')

  const fill = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce((text, [k, v]) => text.replace(`{${k}}`, v), template)

  const size = (bytes: number) => formatBytes(bytes, t.byteUnits, t.decimalSeparator)

  const message = (upload: Upload): string | null => {
    if (upload.phase === 'slow') return t.filesSlow
    if (upload.phase === 'offline') return t.filesOffline
    if (upload.phase !== 'failed') return null
    return refusalText(upload.reason ?? 'store', upload.name)
  }

  const refusalText = (reason: Refusal, name: string) => {
    switch (reason) {
      case 'quota':
        return fill(t.filesQuotaFull, { quota: quotaBytes ? formatGigabytes(quotaBytes, t.decimalSeparator) : '' })
      case 'expired':
        return fill(t.filesExpired, { date: deleteAt ? formatDayMonthYear(toIsoDate(new Date(deleteAt)), t.monthsGenitive) : '' })
      case 'not_a_photo':
        return fill(t.filesNotAPhoto, { name, finished: t.finishedFilesSection, raw: t.sourceFilesSection })
      default:
        return fill(t.filesFailed, { name })
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void fromDrop(e.dataTransfer).then(add)
      }}
      style={{ borderRadius: 12, outline: dragging ? '2px dashed currentColor' : 'none', outlineOffset: -4 }}
    >
      <View className="gap-2 px-3.5 pb-3.5">
        {/* `US-037` AC-1 / AC-2 — the date, once the section has files; the client sees the same. */}
        {stored.length > 0 && deleteAt && new Date(deleteAt) > new Date() ? (
          <Text className="text-label text-muted-foreground">
            {fill(t.filesAvailableUntil, { date: formatDayMonthYear(toIsoDate(new Date(deleteAt)), t.monthsGenitive) })}
          </Text>
        ) : null}
        {stored.map((file) => (
          <View key={file.id} className="flex-row items-center justify-between gap-3">
            <Text className="text-body-sm text-foreground min-w-0 flex-1" numberOfLines={1}>{file.name}</Text>
            <Text className="text-label text-muted-foreground">{size(file.sizeBytes)}</Text>
            <Pressable
              onPress={() => askDelete(file)}
              accessibilityLabel={t.remove}
              className="active:opacity-60"
            >
              <Icon as={Trash} size={14} className="text-muted-foreground" />
            </Pressable>
          </View>
        ))}

        {interrupted.map((file) => (
          <View key={file.id} className="gap-1">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-body-sm text-foreground min-w-0 flex-1" numberOfLines={1}>{file.name}</Text>
              <Pressable
                onPress={() => void callFiles('abort', { fileId: file.id }).then(refresh)}
                className="active:opacity-60"
              >
                <Text className="text-label text-muted-foreground">{t.cancel}</Text>
              </Pressable>
            </View>
            <Text className="text-label text-muted-foreground">{fill(t.filesInterrupted, { name: file.name })}</Text>
          </View>
        ))}

        {running.map((upload) => {
          const text = message(upload)
          const percent = upload.size ? Math.floor((upload.sent / upload.size) * 100) : 0
          return (
            <View key={upload.key} className="gap-1">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-body-sm text-foreground min-w-0 flex-1" numberOfLines={1}>{upload.name}</Text>
                <Text className="text-label text-muted-foreground">
                  {upload.phase === 'failed' ? size(upload.size) : `${percent}% · ${size(upload.size)}`}
                </Text>
                <Pressable onPress={() => void uploads.cancel(upload.key)} className="active:opacity-60">
                  <Text className="text-label text-muted-foreground">{t.cancel}</Text>
                </Pressable>
              </View>
              {upload.phase !== 'failed' ? (
                <View className="bg-secondary h-1 overflow-hidden rounded-full">
                  <View className="bg-primary h-1" style={{ width: `${percent}%` }} />
                </View>
              ) : null}
              {text ? <Text className="text-label text-muted-foreground">{text}</Text> : null}
            </View>
          )
        })}

        <View className="flex-row flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9" onPress={() => filesInput.current?.click()}>
            <Text className="text-body-sm font-semibold">{t.filesAdd}</Text>
          </Button>
          <Button variant="outline" className="h-9" onPress={() => folderInput.current?.click()}>
            <Text className="text-body-sm font-semibold">{t.filesAddFolder}</Text>
          </Button>
          <Text className="text-label text-muted-foreground">{t.filesDropHint}</Text>
        </View>
      </View>

      <input
        ref={filesInput}
        type="file"
        multiple
        accept={kind === 'finished' ? '.jpg,.jpeg,.png,.heic,.tif,.tiff,.webp' : undefined}
        style={{ display: 'none' }}
        onChange={(e) => {
          add(fromInput(e.target.files))
          e.target.value = ''
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        // Not in React's types; every desktop browser reads it.
        {...{ webkitdirectory: '', directory: '' }}
        style={{ display: 'none' }}
        onChange={(e) => {
          add(fromInput(e.target.files))
          e.target.value = ''
        }}
      />
      {deleteDialog}
    </div>
  )
}

/**
 * `US-038` AC-2 — «Видалити всі файли»: every file of the shoot, both sections,
 * uploads in progress too, after the approved question with the count and the
 * size. Shown once the shoot has files.
 */
export function DeleteAllFiles({ shootId, count }: { shootId: string; count: number }) {
  const t = useStrings()
  const { ask, dialog } = useDestructiveConfirm<FileSummary>({
    label: t.remove,
    question: (summary) => fillSummary(t.filesDeleteAllQuestion, summary, t),
    onConfirm: () => {
      void callFiles('deleteAll', { shootId }).then(() => uploads.changed(shootId))
    },
  })
  if (count === 0) return null
  return (
    <>
      <Button
        variant="outline"
        className="h-9 self-start"
        onPress={() => void shootFilesSummary(shootId).then((summary) => summary && ask(summary))}
      >
        <Text className="text-body-sm font-semibold">{t.filesDeleteAll}</Text>
      </Button>
      {dialog}
    </>
  )
}

/** `US-036` — «Використано 7,3 МБ з 200 ГБ», refreshed when an upload finishes. */
export function FilesQuota() {
  const t = useStrings()
  const [used, setUsed] = useState<number | null>(null)
  const [quota, setQuota] = useState<number | null>(null)

  useEffect(() => {
    const load = () => void filesUsage().then(setUsed)
    load()
    void hostingLimits().then((limits) => setQuota(limits?.quotaBytes ?? null))
    return uploads.onDone(load)
  }, [])

  if (used === null || quota === null) return null
  return (
    <Text className="text-label text-muted-foreground">
      {t.filesQuotaUsed
        .replace('{used}', formatBytes(used, t.byteUnits, t.decimalSeparator))
        .replace('{quota}', formatBytes(quota, t.byteUnits, t.decimalSeparator))}
    </Text>
  )
}

/**
 * `US-036` — the shoot's complete hosted files, both sections: counted with the
 * links in «Файли» and on the «Матеріали» tab (owner, 2026-10-23).
 */
export function useHostedFileCount(shootId: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!shootId) return
    const load = () =>
      void listShootFiles(shootId).then((files) => files && setCount(files.filter((f) => f.status === 'complete').length))
    load()
    return uploads.onDone((id) => id === shootId && load())
  }, [shootId])
  return count
}
