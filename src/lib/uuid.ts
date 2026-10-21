import * as Crypto from 'expo-crypto'

/**
 * A random v4 UUID for a Storage path — `expo-crypto` wherever it can, and
 * built from `getRandomValues` where it cannot.
 *
 * On the web `expo-crypto` is the browser's `crypto.randomUUID`, which only
 * exists in a secure context (HTTPS or localhost). The app opened over the LAN
 * at `http://192.168.…:8097` is not one, and uploading a reference threw
 * «randomUUID is not a function» there (owner, 2026-10-20, on an iPhone).
 * `getRandomValues` has no such restriction, and is what `randomUUID` is made
 * of anyway.
 */
export function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function' && globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return Crypto.randomUUID()
}
