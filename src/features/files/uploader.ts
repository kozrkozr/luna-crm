import { callFiles, isPhoto, PERMANENT, type FileKind, type Refusal } from './api'
import type { PickedFile } from './collect'

/**
 * `US-036` — the upload queue, in the browser. No UI here: `HostedFiles.web.tsx`
 * subscribes and draws what it is told.
 *
 * Each file is admitted by the `files` function (`start` reserves its size
 * against the quota), sliced with `File.slice`, and its parts PUT straight to
 * the store over presigned URLs, four in flight across the whole queue. What
 * S-6 (`docs/spikes/S-6-large-upload-to-b2.md`) taught, in code:
 *
 *   F-2  a part with no progress for 60 s is aborted and sent again;
 *   F-3  transient failures (network, a busy store) are retried without limit,
 *        the pause growing to a minute;
 *   F-5  the browser cannot see why the store refused (no CORS on its errors),
 *        so after three failures in a row the function is asked whether the
 *        upload may go on — a permanent refusal stops it with the reason;
 *   F-7  an unfinished upload is remembered here (localStorage) by shoot,
 *        section, path, size and date, so picking the same file again resumes
 *        from the parts the store already holds.
 */

export type Phase = 'waiting' | 'uploading' | 'slow' | 'offline' | 'done' | 'failed'

export type Upload = {
  /** Local, for the list; the row's id is `fileId` once started. */
  key: string
  shootId: string
  kind: FileKind
  name: string
  size: number
  sent: number
  phase: Phase
  /** Why it failed. */
  reason?: Refusal
  fileId?: string
}

type Task = Upload & {
  file: File
  relativePath: string | null
  partSize: number
  partCount: number
  /** Part numbers not yet in the store. */
  pending: number[]
  /** Bytes of parts in the store. */
  stored: number
  /** Bytes in flight, per part. */
  inFlight: Map<number, number>
  failuresInARow: number
  started: boolean
}

const PARALLEL = 4
const STALL_MS = 60_000
const CHECK_AFTER_FAILURES = 3
const RESUME_KEY = 'luna-uploads'

type Listener = (uploads: Upload[]) => void
type DoneListener = (shootId: string) => void

const fingerprint = (shootId: string, kind: FileKind, picked: PickedFile) =>
  [shootId, kind, picked.relativePath ?? picked.file.name, picked.file.size, picked.file.lastModified].join('|')

function readResume(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeResume(change: (map: Record<string, string>) => void) {
  try {
    const map = readResume()
    change(map)
    localStorage.setItem(RESUME_KEY, JSON.stringify(map))
  } catch {}
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const online = () =>
  navigator.onLine ? Promise.resolve() : new Promise<void>((resolve) => window.addEventListener('online', () => resolve(), { once: true }))

/** One part, PUT with progress; resolves when the store has it. */
function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    let watchdog = setTimeout(() => xhr.abort(), STALL_MS)
    xhr.upload.onprogress = (e) => {
      clearTimeout(watchdog)
      watchdog = setTimeout(() => xhr.abort(), STALL_MS)
      onProgress(e.loaded)
    }
    xhr.onloadend = () => clearTimeout(watchdog)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('network'))
    xhr.onabort = () => reject(new Error(signal.aborted ? 'cancelled' : 'stalled'))
    signal.addEventListener('abort', () => xhr.abort())
    xhr.send(blob)
  })
}

