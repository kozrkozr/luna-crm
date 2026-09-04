import * as Crypto from 'expo-crypto'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase/client'
import { listContacts, upsertContact } from '../contacts/api'

const BUCKET = 'shoot-media'
const SIGNED_URL_TTL_SECONDS = 3600

export type CrewResponse = 'pending' | 'confirmed' | 'declined'

export type CrewMember = {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  /**
   * `20260831140000` — a second handle beside `instagram`. **No story defines
   * it**; the owner asked for the field on the add-crew form (2026-08-31).
   *
   * Unlike `instagram`, the link gateway does **not** send this to anyone: both
   * crew payloads name their columns explicitly and neither names this one. So
   * a crew member's Telegram is the creator's own note of how to reach them
   * until a story says otherwise — which is the cheap direction to change, since
   * un-shipping a field from an anonymous audience is not.
   */
  telegram: string | null
  /**
   * NEVER sent to a client (`ADR-013`, `US-026`, CLAUDE.md rule 2). This type
   * describes the creator's own view, where the note is theirs to read. The
   * anonymous surfaces do not reuse it — they read a payload the link gateway
   * shapes per audience, and the client's must not contain the field at all.
   */
  note: string | null
  noteImage: string | null
  response: CrewResponse
}

export type AddCrewMemberInput = {
  name: string
  role: string
  /** One field in the UI, as in the prototype — see `splitContact`. */
  contact: string
  instagram: string
  telegram: string
  note: string
  noteImage: string | null
}

/**
 * `US-005` AC-2 — "a phone number or email", with an Instagram handle alone not
 * enough. The prototype offers one «Телефон або email» field; the data model has
 * two columns and a CHECK that at least one is present.
 *
 * An `@` decides it. Not a validating regex: the story asks for a contact
 * method, not a well-formed address, and `US-013`'s login is where an email has
 * to actually work. Rejecting «n.hair» or a phone written «+38 (050) 123» would
 * be inventing a rule nobody wrote.
 */
export function splitContact(contact: string): { phone: string | null; email: string | null } {
  const trimmed = contact.trim()
  if (!trimmed) return { phone: null, email: null }
  return trimmed.includes('@') ? { phone: null, email: trimmed } : { phone: trimmed, email: null }
}


function toCrewMember(row: {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
  note: string | null
  note_image: string | null
  response: string
}): CrewMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone,
    email: row.email,
    instagram: row.instagram,
    telegram: row.telegram,
    note: row.note,
    noteImage: row.note_image,
    response: row.response as CrewResponse,
  }
}

const CREW_COLUMNS =
  'id, name, role, phone, email, instagram, telegram, note, note_image, response'

/**
 * The crew on a shoot, oldest first.
 *
 * No `removed_at is null` filter is written here and none can be forgotten: the
 * policy carries it, along with the parent shoot's liveness (`ADR-014`,
 * CLAUDE.md rule 3). A removed person is simply not selectable.
 */
export async function listCrew(shootId: string): Promise<CrewMember[] | null> {
  const { data, error } = await supabase
    .from('crew_members')
    .select(CREW_COLUMNS)
    .eq('shoot_id', shootId)
    .order('created_at', { ascending: true })

  if (error || !data) return null
  return data.map(toCrewMember)
}

