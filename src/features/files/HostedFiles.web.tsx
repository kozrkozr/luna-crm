import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Button } from '../../components/ui/button'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { formatDayMonthYear } from '../shoots/date'
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
        return fill(t.filesExpired, { date: deleteAt ? formatDayMonthYear(deleteAt.slice(0, 10), t.monthsGenitive) : '' })
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
        {stored.map((file) => (
          <View key={file.id} className="flex-row items-center justify-between gap-3">
            <Text className="text-body-sm text-foreground min-w-0 flex-1" numberOfLines={1}>{file.name}</Text>
            <Text className="text-label text-muted-foreground">{size(file.sizeBytes)}</Text>
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
    </div>
  )
}

/** `US-036` — «Використано X з {квота} ГБ», refreshed when an upload finishes. */
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
        .replace('{used}', formatGigabytes(used, t.decimalSeparator))
        .replace('{quota}', formatGigabytes(quota, t.decimalSeparator))}
    </Text>
  )
}
