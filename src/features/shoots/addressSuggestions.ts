import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addressSearch,
  type AddressSuggestion,
  type ResolvedPlace,
} from '../../../modules/address-search'

/**
 * How many of Apple's suggestions the list shows. Apple returns up to about
 * fifteen; the list sits inline in the form, under the field, and pushes
 * «Деталі» down by every row. **Not in `US-067`** — a build choice, logged for
 * the owner.
 */
const MAX_SUGGESTIONS = 5

/**
 * `US-067` — the suggestions for «Адреса», from the iOS module.
 *
 * `search` takes every keystroke (AC-1, from the first letter). An answer for a
 * query the field has since moved past is dropped, so a slow reply for «Хре»
 * cannot overwrite the list for «Хрещатик».
 *
 * Off the iPhone `available` is false and the hook does nothing (AC-5).
 */
export function useAddressSuggestions() {
  const [items, setItems] = useState<AddressSuggestion[]>([])
  const latest = useRef('')

  useEffect(() => {
    if (!addressSearch) return
    const subscription = addressSearch.addListener('onSuggestions', (event) => {
      if (event.query === latest.current) setItems(event.items.slice(0, MAX_SUGGESTIONS))
    })
    return () => subscription.remove()
  }, [])

  const search = useCallback((text: string) => {
    if (!addressSearch) return
    const query = text.trim()
    latest.current = query
    if (!query) setItems([])
    // AC-4: a failure is no list and no message.
    addressSearch.setQuery(query).catch(() => {})
  }, [])

  const clear = useCallback(() => {
    latest.current = ''
    setItems([])
    addressSearch?.setQuery('').catch(() => {})
  }, [])

  const resolve = useCallback(async (index: number): Promise<ResolvedPlace | null> => {
    const item = items[index]
    if (!addressSearch || !item) return null
    try {
      return await addressSearch.resolve(index, item.title)
    } catch {
      return null
    }
  }, [items])

  return { available: addressSearch != null, items, search, clear, resolve }
}
