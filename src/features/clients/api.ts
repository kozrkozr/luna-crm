import { supabase } from '../../lib/supabase/client'

/**
 * A client — the person a shoot is for (`ADR-018`).
 *
 * A record the photographer keeps *about* someone, not an account someone
 * holds. `US-010` still stands: no client ever registers, and nothing here
 * issues a credential. They arrive by token, read what the gateway gives them,
 * and cannot log in.
 */
export type Client = {
  id: string
  name: string
  phone: string | null
  instagram: string | null
  /** `20260831160000` — a second handle beside `instagram`. */
  telegram: string | null
  /** `US-028` AC-3 — notes that persist between shoots. Owner-only in code. */
  notes: string | null
  /**
   * How many shoots this client has, for the «3 зйомки» line the search rows
   * and the linked chip both show. Counted by the database, not by fetching the
   * shoots — the screens that show it never need the shoots themselves.
   */
  shootCount: number
}

/*
 * `shoots(count)` is an aggregate over the foreign key, resolved in the same
 * round trip. Soft-deleted shoots are excluded by the shoots SELECT policy, so
 * a deleted shoot stops being counted without a filter here (ADR-014).
 */
const CLIENT_COLUMNS = 'id, name, phone, instagram, telegram, notes, shoots(count)'

type ClientRow = {
  id: string
  name: string
  phone: string | null
  instagram: string | null
  telegram: string | null
  notes: string | null
  /** PostgREST returns an aggregate as a one-element array of `{count}`. */
  shoots: { count: number }[] | null
}

const toClient = (row: ClientRow): Client => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  instagram: row.instagram,
  telegram: row.telegram,
  notes: row.notes,
  shootCount: row.shoots?.[0]?.count ?? 0,
})

/**
 * Digits only, for matching a phone (`US-029` AC-4).
 *
 * Deliberately **not** `normalise_phone` from the crew-matching migration.
 * That one interprets a number by length and prefix and returns NULL for
 * anything it does not recognise, because a wrong match there would show one
 * person another person's shoots across accounts (`S-5` F-2). This is a search
 * box over the photographer's own clients, where the cost of a miss is retyping
 * a number — so it strips and compares, exactly as the mockup's `normPhone`
 * does.
 */
export const digitsOf = (value: string): string => value.replace(/\D/g, '')

/**
 * Every client the creator has, newest first — the «Клієнти» half of
 * «Мої контакти» (`Contacts.dc.html`, owner 2026-09-04).
 *
 * The directory screen groups this table and `contacts` under the artboard's
 * two headings rather than introducing a `kind` column: a client already IS a
 * row here, with the name, handles and between-shoots notes that screen shows.
 *
 * Ordered like `listContacts` so the two halves of one list agree.
 * Soft-deleted rows are excluded by the SELECT policy itself (`ADR-014`), which
 * is why no filter appears here and none can be forgotten (CLAUDE.md rule 3).
 */
export async function listClients(): Promise<Client[] | null> {
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error || !data) return null
  return (data as ClientRow[]).map(toClient)
}

/**
 * `US-029` AC-1 — clients whose name contains `query`, case-insensitively.
 *
 * The two-character threshold is the caller's to enforce; this answers whatever
 * it is asked. Scoped to the creator's own clients by RLS, so one photographer
 * can never see another's client list — no filter is written here and none can
 * be forgotten (`ADR-014`, CLAUDE.md rule 3, which also excludes soft-deleted
 * rows and so satisfies AC-7).
 */
export async function searchClientsByName(query: string): Promise<Client[] | null> {
  const term = query.trim()
  if (term.length < 2) return []

  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    // `%` and `_` are wildcards in ILIKE, so a client typing either would
    // otherwise search for something other than what they typed.
    .ilike('name', `%${term.replace(/[%_\\]/g, '\\$&')}%`)
    .order('created_at', { ascending: true })

  if (error || !data) return null
  return (data as ClientRow[]).map(toClient)
}

/**
 * `US-029` AC-4 — a client whose stored number equals the typed digits, or ends
 * with them.
 *
 * "Ends with" is what makes `0509876543` find a client stored as
 * `+380509876543`. Fetching the creator's clients and comparing in JS rather
 * than in SQL: the stored numbers are free text in whatever shape they were
 * typed, so a SQL comparison would have to strip punctuation per row anyway,
 * and a photographer's client list is small.
 */
export async function findClientByPhone(phone: string): Promise<Client | null> {
  const digits = digitsOf(phone)
  if (digits.length < 9) return null

  const { data, error } = await supabase.from('clients').select(CLIENT_COLUMNS)
  if (error || !data) return null

  const match = (data as ClientRow[]).find((row) => {
    const stored = digitsOf(row.phone ?? '')
    return stored.length > 0 && (stored === digits || stored.endsWith(digits))
  })
  return match ? toClient(match) : null
}

/** One client by id, or null if it is not the caller's or has been removed. */
export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return toClient(data as ClientRow)
}

export type CreateClientInput = {
  name: string
  phone: string | null
  instagram?: string | null
  telegram?: string | null
  /**
   * `US-028` AC-3's between-shoots notes, optional and new on 2026-09-04.
   *
   * The shoot forms create a client without one — `US-029`'s match-or-create
   * has no notes field — but «Новий контакт» does, and dropping what somebody
   * typed would be silent data loss.
   */
  notes?: string | null
}

