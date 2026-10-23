/**
 * `US-036` — sizes for people. Decimal units (1 GB = 1000 MB), as B2 bills, as
 * Finder shows, and as the 200 GB quota is counted. No `Intl` (Hermes; see
 * `src/features/shoots/home.ts`).
 */

/** «37,4 ГБ» / «37.4 GB» — one decimal, a trailing «,0» dropped; bytes whole. */
export function formatBytes(bytes: number, units: readonly string[], decimalSeparator: string): string {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  const text = unit === 0 ? String(Math.round(value)) : trimZero(value.toFixed(1))
  return `${text.replace('.', decimalSeparator)} ${units[unit]}`
}

/** A size in GB alone, for «Використано {used} з {quota} ГБ». */
export function formatGigabytes(bytes: number, decimalSeparator: string): string {
  return trimZero((bytes / 1e9).toFixed(1)).replace('.', decimalSeparator)
}

const trimZero = (s: string) => s.replace(/\.0$/, '')