/** `US-005` AC-1. */
export async function addCrewMember(
  shootId: string,
  input: AddCrewMemberInput
): Promise<CrewMember | null> {
  const { phone, email } = splitContact(input.contact)
  /*
    **The AC-2 guard is gone.** It refused a crew member with neither a phone
    nor an email, ahead of the CHECK constraint that would have refused it too.
    Both went on 2026-09-03 when the owner made the contact optional (migration
    `20260903140000`) — but this one was missed that day, so the form offered an
    optional field and the insert returned `null` for it. The form reported
    «Не вдалося додати учасника» on a row it was right to accept.
  */

  const { data, error } = await supabase
    .from('crew_members')
    .insert({
      shoot_id: shootId,
      name: input.name.trim(),
      role: input.role,
      phone,
      email,
      // Empty optional fields are stored as null, not '', so "never given" and
      // "cleared" are one state for every later reader.
      instagram: input.instagram.trim() || null,
      telegram: input.telegram.trim() || null,
      note: input.note.trim() || null,
      note_image: input.noteImage,
    })
    .select(CREW_COLUMNS)
    .single()

  if (error || !data) return null

  /*
    Remember them (owner, 2026-09-03). Adding somebody to a shoot puts them in
    «Мої контакти», which is what keeps the book populated by work rather than
    by data entry — `ADR-003`'s answer to the cold start it warned about.

    **Awaited but not checked.** The crew member is saved; the address book is a
    convenience, and a shoot that succeeded must not report failure because
    remembering the person afterwards did not. `upsertContact` updates a
    returning contact rather than duplicating them, and never touches their
    note.
  */
  await upsertContact({
    name: input.name,
    role: input.role,
    phone,
    email,
    instagram: input.instagram,
    telegram: input.telegram,
  })

  return toCrewMember(data)
}

/**
 * `US-022` AC-1 — take someone off the shoot; their link stops working.
 *
 * Goes through a SECURITY DEFINER function rather than an UPDATE, for the same
 * reason deleting a shoot does: the SELECT policy's `removed_at is null` is
 * applied to the new row, so a plain soft delete cannot be written. The
 * reasoning is in the migration.
 *
 * The function does its own authorisation — the crew member has to be on a
 * shoot the caller created — so this is not a bare escape hatch. `false` means
 * it did none of that, and deliberately does not say which.
 *
 * `ADR-014` does the revocation: `removed_at` is what the link gateway reads,
 * so this ends one person's access and nobody else's (`prd.md` R-05).
 */
export async function removeCrewMember(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('soft_remove_crew_member', { crew_member_id: id })
  return !error && data === true
}

/**
 * `US-005` AC-1 — "optionally a note with an image attached". One image, not a
 * video: the story's Out of scope says only images were named for notes, and
 * that video here "would be a new ask".
 *
 * Path shape matches the bucket policy — first segment is the shoot id, so this
 * inherits the same ownership rules as references and location media.
 */
