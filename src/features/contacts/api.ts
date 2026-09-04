import { supabase } from '../../lib/supabase/client'

/**
 * «Мої контакти» — the creator's own address book (`ADR-003`, migration
 * `20260904100000`).
 *
 * It replaced a deduplicated view over `crew_members`. What that bought is an
 * **id**: a contact can be opened, profiled and annotated, none of which was
 * possible while `PastCrewMember.key` was a string computed from a name.
 *
 * Private by construction. Every policy on the table is `creator_id =
 * auth.uid()`, no query here takes a creator id — there is no argument that
 * could point at somebody else's book — and nothing from this table is in any
 * link payload (`ADR-013`, CLAUDE.md rule 2).
 */
export type Contact = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
  /** About the person, not about a job — see the migration. */
  note: string | null
}

const CONTACT_COLUMNS = 'id, name, role, phone, email, instagram, telegram, note'

type ContactRow = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
  note: string | null
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    instagram: row.instagram,
    telegram: row.telegram,
    note: row.note,
  }
}

/**
 * The identity two rows share when they are the same person.
 *
 * The same key `crewIdentity` computes, and the same one
 * `contacts_identity_idx` enforces — name casefolded and trimmed, plus whichever
 * contact method exists. Kept here rather than imported from `features/crew` so
 * the directory does not depend on the form that fills it.
 */
export function contactIdentity(
  name: string,
  phone: string | null,
  email: string | null
): string {
  return `${name.trim().toLowerCase()}|${phone ?? email ?? ''}`
}

/**
 * The address book, newest first.
 *
 * **Soft-deleted rows are filtered** (CLAUDE.md rule 3) — deleting a contact is
 * `deleted_at`, and a deleted contact must not reappear in the picker.
 */
export async function listContacts(): Promise<Contact[] | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return null
  return (data as ContactRow[]).map(toContact)
}

/** One contact, for the profile screen. Filters the soft delete like every read. */
export async function getContact(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return toContact(data as ContactRow)
}

/**
 * The contact matching a person's identity, if the creator already knows them.
 *
 * Used to decide whether adding someone to a shoot creates a contact or updates
 * one. Matched in SQL on the same expression the unique index uses, so this
 * cannot disagree with what an insert would be allowed to do.
 */
export async function findContactByIdentity(
  name: string,
  phone: string | null,
  email: string | null
): Promise<Contact | null> {
  /*
    Every row with that name, not `maybeSingle` — two contacts can share a name
    and differ by number, which is a state the unique index allows and
    `maybeSingle` would throw on.

    `ilike` handles the casefold; the contact method cannot be expressed as a
    filter, so the full key is compared here against the same
    `contactIdentity` the index enforces.
  */
  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .is('deleted_at', null)
    .ilike('name', name.trim())

  if (error || !data) return null
  const wanted = contactIdentity(name, phone, email)
  const found = (data as ContactRow[])
    .map(toContact)
    .find((c) => contactIdentity(c.name, c.phone, c.email) === wanted)
  return found ?? null
}

export type ContactInput = {
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
}

/**
 * Remember somebody, or refresh what is remembered about them.
 *
 * Called when a crew member is added to a shoot (owner, 2026-09-03), which is
 * what keeps the book populated by work rather than by data entry — `ADR-003`'s
 * answer to the cold start. `US-005` and `US-029` need amending to say so.
 *
 * **A returning contact is updated, not duplicated**, and only where the new
 * value is non-empty: adding someone from the «Новий контакт» tab without a
 * handle must not blank the handle they already had. `note` is never touched
 * here — it is the creator's writing about the person, and a shoot form has no
 * business in it.
 *
 * Failure is swallowed by the caller on purpose. The address book is a
 * convenience; a shoot that saved must not report an error because remembering
 * the person afterwards did not.
 */
export async function upsertContact(input: ContactInput): Promise<Contact | null> {
  const existing = await findContactByIdentity(input.name, input.phone, input.email)

  if (existing) {
    const patch = {
      role: input.role.trim() || existing.role,
      phone: input.phone?.trim() || existing.phone,
      email: input.email?.trim() || existing.email,
      instagram: input.instagram?.trim() || existing.instagram,
      telegram: input.telegram?.trim() || existing.telegram,
    }
    const { data, error } = await supabase
      .from('contacts')
      .update(patch)
      .eq('id', existing.id)
      .select(CONTACT_COLUMNS)
      .maybeSingle()

    if (error || !data) return existing
    return toContact(data as ContactRow)
  }

  const { data: auth } = await supabase.auth.getUser()
  const creatorId = auth.user?.id
  if (!creatorId) return null

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      creator_id: creatorId,
      name: input.name.trim(),
      role: input.role.trim(),
      // Empty optional fields are stored as null, not '', so "never given" and
      // "cleared" are one state for every later reader — the rule every other
      // writer in this codebase follows.
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      instagram: input.instagram?.trim() || null,
      telegram: input.telegram?.trim() || null,
    })
    .select(CONTACT_COLUMNS)
    .maybeSingle()

  if (error || !data) return null
  return toContact(data as ContactRow)
}
