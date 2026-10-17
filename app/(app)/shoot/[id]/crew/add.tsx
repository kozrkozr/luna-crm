import { useCallback } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { AddCrewScreen } from '../../../../../src/features/crew/AddCrewScreen'
import {
  addCrewMember,
  crewIdentity,
  listCrew,
  type AddCrewMemberInput,
} from '../../../../../src/features/crew/api'

/** `US-005` — add crew to a shoot that exists; each person is saved at once. */
export default function AddCrewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const loadOnShoot = useCallback(async () => {
    const current = await listCrew(id)
    return new Set((current ?? []).map((m) => crewIdentity(m.name, m.phone, m.email)))
  }, [id])

  const add = useCallback(
    async (people: AddCrewMemberInput[]) => {
      /*
        Sequential, not `Promise.all`. Six parallel inserts against one table gain
        nothing a photographer would notice, and a partial failure in a batch is
        much harder to report honestly than one that stops where it stopped.
      */
      let count = 0
      for (const person of people) {
        if (!(await addCrewMember(id, person))) break
        count += 1
      }
      return count
    },
    [id]
  )

  return <AddCrewScreen loadOnShoot={loadOnShoot} add={add} announce />
}