export async function uploadCrewNoteImage(
  shootId: string,
  asset: ImagePicker.ImagePickerAsset
): Promise<string | null> {
  const mimeType = asset.mimeType?.toLowerCase() ?? ''
  const ext = IMAGE_EXTENSIONS[mimeType]
  if (!ext) return null

  let body: ArrayBuffer
  try {
    const response = await fetch(asset.uri)
    body = await response.arrayBuffer()
  } catch {
    return null
  }

  const path = `${shootId}/crew/${Crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: mimeType })
  return error ? null : path
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
}

/** The bucket is private, so display always goes through a signed URL. */
export async function signedCrewNoteImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return null
  return data.signedUrl
}

/**
 * Crew names for many shoots at once, keyed by shoot id.
 *
 * ADR-017's shoot list shows each row's crew as a stack of initial avatars, so
 * the list screen needs crew for every shoot it renders. One `in` query rather
 * than `listCrew` per row: a photographer with thirty shoots would otherwise
 * fire thirty requests to draw thirty small circles.
 *
 * Only the name is selected. Initials are all the row draws, and nothing else
 * about a crew member belongs on a screen that shows every shoot at once —
 * least of all `note`, the one field ADR-013 exists to contain.
 *
 * Removed members are excluded by the same RLS policy that excludes them
 * everywhere else (ADR-014, CLAUDE.md rule 3), so no filter is written here and
 * none can be forgotten.
 */
export async function listCrewNamesForShoots(
  shootIds: string[]
): Promise<Record<string, string[]> | null> {
  if (shootIds.length === 0) return {}

  const { data, error } = await supabase
    .from('crew_members')
    .select('shoot_id, name')
    .in('shoot_id', shootIds)
    .order('created_at', { ascending: true })

  if (error || !data) return null

  const byShoot: Record<string, string[]> = {}
  for (const row of data as { shoot_id: string; name: string }[]) {
    ;(byShoot[row.shoot_id] ??= []).push(row.name)
  }
  return byShoot
}

/**
 * A person the creator has worked with before — the «Збережені контакти» the
 * add-crew screen offers instead of retyping someone for the fourth time.
 */
export type PastCrewMember = {
  /**
   * The contact's id, since 2026-09-04. It was synthetic — computed from the
   * name and contact method, because the list was a dedupe rather than a
   * table — which is why nothing could link to a contact until now.
   */
  key: string
  name: string
  role: string
  phone: string | null
  email: string | null
  instagram: string | null
  telegram: string | null
}

/**
 * What counts as "the same person" across shoots.
 *
 * Name plus whichever contact was stored. **Not name alone:** two different
 * people called «Олена Сич» would collapse into one, and the contact is the only
 * thing telling them apart. Not the id either — `ADR-003` makes a person on
 * three shoots three unrelated rows, so there is no shared id to key on.
 *
 * Exported because two callers must agree on it: `listPastCrew` deduplicates
 * with it, and the add screen marks a contact «У команді» with it. If they
 * disagreed, someone already on the shoot would be offered again and added
 * twice.
 */
export function crewIdentity(name: string, phone: string | null, email: string | null): string {
  return `${name.trim().toLowerCase()}|${phone ?? email ?? ''}`
}

/**
 * «Мої контакти» — now a read of the `contacts` table.
 *
 * **It deduplicated `crew_members` in memory until 2026-09-04.** That is why
 * `PastCrewMember.key` was synthetic and why a contact could not be opened: the
 * list was computed, so there was nothing to link to. Migration
 * `20260904100000` made it a table and backfilled it from exactly this dedupe,
 * so nobody's list changed on the way across.
 *
 * The shape is unchanged for callers — the add-crew picker and its search read
 * the same fields — except that `key` is a real id now.
 */
export async function listPastCrew(): Promise<PastCrewMember[] | null> {
  const contacts = await listContacts()
  if (!contacts) return null
  return contacts.map((contact) => ({
    key: contact.id,
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    email: contact.email,
    instagram: contact.instagram,
    telegram: contact.telegram,
  }))
}

/**
 * How many shoots each person in «Команда» is actually on, keyed by the same
 * identity `contactIdentity` computes.
 *
 * «Мої контакти» shows a client's shoot count from `clients.shoots(count)`, an
 * aggregate over a foreign key. A crew contact has no such key: `ADR-003` makes
 * a person on three shoots three unrelated `crew_members` rows, and the
 * directory row that represents them is matched by name-plus-contact. So the
 * counting happens here (owner asked for parity, 2026-09-04).
 *
 * **Both filters rule 3 asks for are already in the policy.**
 * `crew_members_via_shoot` is `removed_at is null AND exists(shoot … creator =
 * auth.uid() AND deleted_at is null)`, so this select returns only live rows on
 * the creator's own live shoots — someone taken off a shoot stops being counted
 * for it, and a deleted shoot stops counting for everyone, without a filter
 * written here. That matches what a client's count does, where the shoots
 * SELECT policy excludes deleted shoots from the aggregate.
 *
 * **Distinct shoots, not rows.** Nothing stops the same person being added to
 * one shoot twice, and "on 4 shoots" must not become 5 because of it.
 *
 * A miss is possible and harmless: the key is `name|phone ?? email ?? ''`, so a
 * crew row carrying a phone will not match a contact that has only an email.
 * Backfilled contacts cannot disagree — the migration derived them from these
 * rows with this key — and a contact created by hand has no crew rows to count.
 * The row then shows its role alone, which is what it showed before.
 */
export async function countShootsPerContact(): Promise<Record<string, number> | null> {
  const { data, error } = await supabase
    .from('crew_members')
    .select('shoot_id, name, phone, email')

  if (error || !data) return null

  const shootsByIdentity: Record<string, Set<string>> = {}
  for (const row of data as {
    shoot_id: string
    name: string
    phone: string | null
    email: string | null
  }[]) {
    const key = crewIdentity(row.name, row.phone, row.email)
    ;(shootsByIdentity[key] ??= new Set()).add(row.shoot_id)
  }

  const counts: Record<string, number> = {}
  for (const [key, shoots] of Object.entries(shootsByIdentity)) counts[key] = shoots.size
  return counts
}
