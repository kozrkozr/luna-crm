import { crewIdentity, splitContact, type AddCrewMemberInput } from './api'

/**
 * `US-064` — crew held on the «Нова зйомка» form, handed between the form and
 * the add screen it opens.
 *
 * The add screen is a route of its own (`new-shoot-crew`), so the two cannot
 * share React state. This is the `nextScreenToast` shape, twice over: the form
 * says who it already holds before it opens the screen, and the screen leaves
 * whoever was picked for the form to take when it regains focus. Both values
 * are read once and nothing subscribes to them.
 *
 * Nothing here touches the database. The form saves the people after
 * `createShoot` (AC-6), and a form left with «Скасувати» simply never takes
 * them (AC-5).
 */
let onForm: Set<string> = new Set()
let pending: AddCrewMemberInput[] = []

/** The key the add screen marks «У команді» with — the same one `US-005` uses. */
export function identityOfInput(person: AddCrewMemberInput): string {
  const { phone, email } = splitContact(person.contact)
  return crewIdentity(person.name, phone, email)
}

/** The form, before opening the add screen: who it already holds. */
export function offerCrewOnForm(people: AddCrewMemberInput[]): void {
  onForm = new Set(people.map(identityOfInput))
  pending = []
}

/** The add screen: who is already on the form. */
export function crewOnForm(): Set<string> {
  return onForm
}

/** The add screen: leave these people for the form. */
export function holdCrew(people: AddCrewMemberInput[]): void {
  pending = [...pending, ...people]
}

/** The form, on regaining focus: take whoever was picked. Reading clears it. */
export function takeHeldCrew(): AddCrewMemberInput[] {
  const people = pending
  pending = []
  return people
}
