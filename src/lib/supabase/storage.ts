import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * Session storage for Supabase Auth.
 *
 * Native uses SecureStore (Keychain) rather than AsyncStorage, because the
 * value being persisted is a refresh token — a long-lived credential for the
 * account. SecureStore caps a value at 2048 bytes and a Supabase session can
 * exceed that once user metadata is attached, so values are chunked; a
 * non-chunked legacy value is still read correctly.
 *
 * Web falls back to localStorage: SecureStore has no web implementation, and
 * the app surface on web is a development convenience, not a shipping target
 * (the shipping web surface is the anonymous link view, which has no session).
 */
const CHUNK_SIZE = 1800
const countKey = (key: string) => `${key}.chunks`

const webStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* storage unavailable — treat as no persistence */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStorage.getItem(key)

    const count = await SecureStore.getItemAsync(countKey(key))
    if (!count) return SecureStore.getItemAsync(key)

    const parts: string[] = []
    for (let i = 0; i < Number(count); i += 1) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`)
      if (part === null) return null // a missing chunk means a corrupt session
      parts.push(part)
    }
    return parts.join('')
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return webStorage.setItem(key, value)

    await this.removeItem(key)

    if (value.length <= CHUNK_SIZE) {
      return SecureStore.setItemAsync(key, value)
    }

    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE))
    }
    for (let i = 0; i < chunks.length; i += 1) {
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i])
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length))
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return webStorage.removeItem(key)

    const count = await SecureStore.getItemAsync(countKey(key))
    if (count) {
      for (let i = 0; i < Number(count); i += 1) {
        await SecureStore.deleteItemAsync(`${key}.${i}`)
      }
      await SecureStore.deleteItemAsync(countKey(key))
    }
    await SecureStore.deleteItemAsync(key)
  },
}
