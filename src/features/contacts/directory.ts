import type { Client } from '../clients/api'
import type { Strings } from '../../i18n'
import { roleWithEmoji } from '../../i18n/vocabulary'
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
   * **A shoot count for both kinds** (owner, 2026-09-04), and a role in front
   * of it for crew: «Фотограф · 6 зйомок».
   *
   * The count is a departure for a client and an addition for crew. The
   * artboard shows a role on every row, and `clients` has no role column — a
   * client is not cast on a shoot, they are who it is for — so the count took
   * that line; the owner then asked for the same line on crew, where the
   * question it answers is the same one. `shootCountLabel` is the client
   * picker's own copy, so neither is invented.
   */
  sub: string
  phone: string | null
  instagram: string | null
  telegram: string | null
  /** `clients.notes` or `contacts.note` — the creator's own, either way. */
  note: string | null
  /**
   * How many shoots this person is on — `clients.shoots(count)` for a client,
   * `countShootsPerContact` for crew.
   *
   * **It gates «Видалити контакт» for a client only** (see `deleteClient`): a
   * client with shoots cannot be removed without blanking their name on every
   * one of them, while a crew contact can always be removed because
   * `crew_members` rows are different rows. So a crew member's count is a fact
   * on a row, not a permission.
   */
  shootCount: number
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
 * `shootCountLabel` is passed in rather than imported so this module reads no
 * dictionary of its own — the same arrangement `features/shoots/home.ts` uses,
 * and what keeps these functions testable without a language provider.
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

/**
 * A crew contact as a directory row: the role, then the shoot count.
 *
 * `shootCount` comes from `countShootsPerContact`, and **0 is shown**, not
 * hidden — «Візажист · 0 зйомок» on somebody entered by hand is true, and it is
 * the rule the client picker has always followed for a client with none.
 */
export function crewPerson(
  contact: Contact,
  shootCount: number,
  shootCountLabel: (count: number) => string,
  /** `US-044` — the role is a key; this is the language it is shown in. */
  t: Strings
): DirectoryPerson {
  return {
    id: contact.id,
    kind: 'crew',
    name: contact.name,
    /*
      «💄 Візажист · 3 зйомки». The glyph is added HERE rather than at the row,
      because `sub` is already a formatted display line and the row renders it
      verbatim.

      `matchesQuery` searches this string, and that is unchanged in practice: an
      emoji PREFIX leaves «візажист» a substring, so searching by role still
      matches. Only the raw `contact.role` is ever stored; nothing reads `sub`
      back.
    */
    sub: [roleWithEmoji(contact.role, t), shootCountLabel(shootCount)]
      .filter(Boolean)
      .join(' · '),
    phone: contact.phone,
    instagram: contact.instagram,
    telegram: contact.telegram,
    note: contact.note,
    shootCount,
  }
}

/**
 * The artboard's search: the name or the second line, case-insensitively, on the
 * trimmed term.
 *
 * The second line now carries the shoot count for everybody, so «зйомк» matches
 * every row. Harmless, and not worth a special case — the placeholder promises
 * «за імʼям або роллю», and both of those still work.
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
