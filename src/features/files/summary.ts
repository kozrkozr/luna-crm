import type { Strings } from '../../i18n'
import { plural } from '../shoots/home'
import { listShootFiles } from './api'
import { formatBytes } from './format'

/**
 * `US-038` / plan #12 — how many hosted files a shoot has and how much they
 * weigh, for the questions asked before deleting them: «Видалити всі файли
 * зйомки (3 файли, 37,4 ГБ)?» and «Видалити цю зйомку разом із файлами (…)?».
 *
 * Every row counts, uploads in progress too: deleting takes them as well.
 * Works on iOS as well as the web — a shoot deleted on the phone takes its
 * files with it just the same.
 */
export type FileSummary = { count: number; bytes: number }

/** Null when the shoot has no files, or they could not be read. */
export async function shootFilesSummary(shootId: string): Promise<FileSummary | null> {
  const files = await listShootFiles(shootId)
  if (!files || files.length === 0) return null
  return { count: files.length, bytes: files.reduce((sum, f) => sum + f.sizeBytes, 0) }
}

/** `{count}` and `{size}` filled — «3 файли», «37,4 ГБ». */
export function fillSummary(template: string, summary: FileSummary, t: Strings) {
  return template
    .replace('{count}', `${summary.count} ${plural(summary.count, t.fileForms)}`)
    .replace('{size}', formatBytes(summary.bytes, t.byteUnits, t.decimalSeparator))
}

/** The delete-shoot question: plan #12's when the shoot has files. */
export function deleteShootQuestion(summary: FileSummary | null, t: Strings) {
  return summary ? fillSummary(t.confirmDeleteShootWithFiles, summary, t) : t.confirmDeleteShoot
}