class UploadQueue {
  private tasks: Task[] = []
  private listeners = new Set<Listener>()
  private doneListeners = new Set<DoneListener>()
  private workers = 0
  private aborts = new Map<string, AbortController>()
  /** Serialises picking the next part, so two workers never start one file twice. */
  private picking: Promise<unknown> = Promise.resolve()

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => void this.listeners.delete(listener)
  }

  /** Called when a file of that shoot has finished — the list should refetch. */
  onDone(listener: DoneListener) {
    this.doneListeners.add(listener)
    return () => void this.doneListeners.delete(listener)
  }

  add(shootId: string, kind: FileKind, picked: PickedFile[]) {
    for (const p of picked) {
      // The same file picked twice while it is still going: one upload is enough.
      const print = fingerprint(shootId, kind, p)
      if (this.tasks.some((t) => fingerprint(t.shootId, t.kind, t) === print && !['done', 'failed'].includes(t.phase))) continue
      const task: Task = {
        key: `${print}#${Math.random()}`,
        shootId,
        kind,
        name: p.relativePath ? p.relativePath.split('/').join(' · ') : p.file.name,
        size: p.file.size,
        sent: 0,
        phase: 'waiting',
        file: p.file,
        relativePath: p.relativePath,
        partSize: 0,
        partCount: 0,
        pending: [],
        stored: 0,
        inFlight: new Map(),
        failuresInARow: 0,
        started: false,
      }
      // Caught here, before a byte or a call: finished photos are photos.
      if (kind === 'finished' && !isPhoto(p.file.name)) {
        task.phase = 'failed'
        task.reason = 'not_a_photo'
      }
      this.tasks.push(task)
      this.aborts.set(task.key, new AbortController())
    }
    this.emit()
    while (this.workers < PARALLEL) {
      this.workers++
      void this.work().finally(() => this.workers--)
    }
  }

  /** Stops an upload and gives its space back; a stored file is `US-038`'s. */
  async cancel(key: string) {
    const task = this.tasks.find((t) => t.key === key)
    if (!task) return
    this.aborts.get(key)?.abort()
    this.aborts.delete(key)
    this.tasks = this.tasks.filter((t) => t !== task)
    this.emit()
    if (task.fileId && task.phase !== 'done') {
      writeResume((map) => delete map[fingerprint(task.shootId, task.kind, task)])
      await callFiles('abort', { fileId: task.fileId })
      this.doneListeners.forEach((l) => l(task.shootId))
    }
  }

  /** Drops finished and failed rows of a shoot from the list. */
  clear(shootId: string) {
    this.tasks = this.tasks.filter((t) => t.shootId !== shootId || !['done', 'failed'].includes(t.phase))
    this.emit()
  }

  /** The file ids this tab is uploading — the rest of the `uploading` rows were interrupted. */
  activeFileIds(): Set<string> {
    return new Set(this.tasks.filter((t) => t.fileId && t.phase !== 'failed').map((t) => t.fileId!))
  }

  private snapshot(): Upload[] {
    return this.tasks.map(({ key, shootId, kind, name, size, sent, phase, reason, fileId }) => ({
      key, shootId, kind, name, size, sent, phase, reason, fileId,
    }))
  }

  private emit() {
    const snapshot = this.snapshot()
    this.listeners.forEach((l) => l(snapshot))
  }

  private progress(task: Task) {
    task.sent = task.stored + [...task.inFlight.values()].reduce((sum, n) => sum + n, 0)
    this.emit()
  }

  private fail(task: Task, reason: Refusal) {
    task.phase = 'failed'
    task.reason = reason
    task.pending = []
    if (reason !== 'network' && reason !== 'store') {
      writeResume((map) => delete map[fingerprint(task.shootId, task.kind, task)])
    }
    this.emit()
  }

  /** Admits a file: resumes a remembered upload, or starts one. */
  private async begin(task: Task): Promise<boolean> {
    task.started = true
    task.phase = 'uploading'
    this.emit()
    const print = fingerprint(task.shootId, task.kind, task)
    const remembered = readResume()[print]
    if (remembered) {
      const listed = await callFiles<{ parts: { partNumber: number; size: number }[] }>('listParts', { fileId: remembered })
      if (listed.ok) {
        task.fileId = remembered
        task.partSize = partSizeFor(task.size)
        task.partCount = Math.max(1, Math.ceil(task.size / task.partSize))
        const held = new Set(listed.data.parts.map((p) => p.partNumber))
        task.stored = listed.data.parts.reduce((sum, p) => sum + p.size, 0)
        task.pending = range(task.partCount).filter((n) => !held.has(n))
        this.progress(task)
        return true
      }
      writeResume((map) => delete map[print])
    }
    const started = await callFiles<{ fileId: string; partSize: number; partCount: number }>('start', {
      shootId: task.shootId,
      kind: task.kind,
      name: task.file.name,
      relativePath: task.relativePath,
      size: task.size,
      contentType: task.file.type,
    })
    if (!started.ok) {
      this.fail(task, started.reason)
      return false
    }
    task.fileId = started.data.fileId
    task.partSize = started.data.partSize
    task.partCount = started.data.partCount
    task.pending = range(task.partCount)
    writeResume((map) => (map[print] = started.data.fileId))
    return true
  }

  /** The next part to send, starting files in order as their turn comes. */
  private next(): Promise<{ task: Task; part: number } | null> {
    const pick = this.picking.then(async () => {
      for (const task of this.tasks) {
        if (task.phase === 'failed' || task.phase === 'done') continue
        if (!task.started && !(await this.begin(task))) continue
        const part = task.pending.shift()
        if (part !== undefined) return { task, part }
      }
      return null
    })
    this.picking = pick.catch(() => null)
    return pick
  }

  private async work() {
    for (;;) {
      const job = await this.next()
      if (!job) return
      await this.send(job.task, job.part)
      if (job.task.phase !== 'failed' && job.task.pending.length === 0 && job.task.inFlight.size === 0 &&
          job.task.stored === job.task.size) {
        await this.complete(job.task)
      }
    }
  }

  private async send(task: Task, part: number) {
    const start = (part - 1) * task.partSize
    const blob = task.file.slice(start, Math.min(start + task.partSize, task.size))
    const controller = this.aborts.get(task.key)!
    for (let attempt = 1; ; attempt++) {
      if (task.phase === 'failed' || controller.signal.aborted || !this.tasks.includes(task)) return
      try {
        if (!navigator.onLine) {
          task.phase = 'offline'
          this.emit()
          await online()
        }
        const signed = await callFiles<{ urls: Record<number, string> }>('signParts', { fileId: task.fileId, partNumbers: [part] })
        if (!signed.ok) throw signed.reason
        await putPart(signed.data.urls[part], blob, (loaded) => {
          task.inFlight.set(part, loaded)
          this.progress(task)
        }, controller.signal)
        task.inFlight.delete(part)
        task.stored += blob.size
        task.failuresInARow = 0
        if (task.phase === 'slow' || task.phase === 'offline') task.phase = 'uploading'
        this.progress(task)
        return
      } catch (e) {
        task.inFlight.delete(part)
        this.progress(task)
        if (controller.signal.aborted) return
        if (typeof e === 'string' && PERMANENT.includes(e as Refusal)) return this.fail(task, e as Refusal)
        task.failuresInARow++
        if (task.failuresInARow >= CHECK_AFTER_FAILURES) {
          const check = await callFiles('check', { fileId: task.fileId })
          if (!check.ok && PERMANENT.includes(check.reason)) return this.fail(task, check.reason)
          task.phase = navigator.onLine ? 'slow' : 'offline'
          this.emit()
        }
        await sleep(Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)))
      }
    }
  }

  private async complete(task: Task) {
    for (let attempt = 1; ; attempt++) {
      const done = await callFiles('complete', { fileId: task.fileId })
      if (done.ok) {
        task.phase = 'done'
        task.sent = task.size
        writeResume((map) => delete map[fingerprint(task.shootId, task.kind, task)])
        this.emit()
        this.doneListeners.forEach((l) => l(task.shootId))
        return
      }
      if (PERMANENT.includes(done.reason) || done.reason === 'incomplete') return this.fail(task, done.reason)
      await sleep(Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)))
    }
  }
}

/** Must match the function's: 100 MiB, or more to stay within 10 000 parts. */
function partSizeFor(size: number) {
  const MiB = 1024 * 1024
  return Math.max(100 * MiB, Math.ceil(size / 10_000 / MiB) * MiB)
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

/** One queue per tab: uploads go on while the photographer moves between shoots. */
export const uploads = new UploadQueue()

/*
 * Closing or reloading the tab mid-upload asks first (owner, 2026-10-23). The
 * browser shows its own wording — a page cannot set the text any more — so
 * there is no copy here. Moving between screens inside the app does not ask:
 * the queue lives on.
 */
let running = false
uploads.subscribe((all) => {
  running = all.some((u) => u.phase !== 'done' && u.phase !== 'failed')
})
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (!running) return
    event.preventDefault()
    // Older Chrome and Safari still want this set.
    event.returnValue = ''
  })
}
