/**
 * "The creator's shoots just changed" — raised by `./api.ts` after a create,
 * edit or delete, heard by whoever needs to react (`US-041`'s reminders).
 *
 * A listener list rather than a direct call so `api.ts` does not import the
 * reminders, which import `api.ts` for `listShoots` — a require cycle Metro
 * warns about and that can hand one side an uninitialised module.
 */
type Listener = () => void

const listeners = new Set<Listener>()

export function onShootsChanged(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function shootsChanged(): void {
  for (const listener of listeners) listener()
}
