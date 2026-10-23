import type { FileKind } from './api'

/**
 * `US-036` — hosted files in a shoot's «Файли» section. Native: nothing yet —
 * upload is from the photographer's browser (`ADR-021`); the web build is
 * `HostedFiles.web.tsx`. Showing the files on iOS is not in the story.
 */
export function HostedFiles(_: { shootId: string; kind: FileKind }) {
  return null
}

/** `US-036` — «Використано X з {квота} ГБ». Native: nothing, as above. */
export function FilesQuota() {
  return null
}

/** `US-036` — how many hosted files the shoot has. Native: 0, as above. */
export function useHostedFileCount(_shootId: string) {
  return 0
}
