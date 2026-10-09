import { SpikeScreen } from '../../src/features/subscription/SpikeScreen'

/**
 * The paywall's route — `US-052` AC-2 opens it from every create, edit and
 * delete action, and from the view-mode banner (AC-9).
 *
 * **A stand-in until `US-051`**, which builds the real screen from
 * `Paywall copy.dc.html`. It shows `S-7`'s purchase screen for now, so the
 * whole loop — view mode, purchase, access back — can be tried on a dev build.
 * No build ships before EP-09 is complete (owner, 2026-10-09).
 */
export default SpikeScreen
