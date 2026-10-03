import { useCallback, useRef } from 'react'

/**
 * risks.md R-4: a signed media URL expires while the link token never does, so
 * an idle link view can hold dead images on an otherwise valid page. The remedy
 * CLAUDE.md names is re-requesting the payload, which brings fresh URLs.
 *
 * Throttled because an image can also fail for a reason a new URL does not fix
 * (the object is gone, the network is down). Without the gate, that image would
 * re-request the payload on every render of the fresh one — a loop against the
 * gateway. One re-request per window is enough for the case this exists for.
 */
const MIN_INTERVAL_MS = 30_000

export function useMediaReload(reload: () => Promise<void> | void): () => void {
  const last = useRef(0)
  return useCallback(() => {
    const now = Date.now()
    if (now - last.current < MIN_INTERVAL_MS) return
    last.current = now
    void reload()
  }, [reload])
}
