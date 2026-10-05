import * as Crypto from 'expo-crypto'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase/client'
import { clearReminders } from '../reminders/sync'

const BUCKET = 'avatars'
const SIGNED_URL_TTL_SECONDS = 3600

/**
 * Writing the signed-in user's own profile.
 *
 * **No story covers this** — `US-016` is viewing. The owner asked for an
 * editing screen on 2026-08-31 (`Edit Profile.dc.html`); logged.
 *
 * Every write here is scoped by RLS to `auth.uid() = id`, so none of these
 * functions takes a user id: there is no argument that could point at somebody
 * else.
 */

export type ProfileUpdate = {
  name: string
  phone: string | null
  role: string
  socialHandle: string | null
  telegram: string | null
  /**
   * The three avatar columns, always written together.
   *
   * `users_avatar_one_of` allows a photo, or an emoji WITH a tint, or nothing —
   * so a caller that set an emoji without clearing `avatarUrl` would be
   * rejected by the database rather than quietly producing a fourth state.
   * Passing all three on every save is what makes that impossible to get wrong:
   * there is no partial update to forget.
   */
  avatarUrl: string | null
  avatarEmoji: string | null
  avatarTint: string | null
}

/**
 * **`email` is deliberately absent.** It is the login credential, so changing it
 * means `auth.updateUser({ email })` rather than a table write — and
 * `double_confirm_changes = true` (config.toml) mails BOTH the old and the new
 * address, so it does not take effect when the form saves.
 *
 * There is a sharper reason too: `public.users.email` is the crew-matching key
 * (`match_contact_to_user`, migration 20260827100000). Writing it here without
 * the auth side would leave the app showing an address you cannot log in with,
 * and writing the auth side without this one would leave crew matching on the
 * old address. Owner's decision, 2026-08-31: the row is read-only until someone
 * builds both halves.
 */
export async function updateProfile(input: ProfileUpdate): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({
      name: input.name.trim(),
      // Empty optional fields are stored as null, not '', so "never given" and
      // "cleared" are one state for every later reader — the same rule the
      // crew and shoot writers follow.
      phone: input.phone?.trim() || null,
      role: input.role.trim(),
      social_handle: input.socialHandle?.trim() || null,
      telegram: input.telegram?.trim() || null,
      avatar_url: input.avatarUrl,
      avatar_emoji: input.avatarEmoji,
      avatar_tint: input.avatarTint,
    })
    // RLS restricts this to the caller's own row, but the filter is written
    // anyway: an UPDATE with no WHERE is one policy change away from being an
    // UPDATE of every row, and nothing about this call needs that reach.
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')

  return !error
}

/**
 * Upload a picked image and return its Storage path.
 *
 * `<user id>/<uuid>.<ext>` — the first segment is what the bucket policy keys
 * ownership off (migration 20260831120000).
 *
 * The previous avatar is left in the bucket. One column, so nothing points at it
 * any more; there is no DELETE grant anywhere in v1 and no story asks for
 * cleanup. Same call `uploadLocationAttachment` documents.
 */
export async function uploadAvatar(
  asset: ImagePicker.ImagePickerAsset
): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return null

  const mimeType = asset.mimeType?.toLowerCase() ?? ''
  const extension = EXTENSION_BY_TYPE[mimeType]
  if (!extension) return null

  let body: ArrayBuffer
  try {
    const response = await fetch(asset.uri)
    body = await response.arrayBuffer()
  } catch {
    return null
  }

  const path = `${userId}/${Crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: mimeType,
  })
  return error ? null : path
}

/** Images only — an avatar is not a video, unlike a location attachment. */
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/** The bucket is private, so display always goes through a signed URL. */
export async function signedAvatarUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  return error || !data ? null : data.signedUrl
}

/**
 * Change the password of the signed-in user.
 *
 * **The current password is not asked for**, because Supabase does not verify
 * one: `updateUser` authenticates by the session alone. A field that collected
 * it and could not check it would be theatre. The protection is that a session
 * is required at all.
 */
export type PasswordChangeResult = 'ok' | 'wrong-current' | 'failed'

/**
 * Change the password, verifying the current one first.
 *
 * **The current password is checked, and the screen that used to say it could
 * not be is what changed.** `app/(app)/password.tsx` carried a note that
 * "Supabase's `updateUser` authenticates by the session alone and offers no way
 * to verify one, so a field collecting it could not check it — it would be
 * theatre." The first half is true and the conclusion was wrong: `updateUser`
 * cannot verify a password, but `signInWithPassword` can, and re-authenticating
 * with the address already on the session is exactly what that is for.
 * `Edit Profile.dc.html` draws the field and an error for it, so it is checked.
 *
 * What the re-auth costs, stated once:
 *
 * - **A new session replaces the current one.** Same user, same device, so
 *   nothing visible happens — but it is a real sign-in, and any listener on
 *   `onAuthStateChange` sees it.
 * - **Wrong attempts count against Supabase's sign-in rate limit**, which is
 *   the same limit `tooManyAttempts` covers on the login screen. Somebody
 *   guessing at their own current password can lock themselves out of retrying
 *   for a few minutes. That is the behaviour of the mechanism rather than a
 *   choice made here, and it is the correct direction for a security control.
 *
 * `secure_password_change` is **off** in config.toml. With it on, Supabase
 * would demand a recent session or a nonce for `updateUser` and this re-auth
 * would incidentally satisfy it — worth knowing before anyone turns it on,
 * because it would then be load-bearing rather than a verification step.
 *
 * Three outcomes rather than a boolean: the screen shows «Невірний поточний
 * пароль» under one field for the first and a general failure for the second,
 * and could not tell them apart from `false`.
 */
export async function changePassword(
  current: string,
  next: string
): Promise<PasswordChangeResult> {
  const email = (await supabase.auth.getUser()).data.user?.email
  // No session, no email, nothing to re-authenticate against. Treated as a
  // plain failure: the screen is unreachable without a session, so this is a
  // guard rather than a state anyone can produce.
  if (!email) return 'failed'

  const { error: reauth } = await supabase.auth.signInWithPassword({
    email,
    password: current,
  })
  if (reauth) return 'wrong-current'

  const { error } = await supabase.auth.updateUser({ password: next })
  return error ? 'failed' : 'ok'
}

/**
 * End the session.
 *
 * Here rather than inside a component, so the profile screen can draw logout the
 * way `Edit Profile.dc.html` does — a destructive text row among the other
 * account actions — instead of the filled `LogoutButton` that used to own both
 * the look and the call. That component had no other caller and is gone.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  // US-041 — the next person to sign in on this phone gets none of these.
  await clearReminders()
}

/**
 * Delete the account, and everything it owns.
 *
 * **Irreversible, and the widest-reaching call in the product.** `auth.users`
 * cascades to `public.users`, which cascades to every shoot, and each shoot to
 * its references, crew members and access links. Every link the photographer
 * ever shared stops working.
 *
 * It takes no id: the function deletes `auth.uid()` and nothing else, so there
 * is no argument to get wrong (migration 20260831120000).
 */
export async function deleteOwnAccount(): Promise<boolean> {
  const { error } = await supabase.rpc('delete_own_account')
  if (error) return false
  // The session now points at a row that no longer exists; sign out so nothing
  // retries with it.
  await supabase.auth.signOut()
  await clearReminders()
  return true
}
