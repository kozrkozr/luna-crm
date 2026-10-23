/**
 * `US-036` — what a photographer picked or dropped, as files with their place
 * inside a folder. Web only (DOM types); used by `HostedFiles.web.tsx`.
 *
 * A dropped or picked folder becomes one flat list of every file in it and its
 * subfolders (owner, 2026-10-23). Each keeps its path **without the folder
 * itself** — `Весілля/Card1/IMG_0001.CR3` → `Card1/IMG_0001.CR3` — so two cards'
 * `IMG_0001.CR3` stay apart and a folder tree can be drawn later. A loose file
 * has no path.
 */

export type PickedFile = { file: File; relativePath: string | null }

/**
 * macOS and Windows write these into folders by themselves; they are not the
 * photographer's files and would only eat the quota.
 */
const SYSTEM_FILES = ['.DS_Store', 'Thumbs.db', 'desktop.ini']
const isSystemFile = (name: string) => SYSTEM_FILES.includes(name) || name.startsWith('._')

/** Drops the first segment — the folder that was picked or dropped. */
function insideFolder(path: string): string | null {
  const parts = path.split('/').filter(Boolean)
  return parts.length > 1 ? parts.slice(1).join('/') : null
}

/** From `<input type="file">`, with or without `webkitdirectory`. */
export function fromInput(files: FileList | null): PickedFile[] {
  return Array.from(files ?? [])
    .filter((file) => !isSystemFile(file.name))
    .map((file) => ({ file, relativePath: file.webkitRelativePath ? insideFolder(file.webkitRelativePath) : null }))
}

/** From a drop: files as they are, folders walked to the bottom. */
export async function fromDrop(transfer: DataTransfer): Promise<PickedFile[]> {
  const entries = Array.from(transfer.items)
    .map((item) => (item.kind === 'file' ? item.webkitGetAsEntry?.() : null))
    .filter((entry): entry is FileSystemEntry => !!entry)
  if (entries.length === 0) return fromInput(transfer.files)

  const picked: PickedFile[] = []
  for (const entry of entries) {
    if (entry.isFile) {
      const file = await fileOf(entry as FileSystemFileEntry)
      if (!isSystemFile(file.name)) picked.push({ file, relativePath: null })
    } else if (entry.isDirectory) {
      await walk(entry as FileSystemDirectoryEntry, picked)
    }
  }
  return picked
}

async function walk(directory: FileSystemDirectoryEntry, into: PickedFile[]) {
  for (const entry of await readAll(directory)) {
    if (entry.isDirectory) {
      await walk(entry as FileSystemDirectoryEntry, into)
    } else if (entry.isFile) {
      const file = await fileOf(entry as FileSystemFileEntry)
      if (isSystemFile(file.name)) continue
      // `fullPath` is `/Весілля/Card1/IMG_0001.CR3`.
      into.push({ file, relativePath: insideFolder(entry.fullPath) })
    }
  }
}

/** `readEntries` hands out at most 100 at a time; read until it returns none. */
async function readAll(directory: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = directory.createReader()
  const all: FileSystemEntry[] = []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (batch.length === 0) return all
    all.push(...batch)
  }
}

const fileOf = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject))
