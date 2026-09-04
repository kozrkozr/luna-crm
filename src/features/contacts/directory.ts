import type { Client } from '../clients/api'
import type { Contact } from './api'

/**
 * «Мої контакти» as one list over two tables — `Contacts.dc.html` (owner,
 * 2026-09-04).
 *
 * The artboard groups people under **«Клієнти»** and **«Команда»** and carries a
 * `kind` on every person. Ours does not need a column for it: the two groups are
 * already two tables, both `creator_id = auth.uid()`, both soft-deletable.
 *
 * - **«Клієнти»** — `clients` (`ADR-018`). Cross-shoot identity, between-shoots
 *   notes, and a shoot count the database keeps.
 * - **«Команда»** — `contacts` (`ADR-003`, migration `20260904100000`). The crew
 *   address book, populated by adding people to shoots.
 *
 * Pure functions, no queries: the screen loads both tables once on focus and
 * search and filter run over what is in memory, the way the calendar's date
 * filter does. A photographer's address book is small, and typing then does not
 * hit the network.
 */
export type DirectoryKind = 'client' | 'crew'

export type DirectoryPerson = {
  /** The row's own id, in its own table. `kind` says which table that is. */
  id: string
  kind: DirectoryKind
  name: string
  /**
   * The row's second line.
   *
   * A crew member's role, as drawn. **A client's is their shoot count**, which
   * is a departure: the artboard shows a role there («Портретні зйомки») and
   * `clients` has no role column — a client is not cast on a shoot, they are
   * who it is for. The count is the line the client picker on the shoot form
   * already shows for the same rows, so it is existing copy rather than
   * invented copy.
   */
  sub: string
  phone: string | null
  instagram: string | null
  telegram: string | null
  /** `clients.notes` or `contacts.note` — the creator's own, either way. */
  note: string | null
  /**
   * How many shoots a client has. `null` for crew, whose shoots are
   * `crew_members` rows nothing here counts.
   *
   * Read by the profile screen to decide whether «Видалити контакт» is offered
   * at all — see `deleteClient`.
   */
  shootCount: number | null
}

/** Which half of the list to show — the artboard's three chips. */
export type DirectoryFilter = 'all' | 'client' | 'crew'

export type DirectoryGroup = {
  kind: DirectoryKind
  people: DirectoryPerson[]
}

/**
 * A client as a directory row.
 *
 * `shootCountForms` is the dictionary's plural table for «зйомка», passed in so
 * this module reads no dictionary of its own — the same arrangement
 * `features/shoots/home.ts` uses.
 */
export function clientPerson(
  client: Client,
  shootCountLabel: (count: number) => string
): DirectoryPerson {
  return {
    id: client.id,
    kind: 'client',
    name: client.name,
    sub: shootCountLabel(client.shootCount),
    phone: client.phone,
    instagram: client.instagram,
    telegram: client.telegram,
    note: client.notes,
    shootCount: client.shootCount,
  }
}

/** A crew contact as a directory row. */
export function crewPerson(contact: Contact): DirectoryPerson {
  return {
    id: contact.id,
    kind: 'crew',
    name: contact.name,
    sub: contact.role,
    phone: contact.phone,
    instagram: contact.instagram,
    telegram: contact.telegram,
    note: contact.note,
    shootCount: null,
  }
}

/**
 * The artboard's search: name or role, case-insensitively, on the trimmed term.
 *
 * The same two fields the add-crew screen's search covers, and for a client the
 * second field is the shoot-count line — searching «зйомк» would match every
 * client, which is harmless and not worth a special case.
 */
export function matchesQuery(person: DirectoryPerson, query: string): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return (
    person.name.toLowerCase().includes(term) || person.sub.toLowerCase().includes(term)
  )
}

/**
 * The groups to render, in the artboard's order: «Клієнти» then «Команда».
 *
 * **A group with nobody in it is dropped**, heading and count included, exactly
 * as `groups.push` is conditional in the artboard. That is what makes one filter
 * chip enough to hide a half: filtering to «Команда» leaves the clients group
 * empty, and an empty group renders nothing rather than an empty card.
 */
export function directoryGroups(
  people: DirectoryPerson[],
  filter: DirectoryFilter,
  query: string
): DirectoryGroup[] {
  const visible = people.filter(
    (person) =>
      matchesQuery(person, query) && (filter === 'all' || person.kind === filter)
  )

  return (['client', 'crew'] as const)
    .map((kind) => ({ kind, people: visible.filter((person) => person.kind === kind) }))
    .filter((group) => group.people.length > 0)
}