/**
 * A new client, owned by the signed-in user.
 *
 * `creator_id` is set from the session here rather than by the caller, and the
 * RLS insert policy requires it to equal `auth.uid()` — so a client cannot be
 * created under someone else's account.
 *
 * No uniqueness check. `US-029` AC-5 permits two profiles to share a phone
 * number: the dedup is a question the form asks, not a constraint the database
 * enforces (`ADR-018`).
 */
export async function createClient(input: CreateClientInput): Promise<Client | null> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('clients')
    .insert({
      creator_id: userId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      instagram: input.instagram?.trim() || null,
      telegram: input.telegram?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select(CLIENT_COLUMNS)
    .single()

  if (error || !data) return null
  return toClient(data as ClientRow)
}

/**
 * Update a client's contact details.
 *
 * **This propagates.** An `ADR-018` client has cross-shoot identity, so changing
 * a handle here changes it on every shoot that person appears on — which is the
 * point of the entity existing, and is why a handle is safe to edit from a shoot
 * where the NAME is not.
 *
 * The asymmetry is deliberate and worth stating: a contact detail going stale
 * everywhere at once is the bug this fixes, whereas a name is how the creator
 * recognises the person in a list, and silently rewriting it across their
 * history is a different kind of change. The shoot forms edit the handles and
 * never the name; renaming belongs on the client's own profile (`US-028`).
 *
 * `name` is absent from the input for exactly that reason.
 */
export type UpdateClientInput = {
  phone: string | null
  instagram: string | null
  telegram: string | null
}

export async function updateClient(id: string, input: UpdateClientInput): Promise<boolean> {
  const { error } = await supabase
    .from('clients')
    .update({
      // Empty is stored as null, not '', so "never given" and "cleared" are one
      // state for every later reader — the rule every writer in this codebase
      // follows.
      phone: input.phone?.trim() || null,
      instagram: input.instagram?.trim() || null,
      telegram: input.telegram?.trim() || null,
    })
    .eq('id', id)

  return !error
}

/**
 * Everything «Редагувати контакт» can change about a client.
 *
 * **Separate from `updateClient` on purpose, and the name is why.** That
 * function's own note explains the asymmetry: a shoot form may fix a stale
 * handle, because an `ADR-018` client has cross-shoot identity and the handle
 * going stale everywhere is the bug the entity exists to fix — but it may not
 * rename, because a name is how the creator recognises the person in a list.
 * It ends "renaming belongs on the client's own profile (`US-028`)".
 *
 * This is that place, arriving as «Мої контакти»'s edit form rather than as the
 * client profile screen, which is still a stub. Keeping it a second function
 * means the shoot forms cannot acquire the power to rename by accident.
 */
export type UpdateClientProfileInput = {
  name: string
  phone: string | null
  instagram: string | null
  /** `US-028` AC-3's between-shoots notes — «Нотатки» on the contact form. */
  notes: string | null
}

export async function updateClientProfile(
  id: string,
  input: UpdateClientProfileInput
): Promise<boolean> {
  const { error } = await supabase
    .from('clients')
    .update({
      name: input.name.trim(),
      // Empty stored as null, not '', so "never given" and "cleared" are one
      // state for every later reader.
      phone: input.phone?.trim() || null,
      instagram: input.instagram?.trim() || null,
      // **`telegram` is deliberately not written.** The contact form has no
      // field for it, as drawn, and a save must not clear a handle the shoot
      // form set — the same rule `updateContact` follows for a contact's email.
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)

  return !error
}

/**
 * Remove a client from «Мої контакти» (`ADR-014`, soft).
 *
 * **Through the RPC, and it has to be.** A plain `update` setting `deleted_at`
 * fails the clients SELECT policy — the policy carries `deleted_at is null`, so
 * the new row cannot be read back and Postgres refuses it. The clients
 * migration recorded this, and wrote `soft_delete_client` so that `deleted_at`
 * was reachable at all. **This is its first caller.**
 *
 * `false` when the client is not yours, does not exist, or was already removed —
 * the function cannot tell those apart, deliberately.
 *
 * ── Why the screen only offers this on a client with no shoots ──────────────
 *
 * `SHOOT_COLUMNS` reads a client through `clients(name, …)`, a join under that
 * same SELECT policy. Soft-delete a client who has shoots and the join returns
 * nothing for every one of them, so `clientName` falls back to `''`: the home
 * card, the calendar rows, the shoot detail and the edit form all lose the
 * name. The link views would keep showing it, because the gateway reads with
 * the service role and bypasses RLS — so the creator's own app and the link
 * they sent would disagree.
 *
 * That is the opposite of what the artboard's dialog promises («Зйомки, де він
 * уже доданий, залишаться без змін»), so the control is offered only where the
 * promise is true: `shootCount === 0`. Owner's decision, 2026-09-04. Making it
 * true for a client WITH shoots is a migration — a stored name on the shoot, or
 * a policy that lets the join see removed rows — and its own decision.
 */
export async function deleteClient(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('soft_delete_client', { client_id: id })
  return !error && data === true
}
