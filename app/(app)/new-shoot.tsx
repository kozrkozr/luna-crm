import { ShootForm } from '../../src/features/shoots/ShootForm'

/**
 * `US-002` — create a shoot.
 *
 * The screen is `ShootForm` in create mode. It was ~470 lines of its own until
 * 2026-09-03, when the owner asked for one form serving both creation and
 * editing: the two had been drifting field by field, and every alignment pass
 * had to be applied twice.
 *
 * What create mode means, in full: nothing is loaded, past dates are refused,
 * the save calls `createShoot`, and the header and CTA read «Нова зйомка» /
 * «Створити зйомку». Everything else — the client search, `US-029`'s phone
 * match, the date and time, the location, the notes — is the same code the edit
 * screen runs.
 */
export default function NewShootScreen() {
  return <ShootForm mode="create" />
}
