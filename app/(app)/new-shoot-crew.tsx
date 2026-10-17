import { AddCrewScreen } from '../../src/features/crew/AddCrewScreen'
import { crewOnForm, holdCrew } from '../../src/features/crew/draftCrew'
import type { AddCrewMemberInput } from '../../src/features/crew/api'

/*
  Module-level, so the screen's focus effect does not re-run on every render.
  Holding cannot fail, so every person counts as added.
*/
const loadOnShoot = async () => crewOnForm()
const add = async (people: AddCrewMemberInput[]) => {
  holdCrew(people)
  return people.length
}

/**
 * `US-064` — `US-005`'s add screen, opened from the «Нова зйомка» form. The
 * people picked here are held on the form, not saved (AC-2, AC-5), and no
 * toast says otherwise.
 */
export default function NewShootCrewScreen() {
  return <AddCrewScreen loadOnShoot={loadOnShoot} add={add} announce={false} />
}
