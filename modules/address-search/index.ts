import { NativeModule, requireOptionalNativeModule } from 'expo'

/**
 * `US-067` — Apple Maps suggestions for «Адреса» (`ADR-026`). The Swift side is
 * `ios/AddressSearchModule.swift`.
 *
 * iOS only. In a browser and on Android the module does not exist and
 * `addressSearch` is null — the field stays plain (AC-5).
 */

export type AddressSuggestion = { title: string; subtitle: string }

export type ResolvedPlace = {
  name: string
  /** One line; empty when Apple returns a place with no address. */
  address: string
  /** A venue rather than a street address — decides whether «Назва» fills. */
  isPlace: boolean
}

type Events = {
  onSuggestions: (event: { query: string; items: AddressSuggestion[] }) => void
}

declare class AddressSearchModule extends NativeModule<Events> {
  setQuery(query: string): Promise<void>
  resolve(index: number, title: string): Promise<ResolvedPlace | null>
}

export const addressSearch = requireOptionalNativeModule<AddressSearchModule>('AddressSearch')
